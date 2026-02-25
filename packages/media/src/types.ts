/**
 * @onsite/media — Types for photo/plan/document management.
 *
 * Handles:
 * - Photo upload from Timekeeper (worker) and Monitor (foreman web)
 * - Construction plan distribution (Monitor → Timekeeper)
 * - Document storage (per house/site)
 * - Prumo training metadata (photo quality, eligibility)
 *
 * Storage: Supabase Storage (buckets: egl-media, tmk-exports)
 * Metadata: egl_photos, egl_documents, egl_document_links
 */

// ─── Photo ──────────────────────────────────────────────────

export interface Photo {
  id: string;
  house_id: string;
  phase_id: string | null;
  uploaded_by: string;
  photo_url: string;
  thumbnail_url: string | null;
  photo_type: PhotoType;
  // AI validation
  ai_validation_status: AIValidationStatus;
  ai_validation_notes: string | null;
  ai_detected_items: Record<string, unknown> | null;
  ai_confidence: number | null;
  // Prumo training
  is_training_eligible: boolean;
  quality_score: number | null;
  metadata: PhotoMetadata | null;
  schema_version: number;
  created_at: string;
}

export type PhotoType = 'progress' | 'detail' | 'issue' | 'overview' | 'completion';
export type AIValidationStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export interface PhotoMetadata {
  device_model?: string;
  gps_accuracy?: number;
  latitude?: number;
  longitude?: number;
  compass_heading?: number;
  capture_conditions?: string;
}

// ─── Document ───────────────────────────────────────────────

export interface Document {
  id: string;
  site_id: string | null;
  house_id: string | null;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: DocumentCategory;
  uploaded_by: string | null;
  created_at: string;
}

export type DocumentCategory =
  | 'contracts' | 'plans' | 'licenses' | 'institutional' | 'reports'
  | 'plan' | 'blueprint' | 'document' | 'photo' | 'drawing' | 'attachment' | 'other';

// ─── Construction Plan ──────────────────────────────────────

/** A plan distributed to workers via Timekeeper. */
export interface ConstructionPlan {
  id: string;
  site_id: string;
  house_id: string | null;
  name: string;
  file_url: string;
  file_type: 'pdf' | 'png' | 'jpg';
  phase_id: string | null;
  distributed_at: string | null;
  distributed_to: string[]; // user IDs
  created_at: string;
}

// ─── Upload ─────────────────────────────────────────────────

export interface UploadOptions {
  bucket: string;
  /** Path template: {site_id}/{house_id}/{timestamp}_{random}_{filename} */
  site_id: string;
  house_id?: string;
  file_name: string;
  content_type: string;
}

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  type: string;
  size: number;
}

// ─── Storage Buckets ────────────────────────────────────────

export const BUCKETS = {
  EGL_MEDIA: 'egl-media',       // Photos, documents, plans (public)
  EGL_REPORTS: 'egl-reports',   // AI-generated reports (private)
  TMK_EXPORTS: 'tmk-exports',  // Hour exports CSV/PDF (private)
  CCL_AUDIO: 'ccl-audio',      // Voice recordings (private)
  SHP_PRODUCTS: 'shp-products', // Product images (public)
  CORE_AVATARS: 'core-avatars', // User avatars (public)
} as const;
