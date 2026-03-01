/**
 * @onsite/media — Upload logic for Supabase Storage.
 *
 * Generates proper multi-tenant paths and handles upload.
 * Works on both web (File/Blob) and native (base64 → Blob).
 */

import type { UploadOptions, UploadResult } from './types';

/**
 * Build the storage path following multi-tenant convention:
 * {bucket}/{jobsite_id}/{lot_id?}/{timestamp}_{random}_{filename}
 */
export function buildStoragePath(options: UploadOptions): string {
  const { jobsite_id, lot_id, file_name } = options;
  const timestamp = Math.floor(Date.now() / 1000);
  const random = Math.random().toString(36).slice(2, 7);
  const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');

  const parts = [jobsite_id];
  if (lot_id) parts.push(lot_id);
  parts.push(`${timestamp}_${random}_${safeName}`);

  return parts.join('/');
}

/**
 * Upload a file to Supabase Storage.
 * Accepts File (web), Blob, or ArrayBuffer.
 */
export async function uploadFile(
  supabase: {
    storage: {
      from: (bucket: string) => {
        upload: (path: string, file: unknown, options?: { contentType?: string }) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
        getPublicUrl: (path: string) => { data: { publicUrl: string } };
      };
    };
  },
  options: UploadOptions,
  fileData: Blob | ArrayBuffer,
): Promise<{ data: UploadResult | null; error: string | null }> {
  const path = buildStoragePath(options);

  try {
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .upload(path, fileData, {
        contentType: options.content_type,
      });

    if (error || !data) return { data: null, error: error?.message ?? 'Upload returned no data' };

    const { data: urlData } = supabase.storage
      .from(options.bucket)
      .getPublicUrl(data.path);

    return {
      data: {
        url: urlData.publicUrl,
        path: data.path,
        name: options.file_name,
        type: options.content_type,
        size: fileData instanceof Blob ? fileData.size : (fileData as ArrayBuffer).byteLength,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * Convert base64 to Blob (for React Native uploads).
 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: BlobPart[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers) as BlobPart);
  }

  return new Blob(byteArrays, { type: contentType });
}
