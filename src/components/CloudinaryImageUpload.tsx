import React, { useState, useRef } from 'react'
import { UploadCloud, CheckCircle2, Loader2, X, Image as ImageIcon, Sparkles } from 'lucide-react'
import { uploadToCloudinary, getOptimizedImageUrl } from '../lib/cloudinary'
import { CloudinaryAssetPickerModal } from './CloudinaryAssetPickerModal'

interface CloudinaryImageUploadProps {
  label: string
  currentImageUrl?: string | null
  onImageUploaded: (url: string) => void
  onImageRemoved?: () => void
  onUploading?: (isUploading: boolean) => void
  folder?: 'banners' | 'covers' | 'avatars'
  recommendedDimensions?: string
  aspectRatioHint?: string
  maxSizeMb?: number
  className?: string
  allowPlatformPicker?: boolean
}

export const CloudinaryImageUpload: React.FC<CloudinaryImageUploadProps> = ({
  label,
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  onUploading,
  folder = 'banners',
  recommendedDimensions = '1200 × 500 px',
  aspectRatioHint = 'Landscape (~21:9 or 16:9)',
  maxSizeMb = 10,
  className = '',
  allowPlatformPicker = true,
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, etc.).')
      return
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      setUploadError(`Image file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed is ${maxSizeMb}MB.`)
      return
    }

    setUploadError(null)
    setImageLoadError(false)
    setIsUploading(true)
    onUploading?.(true)

    try {
      const res = await uploadToCloudinary(file, folder)
      onImageUploaded(res.secure_url)
    } catch (err: any) {
      console.error('[CloudinaryUpload] Error:', err)
      setUploadError(err.message || 'Failed to upload to Cloudinary. Check network.')
    } finally {
      setIsUploading(false)
      onUploading?.(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-mono text-[var(--ink-secondary)]">
          {label}
        </label>
        <span className="text-[10px] font-mono text-[var(--ink-faint)]">
          {recommendedDimensions} • {aspectRatioHint}
        </span>
      </div>

      {currentImageUrl && !imageLoadError ? (
        <div className="relative group overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
          <img
            src={getOptimizedImageUrl(currentImageUrl, { width: 900, quality: 'auto' })}
            alt="Uploaded preview"
            onError={() => setImageLoadError(true)}
            className="w-full h-32 sm:h-40 object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3 flex-wrap">
            {allowPlatformPicker && (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                disabled={isUploading}
                className="px-3 py-1.5 rounded-md bg-white text-black border border-slate-200 hover:bg-slate-50 text-xs font-mono font-medium transition cursor-pointer shadow-xs"
              >
                Choose from Library
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-2.5 py-1.5 rounded-md bg-[var(--bg-canvas)] text-[var(--ink-primary)] text-xs font-mono font-medium hover:bg-[var(--bg-subtle)] transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload New
            </button>
            {onImageRemoved && (
              <button
                type="button"
                onClick={onImageRemoved}
                disabled={isUploading}
                className="px-2.5 py-1.5 rounded-md bg-rose-600/90 text-white text-xs font-mono font-medium hover:bg-rose-700 transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
          </div>
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-emerald-400 font-mono text-[10px] flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Cloudinary Optimized</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-5 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)]'
                : 'border-[var(--border-subtle)] hover:border-[var(--ink-muted)] bg-[var(--bg-canvas)]/60'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--ink-primary)]" />
                <span className="text-xs font-mono text-[var(--ink-secondary)]">
                  Uploading to Cloudinary CDN & optimizing...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div className="p-2.5 rounded-full bg-[var(--bg-subtle)] text-[var(--ink-muted)]">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div className="text-xs font-mono text-[var(--ink-primary)] font-medium">
                  Click to upload or drag & drop custom image
                </div>
                <div className="text-[10px] font-mono text-[var(--ink-faint)]">
                  PNG, JPG, WebP up to {maxSizeMb}MB (Auto-compressed to WebP)
                </div>
              </div>
            )}
          </div>

          {allowPlatformPicker && (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                disabled={isUploading}
                className="w-full py-2.5 px-4 rounded-lg bg-white text-black border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-xs font-mono font-medium transition cursor-pointer shadow-xs text-center"
              >
                Choose from Library
              </button>
            </div>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-[11px] font-mono text-rose-500 pt-1">{uploadError}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
          }
        }}
      />

      {/* Cloudinary Asset Picker Modal */}
      {allowPlatformPicker && (
        <CloudinaryAssetPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(url) => {
            setImageLoadError(false)
            onImageUploaded(url)
          }}
          type={folder === 'banners' ? 'banner' : 'book_cover'}
          currentUrl={currentImageUrl}
        />
      )}
    </div>
  )
}
