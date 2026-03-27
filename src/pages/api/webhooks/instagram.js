import prisma from '@/prisma/index';
import { processAutomation } from '@/prisma/services/automation';
import { log, reportError } from '@/lib/server/logger';
import { rateLimit } from '@/lib/server/rateLimit';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSystemConfig } from '@/lib/server/config';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;

  if (req.method === 'GET') {
    const rl = await rateLimit({ req, limit: 120, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'instagram_webhook_verify_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    // Webhook Verification (Meta standard)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const workspaceSlug = req.query['workspace'];

    if (mode && token) {
      if (mode === 'subscribe' && workspaceSlug) {
        const workspace = await prisma.workspace.findFirst({
          where: { slug: workspaceSlug },
          include: {
            integrations: {
              where: { provider: 'INSTAGRAM' },
            },
          },
        });

        const integration = workspace?.integrations[0];

        if (integration && integration.credentials?.verifyToken === token) {
          log({ level: 'info', msg: 'instagram_webhook_verified', requestId, workspaceSlug });
          return res.status(200).send(challenge);
        } else {
          log({ level: 'warn', msg: 'instagram_webhook_verify_failed', requestId, workspaceSlug });
          return res.status(403).json({ error: 'Verification failed' });
        }
      }
    }
    return res.status(400).json({ error: 'Missing parameters or invalid mode' });

  } else if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 1000, windowMs: 60_000 });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'instagram_webhook_rate_limited', requestId });
      return res.status(429).send('Too Many Requests');
    }

    const body = req.body;
    const workspaceSlug = req.query['workspace'];

    if (!workspaceSlug) {
      return res.status(400).json({ error: 'Missing workspace parameter' });
    }

    if (body.object === 'instagram') {
      try {
        for (const entry of body.entry) {
          if (entry.messaging) {
            for (const messagingItem of entry.messaging) {
              if (messagingItem.message && !messagingItem.message.is_echo) {
                const senderId = messagingItem.sender.id;
                const messageText = messagingItem.message.text || '';
                const mid = messagingItem.message.mid;
                const timestamp = messagingItem.timestamp;

                await processIncomingInstagramMessage(requestId, workspaceSlug, senderId, messageText, mid, timestamp);
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (e) {
        log({ level: 'error', msg: 'instagram_message_processing_failed', requestId, workspaceSlug, error: e });
        reportError(e, { route: '/api/webhooks/instagram', requestId, workspaceSlug });
        return res.status(500).json({ error: 'Internal error' });
      }
    }
    return res.status(404).send('NOT_SUPPORTED');
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const normalizeAvatarUrl = (value) => {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  return v;
};

const shouldRefreshProfile = (contact) => {
  const at = contact?.customFields?.avatarFetchedAt;
  if (!at) return true;
  const d = new Date(String(at));
  if (Number.isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() > 7 * 24 * 60 * 60 * 1000;
};

const isAllowedRemoteAvatarUrl = (value) => {
  try {
    const u = new URL(String(value || ''));
    if (u.protocol !== 'https:') return false;
    const host = String(u.hostname || '').toLowerCase();
    if (!host) return false;
    return (
      host.endsWith('.fbcdn.net') ||
      host.endsWith('.cdninstagram.com') ||
      host.endsWith('.fbsbx.com') ||
      host === 'fbcdn.net' ||
      host === 'cdninstagram.com' ||
      host === 'fbsbx.com'
    );
  } catch {
    return false;
  }
};

const contentTypeToExt = (contentType) => {
  const ct = String(contentType || '').trim().toLowerCase();
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  return null;
};

const downloadRemoteImage = async (url, maxBytes = 2_000_000) => {
  if (!isAllowedRemoteAvatarUrl(url)) {
    throw new Error('Unsupported remote avatar host');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(String(url), { method: 'GET', signal: controller.signal });
    const contentType = String(response.headers.get('content-type') || '').trim().toLowerCase();
    const contentLength = Number(response.headers.get('content-length') || 0);

    if (!response.ok) throw new Error('Remote avatar download failed');
    if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
      throw new Error('Unsupported remote avatar content type');
    }
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error('Remote avatar too large');
    }

    const ab = await response.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length > maxBytes) throw new Error('Remote avatar too large');

    return { buffer: buf, contentType };
  } finally {
    clearTimeout(timer);
  }
};

const getS3ClientForEnv = async () => {
  const [accessKeyId, secretAccessKey, region, bucket] = await Promise.all([
    getSystemConfig('AWS_S3_ACCESS_KEY_ID', process.env.AWS_S3_ACCESS_KEY_ID),
    getSystemConfig('AWS_S3_SECRET_ACCESS_KEY', process.env.AWS_S3_SECRET_ACCESS_KEY),
    getSystemConfig('AWS_S3_REGION', process.env.AWS_S3_REGION),
    getSystemConfig('AWS_S3_BUCKET_NAME', process.env.AWS_S3_BUCKET_NAME),
  ]);

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    return null;
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  return { client, region, bucket };
};

const encodeKeyForPath = (key) => String(key || '')
  .split('/')
  .map((s) => encodeURIComponent(s))
  .join('/');

async function fetchInstagramUserProfile(accessToken, senderId) {
  if (!accessToken || !senderId) return null;
  const url = new URL(`https://graph.facebook.com/v16.0/${encodeURIComponent(senderId)}`);
  url.searchParams.set('fields', 'id,name,username,profile_pic');
  url.searchParams.set('access_token', String(accessToken));

  const response = await fetch(url.toString(), { method: 'GET' });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const err = new Error(data?.error?.message || 'Instagram profile fetch failed');
    err.meta = data;
    throw err;
  }

  return {
    id: data?.id ? String(data.id) : null,
    name: data?.name ? String(data.name) : null,
    username: data?.username ? String(data.username) : null,
    profilePic: normalizeAvatarUrl(data?.profile_pic),
  };
}

async function processIncomingInstagramMessage(requestId, workspaceSlug, senderId, body, mid, timestamp) {
  // 1. Find Workspace
  const workspace = await prisma.workspace.findFirst({
    where: { slug: workspaceSlug },
  });

  if (!workspace) throw new Error('Workspace not found');

  const integration = await prisma.integration.findFirst({
    where: { workspaceId: workspace.id, provider: 'INSTAGRAM', enabled: true },
    select: { id: true, credentials: true },
  });

  // 2. Find or Create Contact
  let contact = await prisma.contact.findFirst({
    where: {
      workspaceId: workspace.id,
      customFields: { path: ['instagramId'], equals: senderId }
    }
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: `Instagram User ${senderId.substring(0, 6)}`,
        customFields: { instagramId: senderId }
      }
    });
  }

  const accessToken = integration?.credentials?.accessToken;
  if (accessToken && shouldRefreshProfile(contact)) {
    try {
      const profile = await fetchInstagramUserProfile(accessToken, senderId);
      if (profile) {
        let storedAvatarKey = null;
        let storedAvatarUrl = null;

        if (profile.profilePic) {
          const s3 = await getS3ClientForEnv();
          if (s3) {
            const dl = await downloadRemoteImage(profile.profilePic);
            const ext = contentTypeToExt(dl.contentType);
            if (ext) {
              const key = `workspaces/${workspace.id}/avatars/instagram/${senderId}-${Date.now()}.${ext}`;
              const cmd = new PutObjectCommand({
                Bucket: s3.bucket,
                Key: key,
                Body: dl.buffer,
                ContentType: dl.contentType,
                CacheControl: 'private, max-age=86400',
              });
              await s3.client.send(cmd);
              storedAvatarKey = key;
              storedAvatarUrl = `/api/workspace/${workspaceSlug}/upload/view/${encodeKeyForPath(key)}`;
            }
          }
        }

        const currentCustom = (contact.customFields && typeof contact.customFields === 'object') ? contact.customFields : {};
        const nextCustomFields = {
          ...currentCustom,
          instagramId: senderId,
          instagramUsername: profile.username || currentCustom.instagramUsername || null,
          instagramName: profile.name || currentCustom.instagramName || null,
          avatarUrl: storedAvatarUrl || currentCustom.avatarUrl || profile.profilePic || null,
          avatarKey: storedAvatarKey || currentCustom.avatarKey || null,
          avatarFetchedAt: new Date().toISOString(),
        };

        const isDefaultName = /^Instagram User\s+/i.test(String(contact.name || ''));
        const nextName = (isDefaultName ? (profile.name || profile.username) : null) || contact.name;

        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            name: nextName,
            customFields: nextCustomFields,
          },
        });
      }
    } catch (e) {
      log({ level: 'warn', msg: 'instagram_profile_fetch_failed', requestId, workspaceId: workspace.id, senderId, error: e });
      reportError(e, { route: '/api/webhooks/instagram:profile', requestId, workspaceId: workspace.id, senderId });
    }
  }

  // 3. Find or Create Conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: workspace.id,
      contactId: contact.id,
      platform: 'INSTAGRAM',
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        contactId: contact.id,
        platform: 'INSTAGRAM',
        externalId: senderId
      }
    });
  }

  // 4. Create Message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      type: 'TEXT',
      content: body,
      externalId: mid,
      status: 'RECEIVED',
    }
  });

  // 5. Update Conversation timestamp
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  // 6. Trigger Automation (if any)
  try {
    await processAutomation(workspace.id, 'INCOMING_MESSAGE', {
      contact,
      conversation,
      message
    });
  } catch (err) {
    // log error but don't fail the whole process
    console.error('Automation error:', err);
  }
}
