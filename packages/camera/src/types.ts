/**
 * @onsite/camera — Types for the photo upload pipeline.
 *
 * Reuses PhotoMetadata, PhotoType, ValidationStatus from @onsite/shared.
 * Adds upload-specific types.
 */

import type {
  PhotoMetadata,
  PhotoType,
  ValidationStatus,
} from '@onsite/shared';

export type { PhotoMetadata, PhotoType, ValidationStatus };

/** Input for uploadPhoto — accepts base64 or raw bytes */
export interface PhotoInput {
  /** Base64-encoded image data (preferred for mobile via expo-file-system) */
  base64?: string;
  /** Raw bytes (alternative if base64 already converted) */
  bytes?: Uint8Array;
  /** MIME type. Defaults to 'image/jpeg' */
  contentType?: string;
}

/** Context required for photo upload */
export interface PhotoContext {
  houseId: string;
  phaseId: string;
  /** Current user ID (auth.uid). Required for uploaded_by and timeline. */
  uploadedBy: string;
  /** Organization ID for multi-tenancy */
  organizationId?: string;
  /** Categorize the photo. Defaults to 'progress' */
  photoType?: PhotoType;
  /** Site ID for storage path organization */
  siteId?: string;
}

/** Device + environment info for Prumo training metadata */
export interface DeviceInfo {
  model?: string;
  platform?: 'ios' | 'android';
  osVersion?: string;
  appVersion?: string;
}

/** GPS data captured at photo time */
export interface GPSData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
}

/** Result of a successful photo upload */
export interface PhotoUploadResult {
  /** UUID of the egl_photos record */
  photoId: string;
  /** Public URL of the uploaded photo */
  publicUrl: string;
  /** Storage path (bucket-relative) */
  storagePath: string;
  /** UUID of the timeline event created */
  timelineEventId?: string;
}

/** Configuration for the upload pipeline */
export interface UploadConfig {
  /** Storage bucket name. Defaults to 'egl-media' */
  bucket?: string;
  /** Table for photo records. Defaults to 'egl_photos' */
  photosTable?: string;
  /** Table for timeline events. Defaults to 'egl_timeline' */
  timelineTable?: string;
  /** Skip timeline event creation. Defaults to false */
  skipTimeline?: boolean;
}
