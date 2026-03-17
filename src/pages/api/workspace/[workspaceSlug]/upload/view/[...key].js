import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSystemConfig } from '@/lib/server/config';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';

export const config = {
  api: {
    bodyParser: false,
  },
};

const decodeKeyFromPath = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const parts = segments.map((s) => decodeURIComponent(String(s || '')));
  const key = parts.join('/');
  if (!key) return null;
  if (key.includes('..')) return null;
  return key;
};

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, key: keySegments } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const session = await validateSession(req, res);

  if (!session) return;
  if (method !== 'GET') return res.status(405).json({ error: { msg: `${method} method unsupported` } });

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  const userId = session.user.userId || session.user.id;
  const rl = await rateLimit({ req, limit: 600, windowMs: 60_000, key: `u:${userId}:upload:view:1m` });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'upload_view_rate_limited', requestId, workspaceId: workspace.id, userId });
    return res.status(429).send('Too Many Requests');
  }

  const key = decodeKeyFromPath(keySegments);
  if (!key) return res.status(400).json({ error: { msg: 'Invalid key' } });

  const expectedPrefix = `workspaces/${workspace.id}/`;
  if (!key.startsWith(expectedPrefix)) return res.status(403).json({ error: { msg: 'Access denied' } });

  try {
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
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const obj = await s3Client.send(command);
    const body = obj?.Body;
    if (!body) return res.status(404).json({ error: { msg: 'Not found' } });

    const contentType = String(obj.ContentType || '').trim() || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (obj.ETag) res.setHeader('ETag', String(obj.ETag));

    body.pipe(res);
  } catch (error) {
    log({ level: 'error', msg: 'upload_view_failed', requestId, workspaceSlug, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/upload/view/[...key]', requestId, workspaceSlug });
    res.status(500).json({ error: { msg: 'Unable to fetch file' } });
  }
};

export default handler;
