import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  const integration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: 'EVOLUTION',
      },
    },
  });

  if (!integration) {
    return res.status(404).json({ error: { msg: 'Integration not found' } });
  }

  const evoUrl = await getSystemConfig('EVOLUTION_API_URL', process.env.EVOLUTION_API_URL);
  const evoApiKey = await getSystemConfig('EVOLUTION_API_KEY', process.env.EVOLUTION_API_KEY);

  if (!evoUrl || !evoApiKey) {
    return res.status(500).json({ error: { msg: 'Servidor de WhatsApp não configurado.' } });
  }

  const instanceName = `vysify-${workspace.id}`;

  try {
    const url = `${evoUrl}/instance/connectionState/${instanceName}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'apikey': evoApiKey },
    });

    if (!response.ok) {
      return res.status(200).json({
        data: {
          status: 'disconnected',
        },
      });
    }

    const data = await response.json();
    const isConnected = data?.instance?.state === 'open';

    // If connected, fetch the instance profile info to get the connected number
    let phoneNumber = null;
    if (isConnected) {
      phoneNumber = data?.instance?.user?.jid?.split('@')[0] || null;
      
      // Update integration state in DB
      await prisma.integration.update({
        where: {
          id: integration.id,
        },
        data: {
          credentials: {
            ...(integration.credentials || {}),
            connectedNumber: phoneNumber,
            status: 'open',
          },
        },
      });
    }

    return res.status(200).json({
      data: {
        status: isConnected ? 'open' : 'disconnected',
        phoneNumber,
        instance: data?.instance,
      },
    });
  } catch (error) {
    console.error('[evolution-status-error]', error);
    return res.status(500).json({ error: { msg: `Erro ao obter status da conexão: ${error.message}` } });
  }
}
