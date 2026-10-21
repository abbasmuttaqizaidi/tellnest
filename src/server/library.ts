import { createServerFn } from '@tanstack/react-start'
import { WORKS, type Work, getWorkSlug } from '../data/mockData.ts'

export interface CompactLibraryWork {
  id: string
  slug: string
  title: string
  cover: string
  chaptersCount: number
  authorName: string
  genre: string
}

export interface LibraryWorkDetail {
  id: string
  slug: string
  title: string
  cover: string
  chaptersCount: number
  author: {
    id?: string
    name: string
    avatar?: string
    bio?: string
  }
  genre: string
  category: string
  status: string
  description: string
  readingTimeMinutes?: number
  totalReads?: number | string
  firstChapterId?: string
}

/**
 * Pure projection helper: Guarantees that returned compact works contain ONLY:
 * book name (title), cover, no of chapters, author ka naam, and genre (plus id/slug).
 */
export function projectToCompactLibraryWork(raw: any): CompactLibraryWork {
  const authorName =
    raw.authorName ||
    raw.author_name ||
    raw.author?.name ||
    raw.author?.display_name ||
    raw.author?.username ||
    raw.profiles?.display_name ||
    raw.profiles?.username ||
    'Unknown Author'

  const genreName =
    raw.genre ||
    raw.genreName ||
    (Array.isArray(raw.genres) && raw.genres[0]?.name) ||
    'Literary Fiction'

  const chaptersCount = Number(
    raw.chaptersCount ||
    raw.chapter_count ||
    raw.chapters_count ||
    raw.publishedChaptersCount ||
    (Array.isArray(raw.chapters) ? raw.chapters.length : 1)
  ) || 1

  return {
    id: String(raw.id),
    slug: String(raw.slug || raw.id),
    title: String(raw.title || 'Untitled Manuscript'),
    cover: String(raw.cover || raw.cover_image_path || '/covers/default-book.webp'),
    chaptersCount,
    authorName: String(authorName),
    genre: String(genreName),
  }
}

/**
 * Server Function: Get compact library works from API / Database.
 * Returns strictly book name, cover, no of chapters, author name, and genre.
 * Optimized with optional target workIds so only the user's shelf items are fetched.
 */
export const getCompactLibraryWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { workIds?: string[] } | void) => {
    if (!params || !params.workIds) return { workIds: undefined }
    return {
      workIds: Array.isArray(params.workIds)
        ? params.workIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
        : undefined,
    }
  })
  .handler(async ({ data }): Promise<CompactLibraryWork[]> => {
    return await executeGetCompactLibraryWorks({ workIds: data?.workIds })
  })

export async function executeGetCompactLibraryWorks(dependencies: {
  workIds?: string[]
  queryRows?: (workIds?: string[]) => Promise<any[]>
} = {}): Promise<CompactLibraryWork[]> {
  const { workIds, queryRows } = dependencies

  // Least-data optimization: If target workIds is explicitly empty,
  // the user has nothing on their shelf. Return immediately with 0 DB queries.
  if (Array.isArray(workIds) && workIds.length === 0) {
    return []
  }

  try {
    let rows: any[] = []

    if (queryRows) {
      rows = await queryRows(workIds)
    } else {
      const dbUrl = process.env.DATABASE_URL
      if (dbUrl) {
        try {
          const { Client } = await import('pg')
          const client = new Client({ connectionString: dbUrl })
          await client.connect()

          const hasTargetIds = Array.isArray(workIds) && workIds.length > 0
          const q = hasTargetIds
            ? `
              SELECT 
                w.id,
                w.slug,
                w.title,
                COALESCE(w.cover_image_path, '/covers/default-book.webp') AS cover,
                COALESCE(w.chapter_count, 1) AS "chaptersCount",
                COALESCE(p.display_name, p.username, 'Author') AS "authorName",
                COALESCE(w.genre, (
                  SELECT g.name 
                  FROM work_genres wg 
                  JOIN genres g ON g.id = wg.genre_id 
                  WHERE wg.work_id = w.id 
                  LIMIT 1
                ), 'Fiction') AS genre
              FROM works w
              LEFT JOIN profiles p ON p.id = w.author_id
              WHERE w.id::text = ANY($1)
              ORDER BY w.last_activity_at DESC NULLS LAST;
            `
            : `
              SELECT 
                w.id,
                w.slug,
                w.title,
                COALESCE(w.cover_image_path, '/covers/default-book.webp') AS cover,
                COALESCE(w.chapter_count, 1) AS "chaptersCount",
                COALESCE(p.display_name, p.username, 'Author') AS "authorName",
                COALESCE(w.genre, (
                  SELECT g.name 
                  FROM work_genres wg 
                  JOIN genres g ON g.id = wg.genre_id 
                  WHERE wg.work_id = w.id 
                  LIMIT 1
                ), 'Fiction') AS genre
              FROM works w
              LEFT JOIN profiles p ON p.id = w.author_id
              WHERE w.visibility = 'public' AND w.publication_status = 'published'
              ORDER BY w.last_activity_at DESC NULLS LAST
              LIMIT 12;
            `

          const res = hasTargetIds ? await client.query(q, [workIds]) : await client.query(q)
          await client.end()
          rows = res.rows || []
        } catch (dbErr) {
          console.warn('[executeGetCompactLibraryWorks] DB query failed, using platform fallback:', dbErr)
        }
      }
    }

    if (rows && rows.length > 0) {
      return rows.map(projectToCompactLibraryWork)
    }

    // Resilient fallback to platform catalog works projected strictly to compact schema
    const fallbackCatalog =
      Array.isArray(workIds) && workIds.length > 0
        ? WORKS.filter((w) => workIds.includes(w.id))
        : WORKS
    return fallbackCatalog.map(projectToCompactLibraryWork)
  } catch (err) {
    console.warn('[executeGetCompactLibraryWorks] Uncaught error, falling back to mock catalog:', err)
    return WORKS.map(projectToCompactLibraryWork)
  }
}

