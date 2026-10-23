/**
 * Cloudinary client utility for uploading images and generating auto-optimized delivery URLs.
 */

const CLOUD_NAME =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) ||
  (typeof process !== 'undefined' && process.env?.VITE_CLOUDINARY_CLOUD_NAME) ||
  'pxluxw9a'

const UPLOAD_PRESET =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
  (typeof process !== 'undefined' && process.env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
  'hatchpen_writing_module'

export interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes: number
}

/**
 * Convert any image File (PNG, JPEG, etc.) into an optimized WebP File
 * using the browser's native Canvas API before upload.
 * This runs client-side in ~20-50ms and reduces file size by 60-80%
 * while ensuring the stored file format on Cloudinary is .webp.
 */
export async function convertImageToWebP(
  file: File,
  quality = 0.85,
  maxWidth = 1600,
  maxHeight = 2400
): Promise<File> {
  // If not running in browser (e.g. server/node), or already webp, return as-is
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file
  }
  if (file.type === 'image/webp') {
    return file
  }

  return new Promise((resolve) => {
    try {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        try {
          URL.revokeObjectURL(objectUrl)
          let { width, height } = img
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(file)
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file)
                return
              }
              const baseName = file.name.replace(/\.[^/.]+$/, '')
              const webpFile = new File([blob], `${baseName}.webp`, {
                type: 'image/webp',
                lastModified: Date.now(),
              })
              resolve(webpFile)
            },
            'image/webp',
            quality
          )
        } catch {
          resolve(file)
        }
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
      }

      img.src = objectUrl
    } catch {
      resolve(file)
    }
  })
}

/**
 * Upload an image file directly to Cloudinary using Unsigned upload preset.
 * Converts PNG/JPEG to WebP on the fly and auto-compresses via CDN.
 */
export async function uploadToCloudinary(
  file: File,
  folder: 'covers' | 'banners' | 'avatars' = 'banners'
): Promise<CloudinaryUploadResponse> {
  // Convert PNG/JPEG to WebP before uploading to optimize bandwidth and storage
  const processedFile = await convertImageToWebP(file)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

  const formData = new FormData()
  formData.append('file', processedFile)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `stories-by-relay/${folder}`)

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message || `Failed to upload image to Cloudinary (status ${res.status})`
    )
  }

  const data: CloudinaryUploadResponse = await res.json()
  return data
}

/**
 * Transforms a raw Cloudinary URL to automatically apply quality and format optimizations.
 * Example: q_auto,f_auto,w_1200
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: {
    width?: number
    height?: number
    crop?: 'fill' | 'fit' | 'limit'
    quality?: 'auto' | 'auto:good' | 'auto:eco'
  } = {}
): string {
  if (!url) return ''
  if (!url.includes('cloudinary.com')) return url

  const { width, height, crop = 'limit', quality = 'auto' } = options
  const transformations: string[] = [`f_auto`, `q_${quality}`]

  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)
  if (width || height) transformations.push(`c_${crop}`)

  const transformString = transformations.join(',')
  return url.replace('/upload/', `/upload/${transformString}/`)
}
