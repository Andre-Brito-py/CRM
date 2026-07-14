import { validateSession } from '@/config/api-validation';
import { getWorkspace } from '@/prisma/services/workspace';
import { log, reportError } from '@/lib/server/logger';
import { makeOauthState, getGoogleClientConfig, buildPublicUrl } from '../google_calendar';

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

  try {
    const { ok, clientId } = await getGoogleClientConfig();
    if (!ok) {
      return res.status(400).json({ error: { msg: 'Google OAuth is not configured' } });
    }

    const secret = process.env.NEXTAUTH_SECRET || '';
    if (!secret) return res.status(500).json({ error: { msg: 'Missing NEXTAUTH_SECRET' } });

    const redirectUri = buildPublicUrl(req, '/api/integrations/google/callback');
    const state = makeOauthState({
      secret,
      payload: { wsId: workspace.id, wsSlug: workspaceSlug, uId: userId, provider: 'GMAIL', ts: Date.now() },
    });

    const scopes = [
      'openid',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ].join(' ');

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('state', state);

    res.redirect(url.toString());
  } catch (error) {
    log({ level: 'error', msg: 'gmail_connect_failed', requestId, workspaceId: workspace?.id, userId, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/gmail/connect', requestId, workspaceId: workspace?.id, userId });
    res.status(500).json({ error: { msg: 'Failed to start Gmail OAuth connect' } });
  }
}
