/**
 * Simple error tracking service for Kuroko.
 * Currently logs to console - fill in SENTRY_DSN in .env.local to enable.
 * 
 * Usage:
 *   import { captureError } from '@/lib/errorTracking';
 *   captureError(new Error('Something broke'), { context: 'user_action' });
 */
import { SENTRY_DSN } from '@/lib/config';

type ErrorContext = {
  context?: string;
  userId?: string;
  page?: string;
  [key: string]: any;
};

/**
 * Capture and track errors
 */
export function captureError(error: Error, context?: ErrorContext) {
  const errorData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
  };

  if (!SENTRY_DSN) {
    // Log to console in development
    console.error('[Error]', errorData);
    return;
  }

  // Sentry integration would go here
  // For now, this is a placeholder for when you add the actual SDK
  console.error('[Error] Sentry:', errorData);
}

/**
 * Wrap async functions with error tracking
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error as Error, { context });
      throw error;
    }
  }) as T;
}

/**
 * Track React component errors
 */
export function useErrorTracking(componentName: string) {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      captureError(event.error, { context: componentName });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [componentName]);
}

/**
 * Error tracking for API routes
 */
export function trackApiError(route: string, error: any) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
  captureError(new Error(errorMessage), { context: `api_${route}` });
}