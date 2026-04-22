import * as Sentry from '@sentry/nextjs';
import prisma from '@/prisma/index';

const hasSentryDsn = () => Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

const SENSITIVE_KEY_RE = /(pass(word)?|secret|token|api[-_]?key|authorization|cookie|set-cookie)/i;

const serializeError = (err) => {
  if (!err) return null;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: String(err) };
};

const sanitizeString = (value) => {
  const str = String(value);
  if (/^\s*bearer\s+/i.test(str)) return 'Bearer [REDACTED]';
  return str;
};

const sanitizeValue = (value, keyHint = '', depth = 0) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Error) return serializeError(value);

  const keyStr = String(keyHint || '');
  if (keyStr && SENSITIVE_KEY_RE.test(keyStr)) return '[REDACTED]';

  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (depth >= 5) return '[Truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => sanitizeValue(v, keyHint, depth + 1));
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = sanitizeValue(v, k, depth + 1);
    }
    return out;
  }

  return sanitizeString(value);
};

const normalizeMeta = (meta) => sanitizeValue(meta || {}, '', 0);

const persistError = async ({ level, msg, error, context }) => {
  try {
    const serialized = error ? serializeError(error) : null;
    await prisma.systemError.create({
      data: {
        level,
        message: serialized?.message || String(msg || 'Unknown Error'),
        stack: serialized?.stack || null,
        context: normalizeMeta(context || {}),
      },
    });
  } catch (err) {
    console.error('Failed to persist system error:', err);
  }
};

export const log = ({ level = 'info', msg, ...meta }) => {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: String(msg || ''),
    ...normalizeMeta(meta),
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
    // Persist to DB asynchronously
    persistError({ level, msg, context: meta });
    return;
  }
  console.log(line);
};

export const reportError = (error, context = {}) => {
  // Persist to DB
  persistError({ level: 'error', error, context });

  if (!hasSentryDsn()) return;
  try {
    const meta = normalizeMeta(context);
    Sentry.withScope((scope) => {
      if (meta?.requestId) scope.setTag('request_id', String(meta.requestId));
      if (meta?.route) scope.setTag('route', String(meta.route));
      if (meta?.workspaceId) scope.setTag('workspace_id', String(meta.workspaceId));
      if (meta?.userId) scope.setUser({ id: String(meta.userId) });
      scope.setExtras(meta || {});
      Sentry.captureException(error);
    });
  } catch {}
};
