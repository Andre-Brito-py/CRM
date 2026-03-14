import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSystemConfig } from '@/lib/server/config';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { getSubscriptionStatus } from '@/lib/server/subscription';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb',
    },
  },
};

const sanitizeFilename = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (raw.length > 180) return null;
  return raw.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const isAllowedContentType = (value) => {
  const ct = String(value || '').trim().toLowerCase();
  if (!ct) return false;
  if (ct === 'image/svg+xml') return false;
  if (ct.startsWith('image/')) return true;
  if (ct === 'application/pdf') return true;
  if (ct === 'text/csv') return true;
  if (ct === 'application/vnd.ms-excel') return true;
  if (ct === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true;
  if (ct === 'text/plain') return true;
  return false;
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  if (method === 'POST') {
    const userId = session.user.userId || session.user.id;
    const plan = await getSubscriptionStatus(workspace?.creator?.email || session.user.email);
    const perMinute =
      plan === 'FREE' ? 20 : plan === 'STANDARD' ? 60 : 240;
    const perDay =
      plan === 'FREE' ? 30 : plan === 'STANDARD' ? 500 : 5000;

    const [rlBurst, rlDaily] = await Promise.all([
      rateLimit({ req, limit: perMinute, windowMs: 60_000, key: `u:${userId}:upload:presigned:1m` }),
      rateLimit({ req, limit: perDay, windowMs: 24 * 60 * 60_000, key: `w:${workspace.id}:upload:presigned:day` }),
    ]);

    if (!rlBurst.ok) {
      log({ level: 'warn', msg: 'upload_presigned_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    if (!rlDaily.ok) {
      log({ level: 'warn', msg: 'upload_presigned_quota_exceeded', requestId, workspaceId: workspace.id, userId });
      return res.status(403).json({
        error: {
          msg: 'LIMIT_REACHED',
          details: 'Você atingiu a cota diária de uploads do seu plano. Faça um upgrade para continuar.',
        },
      });
    }

    try {
      const { filename, contentType } = req.body;
      const safeFilename = sanitizeFilename(filename);

      if (!safeFilename || !contentType) {
        return res.status(400).json({ error: { msg: 'Filename and content type are required.' } });
      }

      if (!isAllowedContentType(contentType)) {
        return res.status(400).json({ error: { msg: 'Unsupported content type.' } });
      }

      const [accessKeyId, secretAccessKey, region, bucket] = await Promise.all([
        getSystemConfig('AWS_S3_ACCESS_KEY_ID', process.env.AWS_S3_ACCESS_KEY_ID),
        getSystemConfig('AWS_S3_SECRET_ACCESS_KEY', process.env.AWS_S3_SECRET_ACCESS_KEY),
        getSystemConfig('AWS_S3_REGION', process.env.AWS_S3_REGION),
        getSystemConfig('AWS_S3_BUCKET_NAME', process.env.AWS_S3_BUCKET_NAME),
      ]);

      if (!accessKeyId || !secretAccessKey || !region || !bucket) {
        return res.status(500).json({ error: { msg: 'S3 cloud storage is not configured for this environment.' } });
      }

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      // Generate a unique file path for the workspace
      const key = `workspaces/${workspace.id}/${Date.now()}-${safeFilename}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        // Optional: ACL: 'public-read' depends on bucket configuration
      });

      // Get pre-signed URL valid for 5 minutes
      const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

      // Build the final public URL where the file can be accessed after upload
      // For S3 format: https://[bucket].s3.[region].amazonaws.com/[key]
      const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      res.status(200).json({ data: { url, fileUrl, key } });
    } catch (error) {
      log({ level: 'error', msg: 'upload_presigned_failed', requestId, workspaceId: workspace.id, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/upload/presigned-url', requestId, workspaceId: workspace.id });
      res.status(500).json({ error: { msg: 'Unable to generate upload URL' } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
