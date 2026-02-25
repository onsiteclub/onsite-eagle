import { getDb } from '../lib/database';
import type { GeofenceLocation } from '@onsite/shared';

/**
 * Get a geofence by ID (active, not deleted).
 */
export async function getFenceById(fenceId: string): Promise<GeofenceLocation | null> {
  const db = getDb();
  return db.getFirstAsync<GeofenceLocation>(
    `SELECT * FROM geofence_locations WHERE id = ? AND deleted_at IS NULL`,
    [fenceId],
  );
}

/**
 * Get all active geofences for a user.
 */
export async function getActiveFences(userId: string): Promise<GeofenceLocation[]> {
  const db = getDb();
  return db.getAllAsync<GeofenceLocation>(
    `SELECT * FROM geofence_locations
     WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL
     ORDER BY name ASC`,
    [userId],
  );
}
