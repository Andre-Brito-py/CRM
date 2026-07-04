import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';
import { getSystemConfig } from '@/lib/server/config';

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
    // 1. Call Evolution API to logout and delete instance
    const deleteUrl = `${evoUrl}/instance/delete/${instanceName}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'apikey': evoApiKey },
    });

    if (!response.ok) {
      console.warn(`[evolution-disconnect-warn] Failed to delete instance ${instanceName} from Evolution API. Status: ${response.status}`);
    }

    // 2. Delete integration record in our DB
    await prisma.integration.delete({
      where: {
        id: integration.id,
      },
    });

    return res.status(200).json({
      data: {
        success: true,
      },
    });
  } catch (error) {
    console.error('[evolution-disconnect-error]', error);
    return res.status(500).json({ error: { msg: `Erro ao desconectar WhatsApp: ${error.message}` } });
  }
}