/**
 * Server Function: Fetch detailed book information for the mobile bottom drawer.
 */
export const getLibraryWorkDetailServerFn = createServerFn({ method: 'GET' })
  .validator((workIdOrSlug: string) => {
    if (typeof workIdOrSlug !== 'string' || !workIdOrSlug.trim()) {
      throw new Error('Valid work id or slug is required')
    }
    return workIdOrSlug.trim()
  })
  .handler(async ({ data: workIdOrSlug }): Promise<LibraryWorkDetail | null> => {
    return await executeGetLibraryWorkDetail(workIdOrSlug)
  })

export async function executeGetLibraryWorkDetail(
  workIdOrSlug: string,
  dependencies: {
    findDbWork?: (idOrSlug: string) => Promise<any>
  } = {}
): Promise<LibraryWorkDetail | null> {
  const clean = workIdOrSlug.trim().toLowerCase()

  if (dependencies.findDbWork) {
    const raw = await dependencies.findDbWork(clean)
    if (raw) return mapRawToLibraryWorkDetail(raw)
  }

  // 1. Try DB query if DATABASE_URL is available
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    try {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: dbUrl })
      await client.connect()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)
      const q = `
        SELECT 
          w.id,
          w.slug,
          w.title,
          w.description,
          w.cover_image_path AS cover,
          w.status,
          COALESCE(w.chapter_count, 1) AS "chaptersCount",
          w.reading_time_minutes AS "readingTimeMinutes",
          COALESCE(p.display_name, p.username, 'Author') AS "authorName",
          COALESCE(c.name, 'Novel') AS category,
          COALESCE(w.genre, 'Fiction') AS genre,
          (
            SELECT ch.id 
            FROM chapters ch 
            WHERE ch.work_id = w.id 
            ORDER BY ch.chapter_number ASC 
            LIMIT 1
          ) AS "firstChapterId"
        FROM works w
        LEFT JOIN profiles p ON p.id = w.author_id
        LEFT JOIN categories c ON c.id = w.category_id
        WHERE ${isUuid ? 'w.id = $1 OR w.slug = $1' : 'w.slug = $1'}
        LIMIT 1;
      `
      const res = await client.query(q, [clean])
      await client.end()
      if (res.rows && res.rows[0]) {
        return mapRawToLibraryWorkDetail(res.rows[0])
      }
    } catch (err) {
      console.warn('[executeGetLibraryWorkDetail] DB query error:', err)
    }
  }

  // 2. Fallback to platform catalog works
  const found = WORKS.find(
    (w) => w.id === clean || (w.slug && w.slug.toLowerCase() === clean) || getWorkSlug(w) === clean
  )
  if (found) {
    return {
      id: found.id,
      slug: getWorkSlug(found),
      title: found.title,
      cover: found.cover,
      chaptersCount: found.chaptersCount || found.publishedChaptersCount || found.chapters?.length || 1,
      author: {
        id: found.author?.id,
        name: found.author?.name || 'Author',
        avatar: found.author?.avatar,
        bio: found.author?.bio || 'Hatchpen author',
      },
      genre: found.genre || 'Literary Fiction',
      category: found.category || 'Serialized Novel',
      status: found.status || 'Ongoing',
      description: found.description || found.excerpt || 'An original literary manuscript on Hatchpen.',
      readingTimeMinutes: (found as any).readingTimeMinutes || 15,
      totalReads: found.totalReads || '1.2K',
      firstChapterId: found.chapters?.[0]?.id || 'ch-1',
    }
  }

  return null
}

function mapRawToLibraryWorkDetail(raw: any): LibraryWorkDetail {
  return {
    id: String(raw.id),
    slug: String(raw.slug || raw.id),
    title: String(raw.title || 'Untitled Manuscript'),
    cover: String(raw.cover || raw.cover_image_path || '/covers/default-book.webp'),
    chaptersCount: Number(raw.chaptersCount || raw.chapter_count || 1),
    author: {
      id: raw.authorId || raw.author_id,
      name: String(raw.authorName || raw.author_name || 'Author'),
      avatar: raw.authorAvatar || raw.author_avatar,
      bio: raw.authorBio || raw.author_bio || '',
    },
    genre: String(raw.genre || 'Fiction'),
    category: String(raw.category || 'Novel'),
    status: String(raw.status || 'Ongoing'),
    description: String(raw.description || 'No description provided.'),
    readingTimeMinutes: raw.readingTimeMinutes ? Number(raw.readingTimeMinutes) : undefined,
    totalReads: raw.totalReads || 0,
    firstChapterId: raw.firstChapterId || 'ch-1',
  }
}
