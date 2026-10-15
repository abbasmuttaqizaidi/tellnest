/**
 * HatchPen Homepage Hero Banner Configuration
 * 
 * Change `HERO_IMAGE_URL` here whenever you want to update the hero photograph.
 * This is the SINGLE source of truth for the hero banner across the entire app.
 */
export const HERO_IMAGE_URL =
  'https://res.cloudinary.com/pxluxw9a/image/upload/v1792058068/uxh1pnzrl66jxsjsft99.png'

export const HERO_LOCAL_FALLBACK = '/hero-image.webp'

/**
 * Returns optimized responsive image sources and srcSet.
 * Cloudinary URLs automatically receive f_auto,q_auto and 5 responsive breakpoints (640w -> 2000w).
 */
export function getHeroImageSources(url: string = HERO_IMAGE_URL) {
  const raw = (url || HERO_IMAGE_URL).trim()

  const match = raw.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:[a-z0-9_,.-]+\/)?(v\d+\/[^/]+|\w+[^/]+)$/
  )

  if (match) {
    const [, base, assetPath] = match
    const cleanAsset = assetPath.replace(/^f_[^,]+,q_[^,]+,w_\d+\//, '')
    return {
      src: `${base}f_auto,q_auto,w_1600/${cleanAsset}`,
      srcSet: [
        `${base}f_auto,q_auto,w_640/${cleanAsset} 640w`,
        `${base}f_auto,q_auto,w_960/${cleanAsset} 960w`,
        `${base}f_auto,q_auto,w_1200/${cleanAsset} 1200w`,
        `${base}f_auto,q_auto,w_1600/${cleanAsset} 1600w`,
        `${base}f_auto,q_auto,w_2000/${cleanAsset} 2000w`,
      ].join(', '),
      fallback: HERO_LOCAL_FALLBACK,
    }
  }

  return {
    src: raw,
    srcSet: undefined,
    fallback: HERO_LOCAL_FALLBACK,
  }
}
