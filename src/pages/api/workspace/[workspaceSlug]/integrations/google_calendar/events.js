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

const cleanText = (value, maxLen) => {
  const s = String(value || '').trim();
  if (!s) return '';
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

const getConversationForWorkspace = async ({ conversationId, workspaceId }) => {
  if (!conversationId) return null;
  const conv = await prisma.conversation.findUnique({
    where: { id: String(conversationId) },
    select: {
      id: true,
      workspaceId: true,
      contactId: true,
      contact: { select: { id: true, name: true, email: true, phone: true } },
      platform: true,
    },
  });
  if (!conv) return null;
  if (conv.workspaceId !== workspaceId) return null;
  return conv;
};

const createMeetingActivity = async ({ workspaceId, userId, contactId, dealId, title, content, date }) => {
  if (!workspaceId || !userId) return null;
  if (!contactId && !dealId) return null;
  const t = cleanText(title, 140);
  if (!t) return null;

  return await prisma.activity.create({
    data: {
      workspaceId,
      userId,
      ...(contactId ? { contactId: String(contactId) } : {}),
      ...(dealId ? { dealId: String(dealId) } : {}),
      type: 'MEETING',
      title: t,
      content: content ? cleanText(content, 2000) : null,
      date: date ? new Date(date) : new Date(),
    },
    select: { id: true },
  });
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

  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: { msg: 'Method not supported' } });
  }

  const rl = await rateLimit({ req, limit: 30, windowMs: 10 * 60_000, key: `u:${userId}:google_calendar:events` });
  if (!rl.ok) {
    log({ level: 'warn', msg: 'google_calendar_events_rate_limited', requestId, workspaceId: workspace.id, userId });
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

    const tok = await getValidGoogleAccessToken({ workspaceId: workspace.id });
    const accessToken = tok?.accessToken ? String(tok.accessToken) : null;
    if (!accessToken) return res.status(400).json({ error: { msg: 'Missing access token' } });

    const calendarId = cleanText(req.body?.calendarId || creds?.calendarId, 200);
    if (!calendarId) return res.status(400).json({ error: { msg: 'Missing calendarId' } });

    const tz = creds?.timezone ? String(creds.timezone) : null;

    if (req.method === 'POST') {
      const startAt = toDate(req.body?.start);
      const endAt = toDate(req.body?.end);
      if (!startAt || !endAt || endAt <= startAt) return res.status(400).json({ error: { msg: 'Invalid start/end' } });

      const summary = cleanText(req.body?.summary || 'Reunião', 140);
      const description = cleanText(req.body?.description || '', 2000) || null;

      const conversationId = req.body?.conversationId ? String(req.body.conversationId) : null;
      const dealId = req.body?.dealId ? String(req.body.dealId) : null;
      const explicitContactId = req.body?.contactId ? String(req.body.contactId) : null;

      const conv = await getConversationForWorkspace({ conversationId, workspaceId: workspace.id });
      const contactId = explicitContactId || conv?.contactId || null;

      const created = await googleCalendarRequest({
        accessToken,
        path: `/calendars/${encodeURIComponent(calendarId)}/events`,
        method: 'POST',
        body: {
          summary,
          description: description || undefined,
          start: { dateTime: startAt.toISOString(), ...(tz ? { timeZone: tz } : {}) },
          end: { dateTime: endAt.toISOString(), ...(tz ? { timeZone: tz } : {}) },
        },
      });

      const eventId = created?.id ? String(created.id) : null;
      const htmlLink = created?.htmlLink ? String(created.htmlLink) : null;

      const activityTitle = `Agendamento: ${summary}`;
      const activityContent = htmlLink ? `Google Calendar: ${htmlLink}` : null;

      await createMeetingActivity({
        workspaceId: workspace.id,
        userId,
        contactId,
        dealId,
        title: activityTitle,
        content: activityContent,
        date: startAt,
      }).catch(() => null);

      return res.status(200).json({
        data: {
          calendarId,
          event: {
            id: eventId,
            htmlLink,
            summary,
            start: startAt.toISOString(),
            end: endAt.toISOString(),
          },
        },
      });
    }

    const eventId = req.query?.eventId ? String(req.query.eventId) : cleanText(req.body?.eventId, 200);
    if (!eventId) return res.status(400).json({ error: { msg: 'Missing eventId' } });

    if (req.method === 'PATCH') {
      const startAt = toDate(req.body?.start);
      const endAt = toDate(req.body?.end);
      if (!startAt || !endAt || endAt <= startAt) return res.status(400).json({ error: { msg: 'Invalid start/end' } });

      const updated = await googleCalendarRequest({
        accessToken,
        path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        method: 'PATCH',
        body: {
          start: { dateTime: startAt.toISOString(), ...(tz ? { timeZone: tz } : {}) },
          end: { dateTime: endAt.toISOString(), ...(tz ? { timeZone: tz } : {}) },
        },
      });

      return res.status(200).json({
        data: {
          calendarId,
          event: {
            id: updated?.id ? String(updated.id) : eventId,
            htmlLink: updated?.htmlLink ? String(updated.htmlLink) : null,
            summary: updated?.summary ? String(updated.summary) : null,
            start: startAt.toISOString(),
            end: endAt.toISOString(),
          },
        },
      });
    }

    await googleCalendarRequest({
      accessToken,
      path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      method: 'DELETE',
    });

    res.status(200).json({ data: { calendarId, deleted: true, eventId } });
  } catch (error) {
    log({ level: 'error', msg: 'google_calendar_events_failed', requestId, workspaceId: workspace.id, userId, error });
    reportError(error, { route: '/api/workspace/[workspaceSlug]/integrations/google_calendar/events', requestId, workspaceId: workspace.id, userId });
    res.status(500).json({ error: { msg: 'Calendar event operation failed' } });
  }
}
