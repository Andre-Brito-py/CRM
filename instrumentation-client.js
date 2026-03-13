import * as Sentry from '@sentry/nextjs';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || '';
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 1.0,
    debug: false,
  });
}
