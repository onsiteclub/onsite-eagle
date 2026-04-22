import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativePlatform, convertFileSrc } from './platform'
import { savePhotoFromCamera } from './filesystem'

export interface CapturedPhoto {
  /** Stable filesystem path (pass to readPhotoAsBlob later). */
  localPath: string
  /** URL loadable in <img src>. */
  displayUrl: string
  /** Unique identifier for this capture. */
  id: string
}

interface CaptureOptions {
  /** Prefix for the generated filename. Default: 'photo'. */
  prefix?: string
  /** JPEG quality 0-100. Default: 72. */
  quality?: number
  /** Max dimension in pixels. Default: 1280. */
  maxDimension?: number
  /** camera | photos | prompt. Default: prompt (shows native picker). */
  source?: 'camera' | 'photos' | 'prompt'
}

/**
 * Capture a photo using the native camera plugin and persist it
 * to the app's sandboxed filesystem.
 *
 * Native-only: throws if called on web.
 */
export async function capturePhoto(options: CaptureOptions = {}): Promise<CapturedPhoto> {
  if (!isNativePlatform()) {
    throw new Error('capturePhoto only works on native platforms')
  }

  const {
    prefix = 'photo',
    quality = 72,
    maxDimension = 1280,
    source = 'prompt',
  } = options

  const cameraSource =
    source === 'camera' ? CameraSource.Camera : source === 'photos' ? CameraSource.Photos : CameraSource.Prompt

  const photo = await Camera.getPhoto({
    quality,
    width: maxDimension,
    height: maxDimension,
    resultType: CameraResultType.Uri,
    source: cameraSource,
    saveToGallery: false,
    correctOrientation: true,
    presentationStyle: 'fullscreen',
  })

  if (!photo.path) {
    throw new Error('Camera returned no path')
  }

  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const filename = `${prefix}_${id}.jpg`

  const saved = await savePhotoFromCamera(photo.path, filename)

  return {
    id,
    localPath: saved.localPath,
    displayUrl: saved.displayUrl,
  }
}

/**
 * Capture a photo and return it as a base64 data URL.
 * Use this while the rest of the app still expects base64 strings
 * (Fase 1). Fase 2 migrates to filesystem-backed photos.
 */
export async function capturePhotoBase64(
  options: Omit<CaptureOptions, 'source'> & { source?: 'camera' | 'photos' | 'prompt' } = {},
): Promise<string> {
  if (!isNativePlatform()) {
    throw new Error('capturePhotoBase64 only works on native platforms')
  }

  const {
    quality = 72,
    maxDimension = 1280,
    source = 'prompt',
  } = options

  const cameraSource =
    source === 'camera' ? CameraSource.Camera : source === 'photos' ? CameraSource.Photos : CameraSource.Prompt

  const photo = await Camera.getPhoto({
    quality,
    width: maxDimension,
    height: maxDimension,
    resultType: CameraResultType.Base64,
    source: cameraSource,
    saveToGallery: false,
    correctOrientation: true,
    presentationStyle: 'fullscreen',
  })

  if (!photo.base64String) {
    throw new Error('Camera returned no data')
  }

  return `data:image/jpeg;base64,${photo.base64String}`
}

export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return true

  const current = await Camera.checkPermissions()
  if (current.camera === 'granted' && current.photos === 'granted') {
    return true
  }

  const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
  return result.camera === 'granted'
}

export { convertFileSrc }
