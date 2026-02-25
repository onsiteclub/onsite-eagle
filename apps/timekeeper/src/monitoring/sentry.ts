/**
 * Sentry — Crash reporting (MANDATORY).
 *
 * Initialize on app boot BEFORE anything else.
 * Also registers as a logger sink so all structured logs become Sentry breadcrumbs.
 *
 * Spec: 09-MONITORING.md "Sentry"
 */
import * as Sentry from '@sentry/react-native';
import { logger } from '@onsite/logger';
import type { LogEntry } from '@onsite/logger';

/**
 * Initialize Sentry crash reporting.
 * Must be called in _layout.tsx before any other initialization.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (__DEV__) {
      console.warn('[Sentry] No DSN configured — crash reporting disabled');
    }
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    debug: __DEV__,
  });

  // Register Sentry as a logger sink — every log entry becomes a breadcrumb
  logger.addSink(sentrySink);
}

/**
 * Logger sink that forwards entries as Sentry breadcrumbs.
 */
function sentrySink(entry: LogEntry): void {
  const level = entry.level === 'error'
    ? 'error'
    : entry.level === 'warn'
      ? 'warning'
      : 'info';

  Sentry.addBreadcrumb({
    category: entry.tag.toLowerCase(),
    message: entry.message,
    level,
    data: entry.data as Record<string, string>,
  });
}

/**
 * Capture an exception with module/action tags.
 */
export function captureException(error: unknown, tags?: Record<string, string>): void {
  Sentry.captureException(error, { tags });
}

/**
 * Set user context for Sentry (call after auth).
 */
export function setSentryUser(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email });
}

/**
 * Clear user context on logout.
 */
export function clearSentryUser(): void {
  Sentry.setUser(null);
}

declare const __DEV__: boolean;
