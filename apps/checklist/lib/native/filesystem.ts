import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNativePlatform, convertFileSrc } from './platform'

const PHOTO_DIR = 'checklist-photos'

/**
 * Saves a captured photo to the device filesystem (native only).
 * `sourcePath` is the absolute URI returned by the camera plugin.
 * Returns the permanent local path (suitable for SQLite storage) and a
 * WebView-loadable URL for previewing.
 */
export interface SavedPhoto {
  /** Stable path to reference later (passed to readPhotoAsBlob). */
  localPath: string
  /** URL loadable in <img src> / WebView. */
  displayUrl: string
}

export async function savePhotoFromCamera(sourcePath: string, filename: string): Promise<SavedPhoto> {
  if (!isNativePlatform()) {
    throw new Error('savePhotoFromCamera only works on native platforms')
  }

  await ensurePhotoDir()

  const destPath = `${PHOTO_DIR}/${filename}`

  await Filesystem.copy({
    from: sourcePath,
    to: destPath,
    toDirectory: Directory.Data,
  })

  const { uri } = await Filesystem.getUri({
    path: destPath,
    directory: Directory.Data,
  })

  return {
    localPath: destPath,
    displayUrl: convertFileSrc(uri),
  }
}

/**
 * Save an in-memory Blob (e.g. web canvas output) to filesystem.
 * Native only — the web build falls back to base64 in memory.
 */
export async function savePhotoFromBlob(blob: Blob, filename: string): Promise<SavedPhoto> {
  if (!isNativePlatform()) {
    throw new Error('savePhotoFromBlob only works on native platforms')
  }

  await ensurePhotoDir()

  const base64 = await blobToBase64(blob)
  const destPath = `${PHOTO_DIR}/${filename}`

  await Filesystem.writeFile({
    path: destPath,
    data: base64,
    directory: Directory.Data,
  })

  const { uri } = await Filesystem.getUri({
    path: destPath,
    directory: Directory.Data,
  })

  return {
    localPath: destPath,
    displayUrl: convertFileSrc(uri),
  }
}

/** Read a stored photo as a Blob suitable for uploading. */
export async function readPhotoAsBlob(localPath: string): Promise<Blob> {
  if (!isNativePlatform()) {
    throw new Error('readPhotoAsBlob only works on native platforms')
  }

  const { data } = await Filesystem.readFile({
    path: localPath,
    directory: Directory.Data,
  })

  const base64 = typeof data === 'string' ? data : await blobToBase64(data)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

export async function deletePhoto(localPath: string): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await Filesystem.deleteFile({
      path: localPath,
      directory: Directory.Data,
    })
  } catch {
    // already gone — ignore
  }
}

async function ensurePhotoDir(): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: PHOTO_DIR,
      directory: Directory.Data,
      recursive: true,
    })
  } catch {
    // already exists — ignore
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export { Encoding }
