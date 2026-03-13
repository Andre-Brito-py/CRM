import { getSession } from 'next-auth/react';
import prisma from '@/prisma/index';
import os from 'os';

export default async function handler(req, res) {
  const session = await getSession({ req });

  if (!session) {
    res.status(401).json({ error: { msg: 'Unauthorized' } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { role: true },
  });

  if (!user || user.role !== 'SUPERADMIN') {
    res.status(403).json({ error: { msg: 'Forbidden' } });
    return;
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  const [
    webhookFailedLastHour,
    webhookPendingRetryDue,
    automationJobsDue,
    automationJobsFailedLastDay,
    automationJobsRunningStuck,
    paymentsOverdue,
  ] = await Promise.all([
    prisma.webhookDelivery.count({
      where: { status: 'FAILED', createdAt: { gte: hourAgo } },
    }),
    prisma.webhookDelivery.count({
      where: { status: 'PENDING', nextRetryAt: { lte: now } },
    }),
    prisma.automationJob.count({
      where: { status: 'PENDING', runAt: { lte: now } },
    }),
    prisma.automationJob.count({
      where: { status: 'FAILED', updatedAt: { gte: dayAgo } },
    }),
    prisma.automationJob.count({
      where: { status: 'RUNNING', updatedAt: { lt: tenMinutesAgo } },
    }),
    prisma.payment.count({
      where: { deletedAt: null, status: 'PENDING', dueDate: { lt: now } },
    }),
  ]);

  const start = Date.now();
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }
  const dbLatency = Date.now() - start;

  const thresholds = {
    dbLatencyMs: 500,
    webhookFailedLastHour: 50,
    webhookPendingRetryDue: 100,
    automationJobsDue: 200,
    automationJobsFailedLastDay: 50,
    automationJobsRunningStuck: 5,
    paymentsOverdue: 50,
  };

  const alerts = [];
  if (dbStatus !== 'connected') {
    alerts.push({ key: 'dbStatus', severity: 'critical', value: dbStatus });
  }
  if (dbLatency > thresholds.dbLatencyMs) {
    alerts.push({ key: 'dbLatency', severity: 'warning', value: dbLatency, threshold: thresholds.dbLatencyMs });
  }
  if (webhookFailedLastHour > thresholds.webhookFailedLastHour) {
    alerts.push({
      key: 'webhooks.failedLastHour',
      severity: 'warning',
      value: webhookFailedLastHour,
      threshold: thresholds.webhookFailedLastHour,
    });
  }
  if (webhookPendingRetryDue > thresholds.webhookPendingRetryDue) {
    alerts.push({
      key: 'webhooks.pendingRetryDue',
      severity: 'warning',
      value: webhookPendingRetryDue,
      threshold: thresholds.webhookPendingRetryDue,
    });
  }
  if (automationJobsDue > thresholds.automationJobsDue) {
    alerts.push({
      key: 'jobs.due',
      severity: 'warning',
      value: automationJobsDue,
      threshold: thresholds.automationJobsDue,
    });
  }
  if (automationJobsFailedLastDay > thresholds.automationJobsFailedLastDay) {
    alerts.push({
      key: 'jobs.failedLastDay',
      severity: 'warning',
      value: automationJobsFailedLastDay,
      threshold: thresholds.automationJobsFailedLastDay,
    });
  }
  if (automationJobsRunningStuck > thresholds.automationJobsRunningStuck) {
    alerts.push({
      key: 'jobs.runningStuck',
      severity: 'critical',
      value: automationJobsRunningStuck,
      threshold: thresholds.automationJobsRunningStuck,
    });
  }
  if (paymentsOverdue > thresholds.paymentsOverdue) {
    alerts.push({
      key: 'payments.overdue',
      severity: 'warning',
      value: paymentsOverdue,
      threshold: thresholds.paymentsOverdue,
    });
  }

  const status = alerts.some((a) => a.severity === 'critical')
    ? 'down'
    : alerts.length > 0
      ? 'degraded'
      : 'ok';

  const health = {
    status,
    alerts,
    thresholds,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: os.loadavg(),
    platform: process.platform,
    nodeVersion: process.version,
    dbStatus,
    dbLatency,
    metrics: {
      webhooks: {
        failedLastHour: webhookFailedLastHour,
        pendingRetryDue: webhookPendingRetryDue,
      },
      jobs: {
        due: automationJobsDue,
        failedLastDay: automationJobsFailedLastDay,
        runningStuck: automationJobsRunningStuck,
      },
      payments: {
        overdue: paymentsOverdue,
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.status(status === 'down' ? 503 : 200).json({ data: health });
}
