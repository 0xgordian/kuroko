'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initPostHog, capturePostHogEvent } from '@/lib/posthog';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * PostHog provider — initializes PostHog and tracks page views on route changes.
 * Must be a client component inside a Suspense boundary (uses useSearchParams).
 */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    initPostHog(POSTHOG_KEY);
    // Track page view on every route change
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    capturePostHogEvent('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
