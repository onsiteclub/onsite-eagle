// @onsite/camera — Photo upload pipeline for construction apps

// Upload functions
export { uploadPhoto, uploadPhotoFromUri, base64ToBytes } from './upload';

// Metadata builder
export { buildPhotoMetadata, isTrainingEligible } from './metadata';

// Types
export type {
  PhotoInput,
  PhotoContext,
  PhotoUploadResult,
  UploadConfig,
  DeviceInfo,
  GPSData,
} from './types';

// Re-export shared photo types for convenience
export type { PhotoMetadata, PhotoType, ValidationStatus } from './types';
