/**
 * Cloudinary client utility for uploading images and generating auto-optimized delivery URLs.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'pxluxw9a'
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'hatchpen_writing_module'

export interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes: number
}

/**
 * Upload an image file directly to Cloudinary using Unsigned upload preset.
 * Auto-compresses and delivers via CDN.
 */
export async function uploadToCloudinary(
  file: File,
  folder: 'covers' | 'banners' | 'avatars' = 'banners'
): Promise<CloudinaryUploadResponse> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

  const formData = new FormData()
  formData.append('file', file)
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
