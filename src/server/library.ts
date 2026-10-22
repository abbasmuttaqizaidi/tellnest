import { createServerFn } from '@tanstack/react-start'
import { type Work, getWorkSlug } from '../data/mockData.ts'

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
      // 1. Primary: Query via Supabase Admin REST API (HTTPS) - works in serverless (Vercel) without port 5432
      try {
        const { createAdminClient } = await import('../lib/supabase/server.ts')
        const admin = createAdminClient()
        const hasTargetIds = Array.isArray(workIds) && workIds.length > 0

        let query = admin
          .from('works')
          .select(`
            id,
            slug,
            title,
            cover_image_path,
            chapter_count,
            profiles:author_id (display_name, username),
            work_genres (genres (name))
          `)
          .order('last_activity_at', { ascending: false })

        if (hasTargetIds) {
          query = query.in('id', workIds)
        } else {
          query = query.eq('visibility', 'public').eq('publication_status', 'published').limit(12)
        }

        const { data: supaRows, error: supaErr } = await query

        if (!supaErr && Array.isArray(supaRows) && supaRows.length > 0) {
          rows = supaRows.map((r: any) => ({
            id: r.id,
            slug: r.slug,
            title: r.title,
            cover: r.cover_image_path || '/covers/default-book.webp',
            chaptersCount: r.chapter_count || 1,
            authorName: r.profiles?.display_name || r.profiles?.username || 'Author',
            genre: r.work_genres?.[0]?.genres?.name || 'Fiction',
          }))
        }
      } catch (supaEx) {
        console.warn('[executeGetCompactLibraryWorks] Supabase REST query exception:', supaEx)
      }

      // 2. Secondary fallback: direct pg query if available and REST didn't return rows
      if (rows.length === 0 && process.env.DATABASE_URL) {
        const dbUrl = process.env.DATABASE_URL
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

    return []
  } catch (err) {
    console.warn('[executeGetCompactLibraryWorks] Uncaught error:', err)
    return []
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

  // 1. Primary: Query via Supabase Admin REST API (HTTPS)
  try {
    const { createAdminClient } = await import('../lib/supabase/server.ts')
    const admin = createAdminClient()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = admin
      .from('works')
      .select(`
        id,
        slug,
        title,
        description,
        cover_image_path,
        status,
        chapter_count,
        reading_time_minutes,
        profiles:author_id (id, display_name, username, avatar_path, bio),
        categories:category_id (name),
        work_genres (genres (name)),
        chapters (id, chapter_number)
      `)

    if (isUuid) {
      query = query.or(`id.eq.${clean},slug.eq.${clean}`)
    } else {
      query = query.eq('slug', clean)
    }

    const { data: supaWork, error: supaErr } = await query.limit(1).maybeSingle()
    if (!supaErr && supaWork) {
      const sortedChapters = (supaWork.chapters || []).sort(
        (a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0)
      )
      return {
        id: supaWork.id,
        slug: supaWork.slug || '',
        title: supaWork.title || '',
        cover: supaWork.cover_image_path || '/covers/default-book.webp',
        chaptersCount: supaWork.chapter_count || sortedChapters.length || 1,
        author: {
          id: supaWork.profiles?.id,
          name: supaWork.profiles?.display_name || supaWork.profiles?.username || 'Author',
          avatar: supaWork.profiles?.avatar_path,
          bio: supaWork.profiles?.bio,
        },
        genre: supaWork.work_genres?.[0]?.genres?.name || 'Fiction',
        category: supaWork.categories?.name || 'Novel',
        status: supaWork.status || 'ongoing',
        description: supaWork.description || '',
        readingTimeMinutes: supaWork.reading_time_minutes,
        firstChapterId: sortedChapters[0]?.id || 'ch-1',
      }
    }
  } catch (supaEx) {
    console.warn('[executeGetLibraryWorkDetail] Supabase REST query exception:', supaEx)
  }

  // 2. Secondary fallback: DB query if DATABASE_URL is available
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
