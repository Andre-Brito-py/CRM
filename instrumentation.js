export async function register() {
  const Sentry = await import('@sentry/nextjs');
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '';
  const isProd = process.env.NODE_ENV === 'production';
  if (!dsn || !isProd) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1, // Reduced from 1.0 to save CPU
    debug: false,
  });
}
