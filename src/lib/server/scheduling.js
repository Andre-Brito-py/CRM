import { getValidGoogleAccessToken, googleCalendarRequest } from '../../pages/api/workspace/[workspaceSlug]/integrations/google_calendar';
import prisma from '@/prisma/index';
import { log } from '@/lib/server/logger';
import { sendMail } from '@/lib/server/mail';

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

export const createEvent = async (workspaceId, { title, description, startIso, endIso, emails, contactId }) => {
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

  // Save to database
  await prisma.booking.create({
    data: {
      workspaceId,
      contactId: contactId || null,
      title: title || 'Meeting',
      description: description || '',
      startAt: new Date(startIso),
      endAt: new Date(endIso),
      providerEventId: created?.id || null,
    }
  });

  return created;
};

export const getUpcomingEvents = async (workspaceId, contactId) => {
  if (!contactId) return [];
  const events = await prisma.booking.findMany({
    where: {
      workspaceId,
      contactId,
      status: 'SCHEDULED',
      startAt: { gte: new Date() }
    },
    orderBy: { startAt: 'asc' },
    select: { id: true, title: true, startAt: true, endAt: true }
  });
  return events;
};

export const cancelEvent = async (workspaceId, bookingId) => {
  const booking = await prisma.booking.findUnique({ 
    where: { id: bookingId },
    include: {
      contact: true,
      workspace: {
        include: {
          creator: { select: { email: true } }
        }
      }
    }
  });
  if (!booking || booking.workspaceId !== workspaceId) throw new Error('Booking not found');

  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: 'GOOGLE_CALENDAR' },
    select: { enabled: true, credentials: true },
  });

  if (integration?.enabled && booking.providerEventId) {
    const creds = integration.credentials && typeof integration.credentials === 'object' ? integration.credentials : {};
    const calendarId = String(creds.calendarId || '').trim();
    const tok = await getValidGoogleAccessToken({ workspaceId }).catch(() => null);
    if (calendarId && tok?.accessToken) {
      await googleCalendarRequest({
        accessToken: tok.accessToken,
        path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(booking.providerEventId)}?sendUpdates=all`,
        method: 'DELETE',
      }).catch(err => {
        log({ level: 'warn', msg: 'google_calendar_delete_failed', error: err });
      });
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELED' }
  });

  // Notificar o dono do workspace e preparar aviso de reembolso
  const refundPolicyTime = booking.workspace?.refundPolicyTime || 'alguns dias úteis';
  
  if (booking.workspace?.creator?.email) {
    await sendMail({
      to: booking.workspace.creator.email,
      subject: `Cancelamento: ${booking.title}`,
      text: `O cliente ${booking.contact?.name || 'Desconhecido'} (${booking.contact?.phone || 'Sem telefone'}) cancelou o agendamento "${booking.title}" marcado para ${new Date(booking.startAt).toLocaleString('pt-BR')}. Caso seja necessário realizar estorno ou reembolso, por favor providencie no painel de pagamentos. O cliente será avisado que o prazo é de ${refundPolicyTime}.`,
      html: `
        <h2>Agendamento Cancelado</h2>
        <p>O cliente <strong>${booking.contact?.name || 'Desconhecido'}</strong> cancelou um agendamento.</p>
        <p><strong>Evento:</strong> ${booking.title}</p>
        <p><strong>Data:</strong> ${new Date(booking.startAt).toLocaleString('pt-BR')}</p>
        <p><strong>Telefone do Cliente:</strong> ${booking.contact?.phone || 'Não informado'}</p>
        <p><em>Caso este evento tenha exigido pagamento prévio, verifique a necessidade de realizar o estorno manual através do seu painel financeiro. O cliente foi informado que o reembolso será feito no prazo de ${refundPolicyTime}.</em></p>
      `
    }).catch(() => {});
  }

  return { success: true, refundPolicyTime };
};

export const rescheduleEvent = async (workspaceId, bookingId, startIso, endIso) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }});
  if (!booking || booking.workspaceId !== workspaceId) throw new Error('Booking not found');

  const integration = await prisma.integration.findFirst({
    where: { workspaceId, provider: 'GOOGLE_CALENDAR' },
    select: { enabled: true, credentials: true },
  });

  if (integration?.enabled && booking.providerEventId) {
    const creds = integration.credentials && typeof integration.credentials === 'object' ? integration.credentials : {};
    const calendarId = String(creds.calendarId || '').trim();
    const tz = creds.timezone ? String(creds.timezone) : 'America/Sao_Paulo';
    const tok = await getValidGoogleAccessToken({ workspaceId }).catch(() => null);
    if (calendarId && tok?.accessToken) {
      await googleCalendarRequest({
        accessToken: tok.accessToken,
        path: `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(booking.providerEventId)}?sendUpdates=all`,
        method: 'PATCH',
        body: {
          start: { dateTime: startIso, timeZone: tz },
          end: { dateTime: endIso, timeZone: tz }
        }
      }).catch(err => {
        log({ level: 'warn', msg: 'google_calendar_reschedule_failed', error: err });
      });
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { startAt: new Date(startIso), endAt: new Date(endIso) }
  });
  return { success: true };
};
