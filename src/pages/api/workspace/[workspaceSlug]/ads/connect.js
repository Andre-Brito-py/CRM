import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await validateSession(req, res);
  if (!session) return;

  const { workspaceSlug } = req.query;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { email: session.user.email, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: { msg: 'Workspace not found' } });
    }

    // Check if the plan allows Meta Ads
    const { isModuleAllowed } = await import('@/lib/server/subscription');
    const isAllowed = await isModuleAllowed(workspace.id, 'meta_ads');
    if (!isAllowed) {
      return res.status(403).json({ 
        error: { 
          msg: 'Sua assinatura atual não inclui o módulo de Meta Ads Analytics. Faça o upgrade para liberar esta função.' 
        } 
      });
    }

    // Fetch the META_CLIENT_ID from the super admin settings (SystemConfig table)
    const clientConfig = await prisma.systemConfig.findFirst({
      where: { key: 'META_CLIENT_ID' }
    });

    const metaClientId = clientConfig?.value;

    if (!metaClientId) {
      return res.status(400).json({ error: { msg: 'Meta Client ID is not configured in Super Admin settings.' } });
    }

    const appConfig = await prisma.systemConfig.findFirst({
      where: { key: 'APP_URL' }
    });
    
    // Fallback to Vercel URL or localhost if APP_URL is not set
    const appUrl = appConfig?.value || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const redirectUri = `${appUrl}/api/workspace/${workspaceSlug}/ads/callback`;
    const state = encodeURIComponent(workspaceSlug); // Pass slug in state so callback knows where to redirect
    const scope = 'ads_read,read_insights,pages_show_list'; // Minimum permissions for the MVP

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

    // Normally this endpoint just returns the URL to the frontend, which will redirect.
    return res.status(200).json({ data: { url: authUrl } });
  } catch (error) {
    console.error('Error initiating Meta connect:', error);
    return res.status(500).json({ error: { msg: 'Internal server error' } });
  }
}
