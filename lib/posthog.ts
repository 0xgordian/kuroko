/**
 * PostHog browser analytics initializer.
 * Lazily initialized on first call — safe to import anywhere.
 * Only runs in the browser (typeof window check).
 */
import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(key: string): void {
  if (initialized || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: 'https://app.posthog.com',
    // We track page views manually via usePageTracking
    capture_pageview: false,
    persistence: 'localStorage',
    // Don't capture in development unless key is explicitly set
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.opt_out_capturing();
        ph.opt_in_capturing();
      }
    },
  });
  initialized = true;
}

export function capturePostHogEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  if (!initialized || typeof window === 'undefined') return;
  posthog.capture(event, properties);
}

export function identifyPostHogUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized || typeof window === 'undefined') return;
  posthog.identify(userId, traits);
}

export function resetPostHogUser(): void {
  if (!initialized || typeof window === 'undefined') return;
  posthog.reset();
}
