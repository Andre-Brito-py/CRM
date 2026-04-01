import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { getServerSession } from 'next-auth/next';
import prisma from '@/prisma/index';
import { decryptSecret } from '@/lib/server/config';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { msg: 'Method not allowed' } });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { code, state, error, error_reason, error_description } = req.query;
  const workspaceSlug = state;

  if (!workspaceSlug) {
    return res.status(400).send('Missing workspace parameter in state.');
  }

  // Se o usuário negou a permissão no FB
  if (error) {
    console.error('Meta OAuth Error:', error, error_reason, error_description);
    return res.redirect(`/account/${workspaceSlug}/ads?error=auth_denied`);
  }

  if (!code) {
    return res.status(400).send('Missing code parameter.');
  }

  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        slug: workspaceSlug,
        members: { some: { email: session.user.email, deletedAt: null } },
      },
      select: { id: true },
    });

    if (!workspace) return res.status(404).send('Workspace not found');

    const appUrlConfig = await prisma.systemConfig.findFirst({ where: { key: 'APP_URL' } });
    const appUrl = appUrlConfig?.value || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/workspace/${workspaceSlug}/ads/callback`;

    // Buscar credenciais do Super Admin
    const clientIdConfig = await prisma.systemConfig.findFirst({ where: { key: 'META_CLIENT_ID' } });
    const clientSecretConfig = await prisma.systemConfig.findFirst({ where: { key: 'META_CLIENT_SECRET' } });

    const clientId = clientIdConfig?.value;
    const encryptedClientSecret = clientSecretConfig?.value;

    if (!clientId || !encryptedClientSecret) {
      return res.status(500).send('Meta Client credentials missing in System Settings.');
    }

    const clientSecret = decryptSecret(encryptedClientSecret, 'META_CLIENT_SECRET');

    // Trocar Authorization Code pelo Short-lived Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Meta Token Exchange Error:', tokenData.error);
      return res.redirect(`/account/${workspaceSlug}/ads?error=auth_failed`);
    }

    const accessToken = tokenData.access_token;
    
    // Opcional: Aqui poderíamos trocar por um Long-lived token se necessário
    // await fetch(https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=${accessToken})

    // Salvar/Atualizar a integração no banco de dados do Workspace
    await prisma.integration.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: workspace.id,
          provider: 'META_ADS',
        },
      },
      update: {
        enabled: true,
        credentials: { accessToken },
      },
      create: {
        workspaceId: workspace.id,
        provider: 'META_ADS',
        name: 'Meta Ads Manager',
        enabled: true,
        credentials: { accessToken },
      },
    });

    return res.redirect(`/account/${workspaceSlug}/ads?success=true`);
  } catch (error) {
    console.error('Error in Meta OAuth callback:', error);
    return res.redirect(`/account/${workspaceSlug}/ads?error=internal_error`);
  }
}
