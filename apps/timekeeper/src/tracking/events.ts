import type { TrackingEvent, TrackingSource } from '@onsite/shared';

/**
 * Normalize an SDK onGeofence event into a TrackingEvent.
 * NEVER replace event.timestamp with Date.now() — SDK timestamp is OS-level.
 */
export function normalizeSdkEvent(event: {
  action: string;
  identifier: string;
  timestamp: string;
  location?: {
    coords: { latitude: number; longitude: number; accuracy: number };
  };
}): TrackingEvent {
  const now = new Date().toISOString();
  return {
    type: event.action === 'ENTER' ? 'enter' : 'exit',
    fenceId: event.identifier,
    occurredAt: event.timestamp, // SDK OS-level timestamp
    receivedAt: now,
    source: 'sdk',
    confidence: 1.0,
    location: event.location ? {
      latitude: event.location.coords.latitude,
      longitude: event.location.coords.longitude,
      accuracy: event.location.coords.accuracy,
    } : undefined,
    delayMs: Date.now() - new Date(event.timestamp).getTime(),
  };
}

/**
 * Normalize a headless task event (same shape as SDK, different source).
 */
export function normalizeHeadlessEvent(params: {
  action: string;
  identifier: string;
  timestamp: string;
  location?: {
    coords: { latitude: number; longitude: number; accuracy: number };
  };
}): TrackingEvent {
  return {
    ...normalizeSdkEvent(params),
    source: 'headless',
  };
}

/**
 * Create a synthetic event from non-SDK sources (watchdog, gps_check, manual, voice).
 */
export function makeSyntheticEvent(
  type: 'enter' | 'exit',
  fenceId: string,
  source: Extract<TrackingSource, 'watchdog' | 'gps_check' | 'manual' | 'voice'>,
  confidence: number = 0.7,
): TrackingEvent {
  const now = new Date().toISOString();
  return {
    type,
    fenceId,
    occurredAt: now,
    receivedAt: now,
    source,
    confidence,
    delayMs: 0,
  };
}
