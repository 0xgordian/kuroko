import { useEffect, useRef } from 'react';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

type AnalyticsEvent = {
  event: string;
  properties?: Record<string, any>;
};

/**
 * Simple analytics service for Kuroko.
 * Currently a no-op - fill in POSTHOG_KEY in .env.local to enable.
 * 
 * Usage:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('page_view', { page: '/trade' });
 *   trackEvent('trade_executed', { market: 'Will BTC hit $100k', side: 'YES' });
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!POSTHOG_KEY) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event, properties);
    }
    return;
  }

  // PostHog integration would go here
  // For now, this is a placeholder for when you add the actual SDK
  try {
    // Example PostHog call:
    // posthog.capture(event, properties);
    console.log('[Analytics] Event:', event, properties);
  } catch (error) {
    console.error('[Analytics] Error:', error);
  }
}

/**
 * Track page views automatically
 */
export function usePageTracking(pathname: string) {
  const previousPathRef = useRef<string>(pathname);

  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      trackEvent('page_view', { path: pathname });
    }
  }, [pathname]);
}

/**
 * Track user actions
 */
export const Analytics = {
  pageView: (path: string) => trackEvent('page_view', { path }),
  buttonClick: (button: string, location?: string) => 
    trackEvent('button_click', { button, location }),
  tradeSubmit: (market: string, side: string, shares: number) => 
    trackEvent('trade_submit', { market, side, shares }),
  tradeExecute: (market: string, side: string, shares: number) => 
    trackEvent('trade_execute', { market, side, shares }),
  alertCreate: (market: string, condition: string) => 
    trackEvent('alert_create', { market, condition }),
  guardCreate: (market: string, type: 'stop_loss' | 'take_profit') => 
    trackEvent('guard_create', { market, type }),
  search: (query: string, results: number) => 
    trackEvent('search', { query, results }),
  modelSelect: (model: string) => 
    trackEvent('model_select', { model }),
  walletConnect: (method: string) => 
    trackEvent('wallet_connect', { method }),
  error: (error: string, stack?: string) => 
    trackEvent('error', { error, stack }),
};