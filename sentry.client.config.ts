import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Capture 100% of errors
    sampleRate: 1.0,
    // Don't send errors in development unless DSN is explicitly set
    enabled: process.env.NODE_ENV === 'production' || Boolean(dsn),
    // Ignore non-fatal aomi postState 404s
    ignoreErrors: [
      /postState/,
      /404.*aomi/,
    ],
  });
}
