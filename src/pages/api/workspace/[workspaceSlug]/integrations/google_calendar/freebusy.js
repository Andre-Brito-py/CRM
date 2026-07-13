import { validateSession } from '@/config/api-validation';

import prisma from '@/prisma/index';
import { getWorkspace } from '@/prisma/services/workspace';
import { rateLimit } from '@/lib/server/rateLimit';
import { log, reportError } from '@/lib/server/logger';
import { getValidGoogleAccessToken, googleCalendarRequest } from '../google_calendar';

const toDate = (value) => {
  const d = value ? new Date(String(value)) : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
};

const clampInt = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
};

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const suggestSlots = ({ startAt, endAt, durationMs, busy, stepMs, maxSuggestions }) => {
  const busyRanges = (Array.isArray(busy) ? busy : [])
    .map((b) => {
      const s = toDate(b?.start);
      const e = toDate(b?.end);
      if (!s || !e) return null;
      if (e <= s) return null;
      return { startMs: s.getTime(), endMs: e.getTime() };
    })
    .filter(Boolean)
    .sort((a, b) => a.startMs - b.startMs);

  const suggestions = [];
  const startMs = startAt.getTime();
  const endMs = endAt.getTime();

  for (let t = startMs; t + durationMs <= endMs; t += stepMs) {
    const slotStart = t;
    const slotEnd = t + durationMs;

    let conflict = false;
    for (let i = 0; i < busyRanges.length; i += 1) {
      const b = busyRanges[i];
      if (b.startMs >= slotEnd) break;
      if (overlaps(slotStart, slotEnd, b.startMs, b.endMs)) {
        conflict = true;
        break;
      }
    }
    if (conflict) continue;

    suggestions.push({
      start: new Date(slotStart).toISOString(),
      end: new Date(slotEnd).toISOString(),
    });
    if (suggestions.length >= maxSuggestions) break;
  }

  return suggestions;
};

export default async function handler(req, res) {
  const session = await validateSession(req, res);
  if (!session) {
    return;
  }

  const { workspaceSlug } = req.query;
  const requestId = String(req.headers['x-request-id'] || '').trim() || null;
  const userId = session.user.userId || session.user.id;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

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

  const rl = await rateLimit({ req, limit: 30, windowMs: 10 * 60_000, key: `u:${userId}:google_calendar:freebusy` });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'google_calendar_freebusy_rate_limited', requestId, workspaceId: workspace.id, userId });
    return res.status(429).json({ error: { msg: 'Too Many Requests' } });
  }

  try {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId: workspace.id, provider: 'GOOGLE_CALENDAR' },
      select: { id: true, enabled: true, credentials: true },
    });
    const creds = integration?.credentials && typeof integration.credentials === 'object' ? integration.credentials : {};
    if (!integration?.enabled) return res.status(400).json({ error: { msg: 'Integration disabled' } });
    if (!creds?.refreshToken && !creds?.accessToken) return res.status(400).json({ error: { msg: 'Not connected' } });

    const calendarId = String(req.body?.calendarId || creds?.calendarId || '').trim();
    if (!calendarId) return res.status(400).json({ error: { msg: 'Missing calendarId' } });

    const maxSuggestions = clampInt(req.body?.maxSuggestions, 1, 10, 5);
    const durationMinutes = clampInt(req.body?.durationMinutes ?? creds?.durationMinutes, 5, 240, 30);
    const windowDays = clampInt(req.body?.windowDays ?? creds?.windowDays, 1, 30, 7);
    const stepMinutes = clampInt(req.body?.stepMinutes, 5, 60, 15);

    const now = new Date();
    const start = toDate(req.body?.start) || now;
    const minStart = new Date(now.getTime() + 5 * 60_000);
    const startAt = start < minStart ? minStart : start;
    const endAt = toDate(req.body?.end) || new Date(startAt.getTime() + windowDays * 24 * 60 * 60_000);
    if (endAt <= startAt) return res.status(400).json({ error: { msg: 'Invalid window' } });

    const tz = creds?.timezone ? String(creds.timezone) : null;

    const tok = await getValidGoogleAccessToken({ workspaceId: workspace.id });
    const accessToken = tok?.accessToken ? String(tok.accessToken) : null;
    if (!accessToken) return res.status(400).json({ error: { msg: 'Missing access token' } });

    const freeBusy = await googleCalendarRequest({
      accessToken,
      path: '/freeBusy',
      method: 'POST',
      body: {
        timeMin: startAt.toISOString(),
        timeMax: endAt.toISOString(),
        items: [{ id: calendarId }],
        ...(tz ? { timeZone: tz } : {}),
      },
    });

    const busy = freeBusy?.calendars?.[calendarId]?.busy || [];
    const suggestions = suggestSlots({
      startAt,
      endAt,
      durationMs: durationMinutes * 60_000,
      busy,
      stepMs: stepMinutes * 60_000,
      maxSuggestions,
    });

    if (integration?.id) {
      const nextCreds = {
        ...creds,
        calendarId,
        ...(tz ? { timezone: tz } : {}),
        durationMinutes,
        windowDays,
      };
      await prisma.integration.update({
        where: { id: integration.id },
        data: { credentials: nextCreds },
      });
    }

    res.status(200).json({
      data: {
        calendarId,
        timezone: tz,
        window: { start: startAt.toISOString(), end: endAt.toISOString() },
        durationMinutes,
        maxSuggestions,
        busyCount: Array.isArray(busy) ? busy.length : 0,
        suggestions,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'google_calendar_freebusy_failed', requestId, workspaceId: workspace.id, userId, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/google_calendar/freebusy', requestId, workspaceId: workspace.id, userId });
    res.status(500).json({ error: { msg: 'Failed to check availability' } });
  }
}
