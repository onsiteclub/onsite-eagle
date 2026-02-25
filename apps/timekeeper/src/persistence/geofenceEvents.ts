import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import type { TrackingEvent } from '@onsite/shared';

/**
 * Log a geofence event to the geofence_events table (audit trail).
 */
export async function logGeofenceEvent(event: TrackingEvent): Promise<void> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) return;

  await db.runAsync(
    `INSERT INTO geofence_events (user_id, location_id, event_type, occurred_at, received_at, source, confidence, accuracy, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      event.fenceId,
      event.type === 'enter' ? 'entry' : 'exit',
      event.occurredAt,
      event.receivedAt,
      event.source,
      event.confidence,
      event.location?.accuracy ?? null,
      event.location?.latitude ?? null,
      event.location?.longitude ?? null,
    ],
  );
}

/**
 * Log a location audit entry (GPS proof for disputes).
 */
export async function logLocationAudit(
  event: TrackingEvent,
  sessionId: string | null,
  locationName: string | null,
): Promise<void> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId || !event.location) return;

  await db.runAsync(
    `INSERT INTO location_audit (id, user_id, session_id, event_type, location_id, location_name, latitude, longitude, accuracy, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateUUID(),
      userId,
      sessionId,
      event.type === 'enter' ? 'entry' : 'exit',
      event.fenceId,
      locationName,
      event.location.latitude,
      event.location.longitude,
      event.location.accuracy,
      event.occurredAt,
    ],
  );
}
