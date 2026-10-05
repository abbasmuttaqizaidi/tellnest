# Tellnest Tri-Tier Media Storage Architecture

This document outlines the proposal, division of responsibilities, and step-by-step implementation instructions for Tellnest's multi-provider media storage architecture combining **Supabase Storage**, **ImageKit.io**, and **Cloudflare R2**.

---

## 1. Executive Summary & Problem Statement

### The Problem
* **Supabase Free Tier Limits**:
  * **1 GB Storage** (disk space).
  * **2 GB Egress Bandwidth / month** (data transfer to readers).
* **The Egress Bottleneck**: In a media-rich editorial platform, serialized chapters often feature multiple high-resolution illustrations and atmospheric artwork (~1.5 MB per chapter visit). Just **1,500 readers** reading an illustrated chapter would consume over 2.25 GB of bandwidth, exceeding Supabase's monthly quota and risking overage fees or service disruption.

### The Solution: Tri-Tier Free Architecture
By combining three complementary free tiers, Tellnest achieves:
1. **~14 GB of Combined Free Storage** (1 GB Supabase + ~3 GB ImageKit + 10 GB Cloudflare R2).
2. **$0.00 Egress Bandwidth Fees** (Cloudflare R2 absorbs viral reader traffic at zero cost).
3. **Responsive Dynamic Thumbnails** (ImageKit resizes book covers on the fly for mobile vs desktop).
4. **Tight Database Integration** (User avatars stay mapped to PostgreSQL `profiles` rows).

---

## 2. Tri-Tier Division Matrix

| Tier | Provider | Assigned Media | Why This Provider? | Limits & Quota |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Supabase Storage** | **User Avatars** (`author-avatars`) | • Featherlight assets (~25–30 KB WebP).<br>• Direct foreign key integration with `profiles` table.<br>• Native Clerk authentication sync. | • **1 GB** Storage<br>• Room for **~33,000+** avatars<br>• 500 KB upload limit |
| **Tier 2** | **ImageKit.io** | **Manuscript Covers** (`/covers`) | • On-the-fly URL-based resizing (`?tr=w-300` vs `?tr=w-1000`).<br>• Auto-converts to WebP/AVIF based on reader's browser.<br>• Generous delivery bandwidth for cover grids. | • **~3 GB** Storage<br>• **20 GB Bandwidth / mo**<br>• Global AWS/CloudFront CDN |
| **Tier 3** | **Cloudflare R2** | **Chapter Artwork & In-Story Illustrations** (`/chapters`) | • In-story art is heavy (~300–800 KB each).<br>• **$0 egress fees permanently**.<br>• 100,000 readers can view art with zero bandwidth bills. | • **10 GB** Permanent Storage<br>• **Unlimited $0 Egress**<br>• 1M writes, 10M reads/mo |

---

## 3. Storage Hierarchy & Naming Conventions

### Tier 1: Supabase Storage (`author-avatars`)
* **Bucket**: `author-avatars` (Public)
* **Path Convention**:
  ```text
  author-avatars/{userId}/avatar_{timestamp}.webp
  ```
* **Specs**: Max upload 500 KB &rarr; Canvas center-cropped to 300×300 px square WebP (~20–40 KB).

### Tier 2: ImageKit.io (`/covers`)
* **Folder**: `/tellnest/covers/`
* **Path Convention**:
  ```text
  /tellnest/covers/{workId}/cover_{timestamp}.webp
  ```
* **Dynamic URL Transformations**:
  * **Search Palette Thumbnail**: `https://ik.imagekit.io/<id>/tellnest/covers/book.jpg?tr=w-120,h-180,q-80,f-auto` (~12 KB)
  * **Grid Card (Home / Discover)**: `https://ik.imagekit.io/<id>/tellnest/covers/book.jpg?tr=w-360,h-540,q-80,f-auto` (~45 KB)
  * **Story Hero Header**: `https://ik.imagekit.io/<id>/tellnest/covers/book.jpg?tr=w-1000,h-1500,q-85,f-auto` (~160 KB)

### Tier 3: Cloudflare R2 (`tellnest-media`)
* **Bucket**: `tellnest-media` (Public)
* **Path Convention**:
  ```text
  chapters/{workId}/{chapterId}/art_{assetId}_{timestamp}.webp
  ```
* **Specs**: High-resolution landscape and atmosphere illustrations (max width 1920 px, WebP @ 85%, ~200–500 KB).

---

## 4. Cold Start & Latency Analysis

* **Cold Starts**: **None.** Static object storage (R2, ImageKit, Supabase Storage) does not suffer from serverless cold-start boot delays.
* **Warm Requests (Cache Hit)**: **10 ms – 30 ms** served from Cloudflare / AWS edge point-of-presence.
* **Cold Requests (Cache Miss / First Hit)**: **100 ms – 250 ms** (imperceptible blink to fetch from bucket origin).

---

## 5. Implementation Instructions

### Phase 1: Supabase Storage Setup (Completed & Active)
1. **Buckets Created**:
   * `author-avatars` (Public, 500 KB limit, images only).
   * `manuscript-covers` & `chapter-assets`.
2. **PostgreSQL Storage RLS Policies**:
   * Public `SELECT` and `INSERT`/`UPDATE` policies applied on `storage.objects`.
3. **Client-side Compression**:
   * [`optimizeAvatarImage()`](src/lib/supabase/storage.ts) automatically center-crops and compresses avatar uploads to 300×300 px square WebP (~30 KB).
4. **Settings UI**:
   * Profile picture uploader active in [`src/routes/settings.tsx`](src/routes/settings.tsx) with live preview and "Revert to Default" fallback.

---

### Phase 2: ImageKit.io Setup (For Manuscript Covers)

