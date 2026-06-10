import { getValidGoogleAccessToken, googleCalendarRequest } from '@/pages/api/workspace/[workspaceSlug]/integrations/google_calendar';
import prisma from '@/prisma/index';
import { log } from '@/lib/server/logger';

const toDate = (value) => {
  const d = value ? new Date(String(value)) : null;
  return d && Number.isFinite(d.getTime()) ? d : null;
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

export const checkAvailability = async (workspaceId, dateIso) => {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: 'GOOGLE_CALENDAR' },
    select: { id: true, enabled: true, credentials: true },
  });
  
  if (!integration?.enabled) throw new Error('Google Calendar integration disabled');
  
  const creds = integration?.credentials && typeof integration.credentials === 'object' ? integration.credentials : {};
  if (!creds?.refreshToken && !creds?.accessToken) throw new Error('Google Calendar not connected');
  
  const calendarId = String(creds?.calendarId || '').trim();
  if (!calendarId) throw new Error('Missing calendarId in config');
  
  const durationMinutes = Number(creds?.durationMinutes || 30);
  const stepMinutes = 15;
  const maxSuggestions = 10;
  
  const now = new Date();
  const requestedStart = toDate(dateIso) || now;
  const minStart = new Date(now.getTime() + 5 * 60_000); // 5 mins buffer
  const startAt = requestedStart < minStart ? minStart : requestedStart;
  
  // Look 2 days ahead by default for slots
  const endAt = new Date(startAt.getTime() + 2 * 24 * 60 * 60_000);
  const tz = creds?.timezone ? String(creds.timezone) : null;
  
  const tok = await getValidGoogleAccessToken({ workspaceId });
  const accessToken = tok?.accessToken ? String(tok.accessToken) : null;
  if (!accessToken) throw new Error('Missing Google access token');

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
  
  return {
    timezone: tz,
    durationMinutes,
    availableSlots: suggestions.map(s => s.start),
  };
};

export const createEvent = async (workspaceId, { title, description, startIso, endIso, emails }) => {
  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: 'GOOGLE_CALENDAR' },
    select: { id: true, enabled: true, credentials: true },
  });
  
  if (!integration?.enabled) throw new Error('Google Calendar integration disabled');
  
  const creds = integration?.credentials && typeof integration.credentials === 'object' ? integration.credentials : {};
  if (!creds?.refreshToken && !creds?.accessToken) throw new Error('Google Calendar not connected');
  
  const calendarId = String(creds?.calendarId || '').trim();
  if (!calendarId) throw new Error('Missing calendarId in config');

  const tz = creds?.timezone ? String(creds.timezone) : 'America/Sao_Paulo';

  const tok = await getValidGoogleAccessToken({ workspaceId });
  const accessToken = tok?.accessToken ? String(tok.accessToken) : null;
  if (!accessToken) throw new Error('Missing Google access token');

  const body = {
    summary: title || 'Meeting',
    description: description || '',
    start: { dateTime: startIso, timeZone: tz },
    end: { dateTime: endIso, timeZone: tz },
  };

  if (Array.isArray(emails) && emails.length > 0) {
    body.attendees = emails.map(email => ({ email }));
  }

  const created = await googleCalendarRequest({
    accessToken,
    path: `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    method: 'POST',
    body,
  });

  return created;
};
