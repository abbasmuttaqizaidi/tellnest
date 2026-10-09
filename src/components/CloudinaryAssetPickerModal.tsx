import React, { useState, useEffect } from 'react'
import { Sparkles, Check, Loader2, X, RefreshCw, FolderSearch } from 'lucide-react'
import { getCloudinaryPlatformAssetsServerFn } from '../server/works'
import { getOptimizedImageUrl } from '../lib/cloudinary'

export interface PlatformAsset {
  publicId: string
  secureUrl: string
  assetFolder: string
  width?: number
  height?: number
  aspectRatio?: number
}

interface CloudinaryAssetPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string) => void
  type: 'book_cover' | 'banner'
  currentUrl?: string | null
}

export const CloudinaryAssetPickerModal: React.FC<CloudinaryAssetPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  type,
  currentUrl,
}) => {
  const [assets, setAssets] = useState<PlatformAsset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCover = type === 'book_cover'
  const title = isCover ? 'Curated Platform Book Covers' : 'Curated Chapter Banners'
  const description = isCover
    ? 'Choose from high-resolution, platform-defined editorial covers in Cloudinary'
    : 'Choose from cinematic landscape banners in Cloudinary'

  const cacheKey = `hatchpen_cloudinary_assets_${type}`

  const fetchAssets = async (forceRefresh = false) => {
    // 1. Client-side instant cache check
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey)
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssets(parsed)
            setIsLoading(false)
            return
          }
        }
      } catch (e) {}
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await getCloudinaryPlatformAssetsServerFn({
        data: { folder: type, forceRefresh },
      })
      if (res?.assets && Array.isArray(res.assets)) {
        setAssets(res.assets)
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(res.assets))
          } catch (e) {}
        }
      } else {
        setAssets([])
      }
    } catch (err: any) {
      console.error('[CloudinaryAssetPickerModal] Error fetching assets:', err)
      setError('Could not load assets from Cloudinary. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchAssets(false)
    }
  }, [isOpen, type])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                {title}
              </h3>
              <p className="text-xs text-[var(--ink-muted)]">
                {description} • {assets.length} items available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchAssets(true)}
              disabled={isLoading}
              className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer"
              title="Refresh images from Cloudinary"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition cursor-pointer"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--bg-canvas)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--ink-primary)]" />
              <p className="text-xs font-mono text-[var(--ink-muted)]">
                Loading curated {isCover ? 'covers' : 'banners'} from Cloudinary...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-xs font-mono text-rose-500">{error}</p>
              <button
                type="button"
                onClick={fetchAssets}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-xs font-mono hover:bg-[var(--bg-subtle)]"
              >
                Retry
              </button>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-[var(--ink-muted)]">
              <FolderSearch className="h-8 w-8 mx-auto text-[var(--ink-faint)]" />
              <p className="text-xs font-mono">No images found in Cloudinary folder '{type}'.</p>
            </div>
          ) : (
            <div
              className={`grid gap-3 sm:gap-4 ${
                isCover
                  ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5'
                  : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
              }`}
            >
              {assets.map((asset) => {
                const isSelected = currentUrl === asset.secureUrl
                const thumbUrl = getOptimizedImageUrl(asset.secureUrl, {
                  width: isCover ? 350 : 500,
                  quality: 'auto:good',
                })

                return (
                  <button
                    key={asset.publicId}
                    type="button"
                    onClick={() => {
                      onSelect(asset.secureUrl)
                      onClose()
                    }}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer text-left bg-[var(--bg-surface)] ${
                      isSelected
                        ? 'border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)] shadow-md'
                        : 'border-[var(--border-subtle)] hover:border-[var(--ink-muted)] hover:shadow-sm'
                    } ${isCover ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}
                  >
                    <img
                      src={thumbUrl}
                      alt={asset.publicId}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-104"
                    />

                    {/* Gradient Overlay & Check */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-[10px] font-mono text-white truncate">
                        Use this image
                      </span>
                    </div>

                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-[var(--ink-primary)] text-[var(--accent-contrast)] shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono text-[var(--ink-muted)]">
          <span>Click any image to select instantly</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