#### 1. ImageKit Account & Credentials
1. Sign up at [ImageKit.io](https://imagekit.io) (Free plan: 20 GB bandwidth + media storage).
2. From the **Developer Options** dashboard, retrieve:
   * `IMAGEKIT_PUBLIC_KEY`
   * `IMAGEKIT_PRIVATE_KEY`
   * `IMAGEKIT_URL_ENDPOINT` (e.g. `https://ik.imagekit.io/tellnest/`)

#### 2. Environment Variables
Add to `.env`:
```env
# ImageKit Configuration (Story Covers & Responsive Delivery)
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id/
VITE_IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxxxxxx=
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxxxxxxx=
```

#### 3. ImageKit Client & Transformation Helper (`src/lib/imagekit/client.ts`)
```typescript
const IMAGEKIT_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || ''

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  aspectRatio?: string
  blur?: number
  format?: 'auto' | 'webp' | 'avif' | 'jpg'
}

/**
 * Builds an optimized ImageKit delivery URL with query transformations
 */
export function getOptimizedCoverUrl(pathOrUrl: string, options: ImageTransformOptions = {}): string {
  if (!pathOrUrl) return ''
  if (!pathOrUrl.startsWith('http') && !pathOrUrl.startsWith('/')) {
    pathOrUrl = `/${pathOrUrl}`
  }

  const transforms: string[] = []
  if (options.width) transforms.push(`w-${options.width}`)
  if (options.height) transforms.push(`h-${options.height}`)
  if (options.quality) transforms.push(`q-${options.quality}`)
  if (options.aspectRatio) transforms.push(`ar-${options.aspectRatio}`)
  transforms.push(`f-${options.format || 'auto'}`)

  const trString = `tr=${transforms.join(',')}`
  const separator = pathOrUrl.includes('?') ? '&' : '?'
  
  // If already an ImageKit URL
  if (pathOrUrl.includes('ik.imagekit.io')) {
    return `${pathOrUrl}${separator}${trString}`
  }

  // Prepend ImageKit endpoint
  const cleanPath = pathOrUrl.replace(/^\/+/, '')
  return `${IMAGEKIT_ENDPOINT.replace(/\/+$/, '')}/${cleanPath}?${trString}`
}
```

#### 4. Story Cover Upload Flow
* In Writer Studio (`src/routes/write.new.tsx` / `write.editor`), upload story covers directly to ImageKit using their upload API or server function.
* Save the returned path (e.g. `/covers/story-123.jpg`) in Supabase `works.cover_image_url`.

---

### Phase 3: Cloudflare R2 Setup (For Chapter Artwork)

#### 1. Cloudflare R2 Bucket Creation
1. Go to **Cloudflare Dashboard** &rarr; **R2 Object Storage**.
2. Click **Create Bucket** &rarr; Name it `tellnest-media`.
3. Under **Settings** &rarr; **Public Access**:
   * Enable **R2.dev subdomain** (or connect a custom domain like `media.tellnest.com`).
4. Under **R2 API Tokens**:
   * Click **Manage R2 API Tokens** &rarr; **Create API Token**.
   * Permissions: **Object Read & Write**.
   * Note down:
     * `R2_ACCESS_KEY_ID`
     * `R2_SECRET_ACCESS_KEY`
     * `R2_ENDPOINT` (e.g. `https://<account_id>.r2.cloudflarestorage.com`)

#### 2. Environment Variables
Add to `.env`:
```env
# Cloudflare R2 Configuration (Chapter Artwork & In-Story Media)
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=tellnest-media
R2_PUBLIC_URL=https://media.tellnest.com
```

#### 3. S3 Client Adapter for R2 (`src/lib/r2/server.ts`)
Install the lightweight S3 client:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Implement server-side pre-signed URL generator:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

/**
 * Generates a pre-signed PUT URL for uploading chapter art directly from the browser to Cloudflare R2
 */
export async function getChapterArtUploadUrl(workId: string, chapterId: string, filename: string, contentType: string) {
  const key = `chapters/${workId}/${chapterId}/${Date.now()}_${filename}`
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'tellnest-media',
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return { uploadUrl, publicUrl, key }
}
```

---

## 6. Unified Media Upload Dispatcher

To provide a single, clean API for front-end components, use a unified media dispatcher:

```typescript
export type MediaType = 'avatar' | 'cover' | 'chapter_art'

export async function uploadMedia(file: File, options: {
  type: MediaType
  workId?: string
  chapterId?: string
  userId?: string
}) {
  switch (options.type) {
    case 'avatar':
      // Route to Supabase author-avatars
      return uploadAvatarToSupabase(file, options.userId)

    case 'cover':
      // Route to ImageKit /covers
      return uploadCoverToImageKit(file, options.workId)

    case 'chapter_art':
      // Route to Cloudflare R2 /chapters
      return uploadChapterArtToR2(file, options.workId!, options.chapterId!)
  }
}
```

---

## 7. Capacity & Economic Projections

| Metric | With Supabase Alone | With Tri-Tier (Supabase + ImageKit + R2) |
| :--- | :--- | :--- |
| **Combined Storage** | 1 GB | **~14 GB** |
| **Avatar Capacity** | Limited by shared 1 GB | **~33,000+ Avatars** |
| **Story Covers Capacity** | Stored uncompressed | **~15,000+ Covers** with dynamic WebP |
| **Chapter Art Capacity** | ~500 images | **~30,000+ High-Res Illustrations** |
| **Monthly Reader Bandwidth** | 2 GB (~1,300 views) | **Unlimited Free Egress** on Cloudflare + 20 GB ImageKit |
| **Monthly Cost** | Risk of overages | **$0.00 / month permanently** |
