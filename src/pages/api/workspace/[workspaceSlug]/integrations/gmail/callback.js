import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { log, reportError } from '@/lib/server/logger';
import { createAuditActivity } from '@/prisma/services/activity';
import {
  parseOauthState,
  getGoogleClientConfig,
  buildPublicUrl,
  fetchGoogleUserEmail,
} from '../google_calendar';

const exchangeCodeForTokens = async ({ code, redirectUri, clientId, clientSecret }) => {
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('code', code);
  body.set('redirect_uri', redirectUri);
  body.set('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error_description || json?.error || `Google token exchange failed (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
};

export default async function handler(req, res) {
  const session = await validateSession(req, res);
  if (!session) {
    return;
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const userId = session.user.userId || session.user.id;

  const errorParam = req.query?.error ? String(req.query.error) : null;
  const code = req.query?.code ? String(req.query.code) : null;
  const state = req.query?.state ? String(req.query.state) : null;

  const redirectToSettings = (qs) => {
    const base = buildPublicUrl(req, `/account/${encodeURIComponent(workspaceSlug)}/integrations/gmail`);
    const url = new URL(base);
    if (qs && typeof qs === 'object') {
      Object.entries(qs).forEach(([k, v]) => {
        if (v == null) return;
        url.searchParams.set(k, String(v));
      });
    }
    res.redirect(url.toString());
  };

  try {
    if (errorParam) return redirectToSettings({ error: errorParam });
    if (!code || !state) return redirectToSettings({ error: 'missing_code_or_state' });

    const secret = process.env.NEXTAUTH_SECRET || '';
    if (!secret) return res.status(500).json({ error: { msg: 'Missing NEXTAUTH_SECRET' } });

    const parsed = parseOauthState({ secret, state });
    if (!parsed) return redirectToSettings({ error: 'invalid_state' });
    if (String(parsed.wsSlug || '') !== String(workspaceSlug || '')) return redirectToSettings({ error: 'workspace_mismatch' });
    if (String(parsed.uId || '') !== String(userId || '')) return redirectToSettings({ error: 'user_mismatch' });

    const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);
    if (!workspace) return redirectToSettings({ error: 'workspace_not_found' });

    const isSuperAdmin = session.user.role === 'SUPERADMIN';
    const isMember = workspace.members.some((m) => m.email === session.user.email);
    if (!isSuperAdmin && !isMember) return redirectToSettings({ error: 'forbidden' });

    const { ok, clientId, clientSecret } = await getGoogleClientConfig();
    if (!ok) return redirectToSettings({ error: 'google_oauth_not_configured' });

    const redirectUri = buildPublicUrl(req, `/api/workspace/${encodeURIComponent(workspaceSlug)}/integrations/gmail/callback`);
    const token = await exchangeCodeForTokens({ code, redirectUri, clientId, clientSecret });

    const accessToken = token?.access_token ? String(token.access_token) : null;
    const refreshToken = token?.refresh_token ? String(token.refresh_token) : null;
    const tokenType = token?.token_type ? String(token.token_type) : null;
    const scope = token?.scope ? String(token.scope) : null;
    const expiresIn = Number(token?.expires_in || 0);
    const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Math.floor(Date.now() / 1000) + Math.floor(expiresIn) : null;

    if (!accessToken) return redirectToSettings({ error: 'missing_access_token' });

    const connectedEmail = await fetchGoogleUserEmail(accessToken).catch(() => null);

    const existing = await prisma.integration.findFirst({
      where: { workspaceId: workspace.id, provider: 'GMAIL' },
      select: { id: true, credentials: true },
    });
    const prevCreds = existing?.credentials && typeof existing.credentials === 'object' ? existing.credentials : {};
    const prevRefresh = prevCreds?.refreshToken ? String(prevCreds.refreshToken) : null;

    const finalRefreshToken = refreshToken || prevRefresh || null;

    const integration = await prisma.integration.upsert({
      where: existing?.id ? { id: existing.id } : { workspaceId_provider: { workspaceId: workspace.id, provider: 'GMAIL' } },
      update: {
        enabled: true,
        name: 'Gmail',
        credentials: {
          ...prevCreds,
          accessToken,
          ...(finalRefreshToken ? { refreshToken: finalRefreshToken } : {}),
          ...(expiresAt ? { expiresAt } : {}),
          ...(tokenType ? { tokenType } : {}),
          ...(scope ? { scope } : {}),
          ...(connectedEmail ? { connectedEmail } : {}),
          connectedAt: new Date().toISOString(),
        },
      },
      create: {
        workspaceId: workspace.id,
        provider: 'GMAIL',
        name: 'Gmail',
        enabled: true,
        credentials: {
          accessToken,
          ...(finalRefreshToken ? { refreshToken: finalRefreshToken } : {}),
          ...(expiresAt ? { expiresAt } : {}),
          ...(tokenType ? { tokenType } : {}),
          ...(scope ? { scope } : {}),
          ...(connectedEmail ? { connectedEmail } : {}),
          connectedAt: new Date().toISOString(),
        },
      },
    });

    await createAuditActivity(
      workspace.id,
      userId,
      {
        action: 'INTEGRATION_CONNECT_GMAIL',
        title: 'Gmail connected via OAuth',
        target: { integrationId: integration.id },
        metadata: { provider: 'GMAIL', connectedEmail: connectedEmail || null },
      },
      req
    );

    redirectToSettings({ connected: '1' });
  } catch (error) {
    log({ level: 'error', msg: 'gmail_callback_failed', requestId, workspaceId: null, userId, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/gmail/callback', requestId, workspaceId: null, userId });
    try {
      const msg = error?.message ? String(error.message).slice(0, 120) : 'unknown';
      const base = buildPublicUrl(req, `/account/${encodeURIComponent(workspaceSlug)}/integrations/gmail`);
      const url = new URL(base);
      url.searchParams.set('error', msg);
      res.redirect(url.toString());
    } catch {
      res.status(500).json({ error: { msg: 'Gmail callback failed' } });
    }
  }
}
