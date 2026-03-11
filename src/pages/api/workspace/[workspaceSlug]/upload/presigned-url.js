import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const session = await validateSession(req, res);

  if (!session) return;

  const workspace = await getWorkspace(null, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found or permission denied' } });
  }

  if (method === 'POST') {
    try {
      const { filename, contentType } = req.body;

      if (!filename || !contentType) {
        return res.status(400).json({ error: { msg: 'Filename and content type are required.' } });
      }

      // Check if S3 credentials exist in env
      const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;
      const region = process.env.AWS_S3_REGION;
      const bucket = process.env.AWS_S3_BUCKET_NAME;

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
      const key = `workspaces/${workspace.id}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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
      console.error('Failed to generate presigned URL', error);
      res.status(500).json({ error: { msg: 'Unable to generate upload URL' } });
    }
  } else {
    res.status(405).json({ error: { msg: `${method} method unsupported` } });
  }
};

export default handler;
