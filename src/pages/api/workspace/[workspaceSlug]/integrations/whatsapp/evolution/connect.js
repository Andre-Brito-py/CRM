import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';
import { canAddWhatsAppIntegration } from '@/lib/server/subscription';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: { msg: 'Unauthorized' } });
  }

  const { workspaceSlug } = req.query;
  const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

  if (!workspace) {
    return res.status(404).json({ error: { msg: 'Workspace not found' } });
  }

  // Check limits
  const currentCount = await prisma.integration.count({
    where: {
      workspaceId: workspace.id,
      provider: 'EVOLUTION',
    },
  });

  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';
  if (!isSuperAdmin && currentCount === 0) {
    const canAdd = await canAddWhatsAppIntegration(workspace.id, currentCount);
    if (!canAdd) {
      return res.status(403).json({ error: { msg: 'LIMIT_REACHED', details: 'Assine o plano Premium para conectar um número de WhatsApp.' } });
    }
  }

  // Load Evolution API config
  const evoUrl = await getSystemConfig('EVOLUTION_API_URL', process.env.EVOLUTION_API_URL);
  const evoApiKey = await getSystemConfig('EVOLUTION_API_KEY', process.env.EVOLUTION_API_KEY);

  if (!evoUrl || !evoApiKey) {
    return res.status(500).json({ error: { msg: 'Servidor de WhatsApp não configurado pelo administrador.' } });
  }

  const instanceName = `vysify-${workspace.id}`;
  const host = req.headers.host || 'vysify.com';
  const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
  const webhookUrl = `${protocol}://${host}/api/integrations/whatsapp/evolution/webhook`;

  try {
    let qrResponseData = null;
    let qrCodeBase64 = null;

    // 1. Try to check connection/QR-code for existing instance
    const connectUrl = `${evoUrl}/instance/connect/${instanceName}`;
    const connectResp = await fetch(connectUrl, {
      method: 'GET',
      headers: { 'apikey': evoApiKey },
    });

    if (connectResp.ok) {
      qrResponseData = await connectResp.json();
      qrCodeBase64 = qrResponseData?.base64 || null;
    } else {
      // 2. Instance probably exists but is disconnected/corrupted, or doesn't exist.
      // Let's delete it first to ensure a clean slate and avoid "instance already exists" 400 errors.
      const deleteUrl = `${evoUrl}/instance/delete/${instanceName}`;
      try {
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 'apikey': evoApiKey }
        });
      } catch (err) {
        console.warn('[Evolution] Failed to delete existing instance prior to creation:', err.message);
      }

      const createUrl = `${evoUrl}/instance/create`;
      const createResp = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'apikey': evoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
        }),
      });

      if (!createResp.ok) {
        const errData = await createResp.json().catch(() => ({}));
        throw new Error(errData?.message || `Failed to create instance in Evolution API. Status: ${createResp.status}`);
      }

      const createData = await createResp.json();
      qrCodeBase64 = createData?.qrcode?.base64 || null;

      // 3. Set Webhook for the newly created instance
      const webhookSetUrl = `${evoUrl}/webhook/set/${instanceName}`;
      await fetch(webhookSetUrl, {
        method: 'POST',
        headers: {
          'apikey': evoApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          events: [
            'SEND_MESSAGE',
            'MESSAGES_UPSERT',
            'CONNECTION_UPDATE',
          ],
        }),
      });
    }

    // 4. Create or update the integration record in our DB
    const integration = await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: 'EVOLUTION',
        },
      },
      update: {
        enabled: true,
        name: 'WhatsApp QR-Code',
        credentials: {
          instanceName,
          webhookUrl,
        },
      },
      create: {
        workspaceId: workspace.id,
        provider: 'EVOLUTION',
        name: 'WhatsApp QR-Code',
        enabled: true,
        credentials: {
          instanceName,
          webhookUrl,
        },
      },
    });

    return res.status(200).json({
      data: {
        integration,
        qrcode: qrCodeBase64,
        instanceName,
      },
    });
  } catch (error) {
    console.error('[evolution-connect-error] Error connecting to Evolution API:', error);
    return res.status(500).json({ error: { msg: `Erro ao conectar com servidor de WhatsApp: ${error.message}` } });
  }
}
