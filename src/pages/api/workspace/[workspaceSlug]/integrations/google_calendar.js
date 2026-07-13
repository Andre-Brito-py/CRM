import { validateSession } from '@/config/api-validation';
import crypto from 'crypto';

import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { createAuditActivity } from '@/prisma/services/activity';
import { getSystemConfig } from '@/lib/server/config';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '128kb',
    },
  },
};

export const buildPublicUrl = (req, path) => {
  const proto = `${req.headers['x-forwarded-proto'] || 'https'}`.split(',')[0].trim();
  const host = `${req.headers['x-forwarded-host'] || req.headers.host}`.split(',')[0].trim();
  return `${proto}://${host}${path}`;
};

const base64UrlEncode = (input) => {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  return Buffer.from(raw).toString('base64url');
};

const base64UrlDecodeJson = (input) => {
  try {
    const raw = Buffer.from(String(input || ''), 'base64url').toString('utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const makeOauthState = ({ secret, payload }) => {
  const p = base64UrlEncode(payload);
  const sig = crypto.createHmac('sha256', String(secret || '')).update(p).digest('base64url');
  return `${p}.${sig}`;
};

export const parseOauthState = ({ secret, state, maxAgeMs = 20 * 60_000 }) => {
  const raw = String(state || '');
  const [p, sig] = raw.split('.');
  if (!p || !sig) return null;
  const expected = crypto.createHmac('sha256', String(secret || '')).update(p).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  const payload = base64UrlDecodeJson(p);
  if (!payload) return null;
  const ts = Number(payload.ts || 0);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (Date.now() - ts > maxAgeMs) return null;
  return payload;
};

export const getGoogleClientConfig = async () => {
  const [clientId, clientSecret] = await Promise.all([
    getSystemConfig('GOOGLE_CLIENT_ID', process.env.GOOGLE_CLIENT_ID),
    getSystemConfig('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
  ]);
  const id = String(clientId || '').trim();
  const secret = String(clientSecret || '').trim();
  const ok = id.length > 0 && secret.length > 0;
  return { ok, clientId: id, clientSecret: secret };
};

export const getGoogleCalendarIntegration = async (workspaceId) => {
  return await prisma.integration.findFirst({
    where: { workspaceId, provider: 'GOOGLE_CALENDAR' },
    select: { id: true, enabled: true, credentials: true, updatedAt: true, createdAt: true },
  });
};

const normalizeCredentials = (value) => {
  const c = value && typeof value === 'object' ? value : {};
  return c;
};

export const isAccessTokenExpired = (credentials) => {
  const expiresAt = Number(credentials?.expiresAt || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= 60;
};

export const refreshGoogleAccessToken = async ({ integrationId, refreshToken, clientId, clientSecret }) => {
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'refresh_token');
  body.set('refresh_token', refreshToken);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error_description || json?.error || `Google token refresh failed (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }

  const accessToken = json?.access_token ? String(json.access_token) : null;
  const tokenType = json?.token_type ? String(json.token_type) : null;
  const scope = json?.scope ? String(json.scope) : null;
  const expiresIn = Number(json?.expires_in || 0);
  const expiresAt = Number.isFinite(expiresIn) && expiresIn > 0 ? Math.floor(Date.now() / 1000) + Math.floor(expiresIn) : null;

  if (!accessToken) {
    const err = new Error('Google token refresh returned no access token');
    err.statusCode = 500;
    err.details = json;
    throw err;
  }

  const current = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { credentials: true },
  });
  const currentCreds = normalizeCredentials(current?.credentials);

  const updated = await prisma.integration.update({
    where: { id: integrationId },
    data: {
      enabled: true,
      name: 'Google Calendar',
      credentials: {
        ...currentCreds,
        accessToken,
        ...(expiresAt ? { expiresAt } : {}),
        ...(tokenType ? { tokenType } : {}),
        ...(scope ? { scope } : {}),
      },
    },
    select: { id: true, credentials: true },
  });

  return normalizeCredentials(updated.credentials);
};

export const getValidGoogleAccessToken = async ({ workspaceId }) => {
  const { ok, clientId, clientSecret } = await getGoogleClientConfig();
  if (!ok) {
    const err = new Error('Google OAuth is not configured');
    err.statusCode = 500;
    throw err;
  }

  const integration = await getGoogleCalendarIntegration(workspaceId);
  if (!integration?.enabled) return { integration, accessToken: null, credentials: normalizeCredentials(integration?.credentials) };
  const credentials = normalizeCredentials(integration?.credentials);
  const accessToken = credentials?.accessToken ? String(credentials.accessToken) : null;
  const refreshToken = credentials?.refreshToken ? String(credentials.refreshToken) : null;

  if (!accessToken && !refreshToken) return { integration, accessToken: null, credentials };

  if (!isAccessTokenExpired(credentials)) return { integration, accessToken, credentials };
  if (!refreshToken || !integration?.id) return { integration, accessToken, credentials };

  const refreshed = await refreshGoogleAccessToken({
    integrationId: integration.id,
    refreshToken,
    clientId,
    clientSecret,
  });

  return { integration, accessToken: String(refreshed.accessToken || ''), credentials: refreshed };
};

export const googleCalendarRequest = async ({ accessToken, path, method = 'GET', body }) => {
  const url = `https://www.googleapis.com/calendar/v3${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message || `Google Calendar error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
};

export const fetchGoogleUserEmail = async (accessToken) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) return null;
  const email = json?.email ? String(json.email) : null;
  return email;
};

export const listGoogleCalendars = async (accessToken) => {
  const data = await googleCalendarRequest({
    accessToken,
    path: '/users/me/calendarList?minAccessRole=reader&showHidden=false&showDeleted=false',
  });
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map((c) => ({
    id: c?.id ? String(c.id) : '',
    summary: c?.summary ? String(c.summary) : '',
    primary: Boolean(c?.primary),
    timeZone: c?.timeZone ? String(c.timeZone) : null,
  })).filter((c) => c.id);
};

const revokeGoogleToken = async (token) => {
  if (!token) return false;
  const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(String(token))}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => null);
  return Boolean(res?.ok);
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

  const isMember = workspace.members.some((m) => m.email === session.user.email);
  if (!isMember) {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  if (req.method === 'GET') {
    try {
      const integration = await getGoogleCalendarIntegration(workspace.id);
      const enabled = Boolean(integration?.enabled);
      const credentials = normalizeCredentials(integration?.credentials);
      const connected = Boolean(credentials?.refreshToken || credentials?.accessToken);

      let calendars = [];
      if (enabled && connected) {
        const tok = await getValidGoogleAccessToken({ workspaceId: workspace.id });
        if (tok?.accessToken) {
          calendars = await listGoogleCalendars(tok.accessToken).catch(() => []);
        }
      }

      res.status(200).json({
        data: {
          enabled,
          connected,
          connectedEmail: credentials?.connectedEmail ? String(credentials.connectedEmail) : null,
          calendarId: credentials?.calendarId ? String(credentials.calendarId) : null,
          timezone: credentials?.timezone ? String(credentials.timezone) : null,
          durationMinutes: Number(credentials?.durationMinutes || 30),
          windowDays: Number(credentials?.windowDays || 7),
          scope: credentials?.scope ? String(credentials.scope) : null,
          expiresAt: Number(credentials?.expiresAt || 0) || null,
          calendars,
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'google_calendar_integration_get_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/google_calendar', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to fetch integration' } });
    }
    return;
  }

  if (req.method === 'POST') {
    const rl = await rateLimit({ req, limit: 10, windowMs: 10 * 60_000, key: `u:${userId}:google_calendar:integration:update` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'google_calendar_integration_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    const enabled = Boolean(req.body?.enabled);
    try {
      const current = await getGoogleCalendarIntegration(workspace.id);
      const currentCreds = normalizeCredentials(current?.credentials);

      if (!enabled) {
        const tokenToRevoke = currentCreds?.refreshToken || currentCreds?.accessToken || null;
        await revokeGoogleToken(tokenToRevoke).catch(() => false);
      }

      const integration = await prisma.integration.upsert({
        where: current?.id ? { id: current.id } : { workspaceId_provider: { workspaceId: workspace.id, provider: 'GOOGLE_CALENDAR' } },
        update: {
          enabled,
          name: 'Google Calendar',
          credentials: enabled ? currentCreds : {},
        },
        create: {
          workspaceId: workspace.id,
          provider: 'GOOGLE_CALENDAR',
          name: 'Google Calendar',
          enabled,
          credentials: enabled ? currentCreds : {},
        },
      });

      await createAuditActivity(
        workspace.id,
        userId,
        {
          action: 'INTEGRATION_UPDATE_GOOGLE_CALENDAR',
          title: 'Google Calendar integration updated',
          target: { integrationId: integration.id },
          metadata: { provider: 'GOOGLE_CALENDAR', enabled: integration.enabled },
        },
        req
      );

      res.status(200).json({
        data: {
          enabled: integration.enabled,
          connected: Boolean(integration?.credentials?.refreshToken || integration?.credentials?.accessToken),
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'google_calendar_integration_update_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/google_calendar', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to update integration' } });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const rl = await rateLimit({ req, limit: 15, windowMs: 10 * 60_000, key: `u:${userId}:google_calendar:integration:config` });
    if (!rl.ok) {
      log({ level: 'warn', msg: 'google_calendar_integration_config_rate_limited', requestId, workspaceId: workspace.id, userId });
      return res.status(429).json({ error: { msg: 'Too Many Requests' } });
    }

    try {
      const current = await getGoogleCalendarIntegration(workspace.id);
      const currentCreds = normalizeCredentials(current?.credentials);
      const calendarId = req.body?.calendarId != null ? String(req.body.calendarId || '').trim() : null;
      const timezone = req.body?.timezone != null ? String(req.body.timezone || '').trim() : null;
      const durationMinutes = req.body?.durationMinutes != null ? Number(req.body.durationMinutes || 0) : null;
      const windowDays = req.body?.windowDays != null ? Number(req.body.windowDays || 0) : null;

      const nextCreds = {
        ...currentCreds,
        ...(calendarId ? { calendarId } : {}),
        ...(timezone ? { timezone } : {}),
        ...(Number.isFinite(durationMinutes) && durationMinutes > 0 ? { durationMinutes: Math.floor(durationMinutes) } : {}),
        ...(Number.isFinite(windowDays) && windowDays > 0 ? { windowDays: Math.floor(windowDays) } : {}),
      };

      const integration = await prisma.integration.upsert({
        where: current?.id ? { id: current.id } : { workspaceId_provider: { workspaceId: workspace.id, provider: 'GOOGLE_CALENDAR' } },
        update: {
          enabled: true,
          name: 'Google Calendar',
          credentials: nextCreds,
        },
        create: {
          workspaceId: workspace.id,
          provider: 'GOOGLE_CALENDAR',
          name: 'Google Calendar',
          enabled: true,
          credentials: nextCreds,
        },
        select: { enabled: true, credentials: true },
      });

      res.status(200).json({
        data: {
          enabled: integration.enabled,
          calendarId: integration.credentials?.calendarId ? String(integration.credentials.calendarId) : null,
          timezone: integration.credentials?.timezone ? String(integration.credentials.timezone) : null,
          durationMinutes: Number(integration.credentials?.durationMinutes || 30),
          windowDays: Number(integration.credentials?.windowDays || 7),
        },
      });
    } catch (error) {
      log({ level: 'error', msg: 'google_calendar_integration_config_failed', requestId, workspaceId: workspace.id, userId, error });
      reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/google_calendar', requestId, workspaceId: workspace.id, userId });
      res.status(500).json({ error: { msg: 'Failed to update integration config' } });
    }
    return;
  }

  res.status(405).json({ error: { msg: 'Method not supported' } });
}
