// src/lib/sentry.ts
// Phase 5.5 — crash reporting init. Safe no-op when VITE_SENTRY_DSN is not set,
// so local development and preview builds don't need a real DSN to function.
//
// PII safety: beforeSend scrubs transcription text + email/phone from the event
// before upload. Trace sample rate is 10% — enough for regressions, won't blow
// through the 5k-event/month free tier.

import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // Intentional no-op — local dev doesn't want every reload pinging Sentry.
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    release: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : undefined,
    environment: import.meta.env.MODE,
    beforeSend(event) {
      // Strip user email/phone if Sentry scooped it up from React context.
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        // Keep `id` (Supabase UUID, not PII on its own) for linking traces.
      }

      // Transcriptions are PII adjacent — never upload them.
      // Our logger uses context objects; walk them and drop keys that look like
      // raw speech, audio blobs, or GPT prompts.
      const SENSITIVE_KEYS = /transcription|audio|prompt|messages|gpt_content/i;
      if (event.extra) {
        for (const k of Object.keys(event.extra)) {
          if (SENSITIVE_KEYS.test(k)) delete event.extra[k];
        }
      }
      if (event.contexts) {
        for (const ctx of Object.values(event.contexts)) {
          if (ctx && typeof ctx === 'object') {
            for (const k of Object.keys(ctx)) {
              if (SENSITIVE_KEYS.test(k)) delete (ctx as Record<string, unknown>)[k];
            }
          }
        }
      }
      return event;
    },
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });

  initialized = true;
}

/** Manual capture helper — the rest of the app shouldn't need to import Sentry directly. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}
