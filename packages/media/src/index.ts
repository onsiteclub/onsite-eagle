// Types
export type {
  Photo,
  PhotoType,
  AIValidationStatus,
  PhotoMetadata,
  Document,
  DocumentCategory,
  ConstructionPlan,
  UploadOptions,
  UploadResult,
} from './types';

export { BUCKETS } from './types';

// Upload
export { buildStoragePath, uploadFile, base64ToBlob } from './upload';

// Data layer
export { fetchDocuments, fetchPlans, fetchLinkedPlans } from './data';
export type { FetchDocumentsOptions, FetchPlansOptions } from './data';
