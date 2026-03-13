export const COMPRESSION_CONFIG = {
  maxWidthOrHeight: 1280,
  quality: 0.72,
  targetMaxBytes: 800_000,
}

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ratio = Math.min(
          COMPRESSION_CONFIG.maxWidthOrHeight / img.width,
          COMPRESSION_CONFIG.maxWidthOrHeight / img.height,
          1
        )
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url)
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          COMPRESSION_CONFIG.quality
        )
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
