import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { log, reportError } from '@/lib/server/logger';
import { createAuditActivity } from '@/prisma/services/activity';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '128kb',
    },
  },
};

export default async function handler(req, res) {
  const session = await validateSession(req, res);
  if (!session) {
    return;
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const userId = session.user.userId || session.user.id;

  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
  if (!workspace) {
    res.status(404).json({ error: { msg: 'Workspace not found' } });
    return;
  }

  const isSuperAdmin = session.user.role === 'SUPERADMIN';
  const isMember = workspace.members.some((m) => m.email === session.user.email);
  if (!isSuperAdmin && !isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const integration = await prisma.integration.findUnique({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: 'GMAIL',
          },
        },
      });

      const enabled = integration?.enabled || false;
      const creds = integration?.credentials || {};
      const connected = enabled && (!!creds.accessToken || !!creds.appPassword);

      res.status(200).json({
        data: {
          enabled,
          connected,
          credentials: {
            connectedEmail: creds.connectedEmail || null,
            type: creds.type || (creds.accessToken ? 'oauth' : 'smtp'),
            appPassword: creds.appPassword ? '•••• •••• •••• ••••' : null,
          },
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'gmail_integration_get_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/gmail', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to fetch Gmail integration' } });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { enabled, credentials } = req.body;

      if (enabled === false) {
        // Disconnect
        const existingIntegration = await prisma.integration.findUnique({
          where: {
            workspaceId_provider: {
              workspaceId: workspace.id,
              provider: 'GMAIL',
            },
          },
        });

        const connectedEmail = existingIntegration?.credentials?.connectedEmail;

        await prisma.integration.deleteMany({
          where: {
            workspaceId: workspace.id,
            provider: 'GMAIL',
          },
        });

        if (connectedEmail) {
          await prisma.emailInbox.deleteMany({
            where: {
              workspaceId: workspace.id,
              email: connectedEmail.toLowerCase(),
            },
          });
        }

        await createAuditActivity(
          workspace.id,
          userId,
          {
            action: 'INTEGRATION_DISCONNECT_GMAIL',
            title: 'Gmail disconnected',
            target: { workspaceId: workspace.id },
            metadata: { provider: 'GMAIL', connectedEmail },
          },
          req
        );

        return res.status(200).json({
          data: {
            enabled: false,
            connected: false,
            credentials: {},
          },
        });
      }

      // Connect or update
      const { connectedEmail, appPassword, type } = credentials || {};

      if (!connectedEmail) {
        return res.status(400).json({ error: { msg: 'Missing connectedEmail' } });
      }

      const connectionType = type || 'smtp';
      let finalCreds = {
        type: connectionType,
        connectedEmail: connectedEmail.trim().toLowerCase(),
      };

      if (connectionType === 'smtp') {
        if (!appPassword) {
          return res.status(400).json({ error: { msg: 'Missing appPassword' } });
        }
        
        // If it's the masked value, retain the previous password
        let finalPassword = appPassword;
        if (appPassword.includes('••••')) {
          const existing = await prisma.integration.findUnique({
            where: {
              workspaceId_provider: {
                workspaceId: workspace.id,
                provider: 'GMAIL',
              },
            },
          });
          finalPassword = existing?.credentials?.appPassword || '';
        }

        if (!finalPassword) {
          return res.status(400).json({ error: { msg: 'App password is required' } });
        }

        finalCreds.appPassword = finalPassword;

        // Upsert standard SMTP EmailInbox for campaigns
        await prisma.emailInbox.upsert({
          where: {
            workspaceId_email: {
              workspaceId: workspace.id,
              email: finalCreds.connectedEmail,
            },
          },
          update: {
            provider: 'SMTP',
            credentials: {
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              user: finalCreds.connectedEmail,
              pass: finalPassword,
            },
            isActive: true,
          },
          create: {
            workspaceId: workspace.id,
            email: finalCreds.connectedEmail,
            provider: 'SMTP',
            credentials: {
              host: 'smtp.gmail.com',
              port: 465,
              secure: true,
              user: finalCreds.connectedEmail,
              pass: finalPassword,
            },
            isActive: true,
            dailyLimit: 100,
          },
        });
      }

      // Upsert Integration record
      const integration = await prisma.integration.upsert({
        where: {
          workspaceId_provider: {
            workspaceId: workspace.id,
            provider: 'GMAIL',
          },
        },
        update: {
          enabled: true,
          name: 'Gmail',
          credentials: finalCreds,
        },
        create: {
          workspaceId: workspace.id,
          provider: 'GMAIL',
          name: 'Gmail',
          enabled: true,
          credentials: finalCreds,
        },
      });

      await createAuditActivity(
        workspace.id,
        userId,
        {
          action: 'INTEGRATION_CONNECT_GMAIL',
          title: `Gmail connected via ${connectionType.toUpperCase()}`,
          target: { integrationId: integration.id },
          metadata: { provider: 'GMAIL', connectedEmail: finalCreds.connectedEmail, type: connectionType },
        },
        req
      );

      res.status(200).json({
        data: {
          enabled: true,
          connected: true,
          credentials: {
            connectedEmail: finalCreds.connectedEmail,
            type: connectionType,
            appPassword: finalCreds.appPassword ? '•••• •••• •••• ••••' : null,
          },
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'gmail_integration_post_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/gmail', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to update Gmail integration' } });
    }
    return;
  }

  res.status(405).json({ error: { msg: 'Method not supported' } });
}
