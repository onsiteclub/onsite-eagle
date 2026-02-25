/**
 * @onsite/camera — Photo upload pipeline.
 *
 * Flow: base64/bytes → Storage bucket → DB record → timeline event
 *
 * Used by: Field (worker photos), Inspect (inspector photos),
 *          Operator (assignment photos), any future app.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PhotoMetadata } from '@onsite/shared';
import type {
  PhotoInput,
  PhotoContext,
  PhotoUploadResult,
  UploadConfig,
} from './types';
import { buildPhotoMetadata, isTrainingEligible } from './metadata';
import type { DeviceInfo, GPSData } from './types';

const DEFAULT_BUCKET = 'egl-media';
const DEFAULT_PHOTOS_TABLE = 'egl_photos';
const DEFAULT_TIMELINE_TABLE = 'egl_timeline';

/**
 * Convert a base64 string to Uint8Array.
 *
 * Required for Supabase Storage uploads in React Native,
 * which doesn't support Blob/File API.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build the storage path for a photo.
 *
 * Pattern: {siteId|'unsorted'}/{houseId}/{timestamp}_{random}.jpg
 */
function buildStoragePath(ctx: PhotoContext): string {
  const siteFolder = ctx.siteId ?? 'unsorted';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7);
  return `${siteFolder}/${ctx.houseId}/${timestamp}_${random}.jpg`;
}

/**
 * Upload a photo to Supabase Storage and create DB records.
 *
 * This is the main entry point for the photo pipeline.
 *
 * @param supabase - Authenticated Supabase client
 * @param photo - Image data (base64 or bytes)
 * @param context - House, phase, user context
 * @param options - Optional: device info, GPS, config overrides
 *
 * @example
 * ```ts
 * import { uploadPhoto } from '@onsite/camera';
 * import * as FileSystem from 'expo-file-system';
 *
 * const base64 = await FileSystem.readAsStringAsync(uri, {
 *   encoding: FileSystem.EncodingType.Base64,
 * });
 *
 * const result = await uploadPhoto(supabase, { base64 }, {
 *   houseId: house.id,
 *   phaseId: phase.id,
 *   uploadedBy: userId,
 *   siteId: site.id,
 *   photoType: 'progress',
 * });
 * ```
 */
export async function uploadPhoto(
  supabase: SupabaseClient,
  photo: PhotoInput,
  context: PhotoContext,
  options?: {
    device?: DeviceInfo;
    gps?: GPSData;
    config?: UploadConfig;
  },
): Promise<PhotoUploadResult> {
  const config = options?.config ?? {};
  const bucket = config.bucket ?? DEFAULT_BUCKET;
  const photosTable = config.photosTable ?? DEFAULT_PHOTOS_TABLE;
  const timelineTable = config.timelineTable ?? DEFAULT_TIMELINE_TABLE;
  const photoType = context.photoType ?? 'progress';

  // 1. Resolve bytes
  const bytes = photo.bytes ?? base64ToBytes(photo.base64!);
  const contentType = photo.contentType ?? 'image/jpeg';

  // 2. Build storage path
  const storagePath = buildStoragePath(context);

  // 3. Upload to Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`[Camera] Storage upload failed: ${uploadError.message}`);
  }

  // 4. Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // 5. Build metadata
  const metadata = buildPhotoMetadata({
    device: options?.device,
    gps: options?.gps,
  });

  const trainingEligible = isTrainingEligible(metadata, photoType);

  // 6. Insert photo record
  const { data: photoRecord, error: photoError } = await supabase
    .from(photosTable)
    .insert({
      house_id: context.houseId,
      phase_id: context.phaseId,
      uploaded_by: context.uploadedBy,
      organization_id: context.organizationId ?? null,
      photo_url: publicUrl,
      photo_type: photoType,
      ai_validation_status: 'pending',
      metadata,
      schema_version: metadata.schema_version,
      is_training_eligible: trainingEligible,
    })
    .select('id')
    .single();

  if (photoError) {
    throw new Error(`[Camera] Photo record insert failed: ${photoError.message}`);
  }

  // 7. Create timeline event (unless skipped)
  let timelineEventId: string | undefined;

  if (!config.skipTimeline) {
    const { data: timelineRecord, error: timelineError } = await supabase
      .from(timelineTable)
      .insert({
        house_id: context.houseId,
        event_type: 'photo',
        title: `Photo uploaded — ${photoType}`,
        description: `Photo uploaded for phase validation`,
        source: 'worker_app',
        created_by: context.uploadedBy,
        metadata: {
          photo_id: photoRecord.id,
          photo_url: publicUrl,
          photo_type: photoType,
        },
      })
      .select('id')
      .single();

    if (!timelineError && timelineRecord) {
      timelineEventId = timelineRecord.id;
    }
  }

  return {
    photoId: photoRecord.id,
    publicUrl,
    storagePath,
    timelineEventId,
  };
}

/**
 * Read a file URI and upload it.
 *
 * Convenience wrapper that handles expo-file-system conversion.
 * Requires expo-file-system to be installed in the app.
 */
export async function uploadPhotoFromUri(
  supabase: SupabaseClient,
  uri: string,
  context: PhotoContext,
  options?: {
    device?: DeviceInfo;
    gps?: GPSData;
    config?: UploadConfig;
  },
): Promise<PhotoUploadResult> {
  // Dynamic import — expo-file-system is an optional peer dep
  let FileSystem: typeof import('expo-file-system');
  try {
    FileSystem = await import('expo-file-system');
  } catch {
    throw new Error(
      '[Camera] expo-file-system is required for uploadPhotoFromUri. ' +
        'Install it or use uploadPhoto with base64/bytes directly.',
    );
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return uploadPhoto(supabase, { base64 }, context, options);
}
