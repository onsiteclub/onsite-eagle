/**
 * Manage Fence — CRUD for geofence_locations + SDK registration.
 *
 * Minimum radius enforced: 150m (E011 fix — below 150m, native geofencing is unreliable).
 *
 * Spec: 06-USECASES.md "usecases/manageFence.ts"
 */
import { getDb } from '../lib/database';
import { generateUUID } from '@onsite/utils/uuid';
import { getUserId } from '@onsite/auth/core';
import { logger } from '@onsite/logger';
import { addSdkGeofence, removeSdkGeofence, syncGeofencesToSdk } from '../sdk/bgGeo';
import { getActiveFences } from '../persistence/geofences';
import { checkAfterFenceChange } from '../tracking/recovery';
import { enqueue } from '../tracking/effects';

const MIN_RADIUS = 150;

export interface CreateFenceInput {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  color?: string;
}

/**
 * Create a new geofence. Registers with SDK and triggers recovery check.
 */
export async function createFence(input: CreateFenceInput): Promise<string> {
  const db = getDb();
  const userId = await getUserId();
  if (!userId) throw new Error('No authenticated user');

  const radius = Math.max(input.radius || 200, MIN_RADIUS);
  const id = generateUUID();

  await db.runAsync(
    `INSERT INTO geofence_locations (id, user_id, name, address, latitude, longitude, radius, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, input.name, input.address ?? null, input.latitude, input.longitude, radius, input.color || '#FF6B35'],
  );

  // Register with SDK
  await addSdkGeofence(id, input.latitude, input.longitude, radius);

  // Check if worker is already inside this new fence
  checkAfterFenceChange(id, input.latitude, input.longitude, radius).catch(() => {});

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Fence created', { id, name: input.name, radius });
  return id;
}

/**
 * Update a geofence's properties. Re-registers with SDK if geometry changed.
 */
export async function updateFence(
  fenceId: string,
  changes: Partial<Pick<CreateFenceInput, 'name' | 'address' | 'latitude' | 'longitude' | 'radius' | 'color'>>,
): Promise<void> {
  const db = getDb();

  const fence = await db.getFirstAsync<{
    latitude: number; longitude: number; radius: number;
  }>(
    `SELECT latitude, longitude, radius FROM geofence_locations WHERE id = ? AND deleted_at IS NULL`,
    [fenceId],
  );
  if (!fence) throw new Error('Fence not found');

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (changes.name !== undefined) { setClauses.push('name = ?'); params.push(changes.name); }
  if (changes.address !== undefined) { setClauses.push('address = ?'); params.push(changes.address); }
  if (changes.latitude !== undefined) { setClauses.push('latitude = ?'); params.push(changes.latitude); }
  if (changes.longitude !== undefined) { setClauses.push('longitude = ?'); params.push(changes.longitude); }
  if (changes.radius !== undefined) { setClauses.push('radius = ?'); params.push(Math.max(changes.radius, MIN_RADIUS)); }
  if (changes.color !== undefined) { setClauses.push('color = ?'); params.push(changes.color); }

  if (setClauses.length === 0) return;

  setClauses.push("updated_at = datetime('now')");
  setClauses.push('synced_at = NULL');
  params.push(fenceId);

  await db.runAsync(
    `UPDATE geofence_locations SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );

  // If geometry changed, re-register with SDK
  const geometryChanged = changes.latitude !== undefined || changes.longitude !== undefined || changes.radius !== undefined;
  if (geometryChanged) {
    const lat = changes.latitude ?? fence.latitude;
    const lng = changes.longitude ?? fence.longitude;
    const rad = Math.max(changes.radius ?? fence.radius, MIN_RADIUS);

    await removeSdkGeofence(fenceId);
    await addSdkGeofence(fenceId, lat, lng, rad);

    // Recovery check for new geometry
    checkAfterFenceChange(fenceId, lat, lng, rad).catch(() => {});
  }

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Fence updated', { fenceId, changes: Object.keys(changes) });
}

/**
 * Soft-delete a geofence and remove from SDK.
 */
export async function deleteFence(fenceId: string): Promise<void> {
  const db = getDb();

  await db.runAsync(
    `UPDATE geofence_locations SET deleted_at = datetime('now'), synced_at = NULL WHERE id = ?`,
    [fenceId],
  );

  await removeSdkGeofence(fenceId);

  await enqueue('SYNC_NOW');
  await enqueue('UI_REFRESH');

  logger.info('USECASE', 'Fence deleted', { fenceId });
}

/**
 * Re-sync all fences to SDK (after app restart or bulk change).
 */
export async function resyncAllFences(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const fences = await getActiveFences(userId);
  await syncGeofencesToSdk(fences);

  logger.info('USECASE', 'All fences re-synced to SDK', { count: fences.length });
}
