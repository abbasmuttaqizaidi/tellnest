import { supabase } from './client'

/**
 * Standard Storage Buckets for Stories by Relay
 */
export const STORAGE_BUCKETS = {
  COVERS: 'manuscript-covers',
  AVATARS: 'author-avatars',
  CHAPTER_ASSETS: 'chapter-assets',
} as const

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS] | string

export interface UploadImageOptions {
  bucket?: StorageBucket
  path: string
  file: File | Blob
  upsert?: boolean
}

export interface UploadImageResult {
  url: string | null
  path: string | null
  error: Error | null
}

/**
 * Upload an image (cover, avatar, chapter asset) to Supabase Storage and return the public URL.
 */
export async function uploadImage({
  bucket = STORAGE_BUCKETS.COVERS,
  path,
  file,
  upsert = true,
}: UploadImageOptions): Promise<UploadImageResult> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert,
      cacheControl: '3600',
    })

    if (error) {
      console.error(`[Supabase Storage] Error uploading to ${bucket}/${path}:`, error.message)
      return { url: null, path: null, error: new Error(error.message) }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path,
      error: null,
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error during image upload')
    console.error(`[Supabase Storage] Exception during upload:`, error)
    return { url: null, path: null, error }
  }
}

/**
 * Retrieve the public URL for an asset stored in Supabase Storage.
 */
export function getPublicImageUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Remove an image from Supabase Storage.
 */
export async function deleteImage(bucket: StorageBucket, paths: string[]): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths)
    if (error) {
      return { success: false, error: new Error(error.message) }
    }
    return { success: true, error: null }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error during image deletion')
    return { success: false, error }
  }
}

/**
 * Resizes and compresses an avatar image in the browser using an HTML Canvas.
 * Crops to a center-weighted square (max 300x300 px) and converts to WebP (~20-40 KB).
 */
export async function optimizeAvatarImage(file: File, maxDimension = 300, quality = 0.85): Promise<File> {
  // If not in browser environment, return original file
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)

    img.onload = () => {
      try {
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2

        const targetDim = Math.min(size, maxDimension)
        const canvas = document.createElement('canvas')
        canvas.width = targetDim
        canvas.height = targetDim

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetDim, targetDim)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '')
            const optimizedFile = new File([blob], `${cleanName}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(optimizedFile)
          },
          'image/webp',
          quality
        )
      } catch (err) {
        console.warn('[optimizeAvatarImage] Canvas processing fallback:', err)
        resolve(file)
      }
    }

    img.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
