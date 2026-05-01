import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sampleRate: 1.0,
    enabled: process.env.NODE_ENV === 'production' || Boolean(dsn),
  });
}
