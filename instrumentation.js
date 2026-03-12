export async function register() {
  const Sentry = await import('@sentry/nextjs');
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '';
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    debug: false,
  });
}
