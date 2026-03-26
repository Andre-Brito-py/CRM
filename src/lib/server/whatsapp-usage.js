/**
 * WhatsApp Usage Tracking & Limit Control
 *
 * Mirrors the AI usage control system to track and enforce
 * daily WhatsApp message limits defined in plan features.
 */

import prisma from '@/prisma/index';

/**
 * Get the plan features (limits) for a given workspace.
 * Returns null if the workspace has no active subscription.
 */
async function getWorkspacePlanFeatures(workspaceId) {
  const subscription = await prisma.platformSubscription.findUnique({
    where: { workspaceId },
    include: { plan: true },
  });
  if (!subscription?.plan) return null;
  const features = subscription.plan.features || {};
  return features;
}

/**
 * Count how many OUTBOUND WhatsApp messages were sent by this workspace
 * in the last 24 hours.
 */
async function getOutboundCountLast24h(workspaceId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.whatsAppUsageEvent.count({
    where: {
      workspaceId,
      direction: 'OUTBOUND',
      createdAt: { gte: since },
    },
  });
  return count;
}

/**
 * Check if the workspace is allowed to send a WhatsApp message.
 *
 * Returns an object with:
 *   - allowed: boolean
 *   - overageMode: boolean (true if limit exceeded but overage allowed)
 *   - currentCount: number of messages sent in the last 24h
 *   - limit: configured daily limit (null = unlimited)
 *   - error: string | null (set if sending should be hard-blocked)
 */
export async function checkWhatsAppLimit(workspaceId) {
  const features = await getWorkspacePlanFeatures(workspaceId);

  // If there's no plan or maxWhatsAppMessages24h is not set, allow freely.
  const limit = features?.maxWhatsAppMessages24h
    ? Number(features.maxWhatsAppMessages24h)
    : null;

  if (!limit || limit <= 0) {
    return { allowed: true, overageMode: false, currentCount: 0, limit: null, error: null };
  }

  const currentCount = await getOutboundCountLast24h(workspaceId);

  if (currentCount < limit) {
    return { allowed: true, overageMode: false, currentCount, limit, error: null };
  }

  // Limit exceeded — for now we hard-block. Future: allow overages with billing.
  return {
    allowed: false,
    overageMode: false,
    currentCount,
    limit,
    error: `Daily WhatsApp message limit reached (${currentCount}/${limit}). Limit resets every 24 hours.`,
  };
}

/**
 * Record a WhatsApp usage event after a message is sent or received.
 *
 * @param {object} options
 * @param {string} options.workspaceId
 * @param {string|null} options.userId
 * @param {string|null} options.messageId - wamid returned by Meta API
 * @param {'OUTBOUND'|'INBOUND'} options.direction
 * @param {boolean} options.overageMode
 */
export async function recordWhatsAppUsage({
  workspaceId,
  userId = null,
  messageId = null,
  direction = 'OUTBOUND',
  overageMode = false,
}) {
  try {
    await prisma.whatsAppUsageEvent.create({
      data: {
        workspaceId,
        userId,
        messageId,
        direction,
        overageMode,
        provider: 'whatsapp',
      },
    });
  } catch (err) {
    // Never fail the main flow due to usage tracking errors
    console.error('[whatsapp-usage] Failed to record usage event:', err);
  }
}

/**
 * Get usage stats for a workspace (consumed by admin panel or workspace dashboard).
 *
 * @param {string} workspaceId
 * @returns {{ total24h: number, totalOutbound24h: number, totalInbound24h: number, limit: number|null }}
 */
export async function getWhatsAppUsageStats(workspaceId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const features = await getWorkspacePlanFeatures(workspaceId);
  const limit = features?.maxWhatsAppMessages24h
    ? Number(features.maxWhatsAppMessages24h)
    : null;

  const [outbound, inbound] = await Promise.all([
    prisma.whatsAppUsageEvent.count({
      where: { workspaceId, direction: 'OUTBOUND', createdAt: { gte: since } },
    }),
    prisma.whatsAppUsageEvent.count({
      where: { workspaceId, direction: 'INBOUND', createdAt: { gte: since } },
    }),
  ]);

  return {
    total24h: outbound + inbound,
    totalOutbound24h: outbound,
    totalInbound24h: inbound,
    limit,
  };
}
