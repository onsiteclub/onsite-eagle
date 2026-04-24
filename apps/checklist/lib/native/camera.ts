import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isNativePlatform, convertFileSrc } from './platform'

interface CaptureOptions {
  /** JPEG quality 0-100. Default: 72. */
  quality?: number
  /** Max dimension in pixels. Default: 1280. */
  maxDimension?: number
  /** camera | photos | prompt. Default: prompt (shows native picker). */
  source?: 'camera' | 'photos' | 'prompt'
}

/**
 * Capture a photo and return it as a base64 data URL.
 * Used by PhotoCaptureLocal on native platforms; on web the component
 * uses a plain <input type="file">.
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
