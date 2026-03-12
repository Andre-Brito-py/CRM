import * as Sentry from '@sentry/nextjs';

const hasSentryDsn = () => Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);

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

const normalizeMeta = (meta) => {
  const out = {};
  for (const [key, value] of Object.entries(meta || {})) {
    if (value === undefined) continue;
    if (value instanceof Error) {
      out[key] = serializeError(value);
      continue;
    }
    out[key] = value;
  }
  return out;
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
    return;
  }
  console.log(line);
};

export const reportError = (error, context = {}) => {
  if (!hasSentryDsn()) return;
  try {
    Sentry.captureException(error, { extra: normalizeMeta(context) });
  } catch {}
};

