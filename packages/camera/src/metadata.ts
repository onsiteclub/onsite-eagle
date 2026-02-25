/**
 * @onsite/camera — Metadata builder for Prumo training data.
 *
 * Enriches photos with device, GPS, and capture condition info.
 * Rich metadata = better training data for Prumo AI.
 */

import type { PhotoMetadata } from '@onsite/shared';
import type { DeviceInfo, GPSData } from './types';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * Build photo metadata from device and GPS context.
 *
 * Call this at capture time to snapshot the environment.
 */
export function buildPhotoMetadata(params: {
  device?: DeviceInfo;
  gps?: GPSData;
  captureConditions?: PhotoMetadata['capture_conditions'];
}): PhotoMetadata & { schema_version: number } {
  const { device, gps, captureConditions } = params;

  return {
    device_model: device?.model,
    device_platform: device?.platform,
    device_os_version: device?.osVersion,
    app_version: device?.appVersion,
    gps_latitude: gps?.latitude,
    gps_longitude: gps?.longitude,
    gps_accuracy: gps?.accuracy,
    altitude: gps?.altitude,
    compass_heading: gps?.heading,
    capture_conditions: captureConditions,
    capture_timestamp: new Date().toISOString(),
    schema_version: CURRENT_SCHEMA_VERSION,
  };
}

/**
 * Determine if a photo is eligible for Prumo AI training.
 *
 * Criteria:
 * - GPS accuracy < 50m (if available)
 * - Has device info
 * - Photo is not an 'issue' type (biased data)
 */
export function isTrainingEligible(
  metadata: PhotoMetadata,
  photoType: string,
): boolean {
  // Issue photos have selection bias — not ideal for general training
  if (photoType === 'issue') return false;

  // Low GPS accuracy means location unreliable
  if (metadata.gps_accuracy && metadata.gps_accuracy > 50) return false;

  // Must have at least device model for provenance
  if (!metadata.device_model) return false;

  return true;
}
