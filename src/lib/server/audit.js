import prisma from '@/prisma/index';
import { log } from './logger';

/**
 * Creates an audit log entry in the Activity table.
 * @param {string} workspaceId - The workspace where the event occurred.
 * @param {string} userId - The user who performed the action.
 * @param {Object} payload - Event details.
 * @param {string} payload.action - Short code for the action (e.g., 'DEAL_DELETED').
 * @param {string} payload.title - Human-readable description.
 * @param {string} [payload.target] - The ID of the affected resource.
 * @param {Object} [payload.metadata] - Additional context.
 * @param {Object} [req] - Optional request object to extract IP and UserAgent.
 */
export const createAuditLog = async (workspaceId, userId, { action, title, target, metadata }, req = null) => {
  const getRequestIp = (r) => {
    const forwardedFor = String(r?.headers?.['x-forwarded-for'] || '').trim();
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    const realIp = String(r?.headers?.['x-real-ip'] || '').trim();
    if (realIp) return realIp;
    return null;
  };

  const safeStringify = (value) => {
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  };

  const requestId = String(req?.headers?.['x-request-id'] || '').trim() || null;
  const userAgent = String(req?.headers?.['user-agent'] || '').trim() || null;
  const ip = req ? getRequestIp(req) : null;
  const route = String(req?.url || '').trim() || null;
  const method = String(req?.method || '').trim() || null;

  const content = safeStringify({
    action: String(action || '').trim() || null,
    target: target || null,
    metadata: metadata || null,
    request: {
      id: requestId,
      ip,
      userAgent,
      route,
      method,
    },
  });

  try {
    return await prisma.activity.create({
      data: {
        workspaceId,
        userId,
        type: `AUDIT_${String(action || 'EVENT').trim().toUpperCase()}`,
        title: title || String(action || 'audit_event'),
        content,
      },
    });
  } catch (error) {
    log({ level: 'error', msg: 'failed_to_create_audit_log', error, workspaceId, userId });
    return null;
  }
};
