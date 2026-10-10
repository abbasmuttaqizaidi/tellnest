import { createServerFn } from '@tanstack/react-start'
import {
  getPublicWorkBySlug,
  getDiscoverWorks,
  getWorkById,
  createWork,
  updateWork,
  publishWork,
} from '../lib/supabase/queries/works'
import type { WorkStatus } from '../lib/supabase/types'

/**
 * Server Function: Get a full public work (with acts and chapters) by id or slug.
 * Used by Route loader, SSR head, and Reader components so DB works are instantly resolved without flash or 404.
 */
export const getPublicWorkServerFn = createServerFn({ method: 'GET' })
  .validator((idOrSlug: string) => {
    if (typeof idOrSlug !== 'string' || !idOrSlug.trim()) {
      throw new Error('Valid work id or slug is required')
    }
    return idOrSlug.trim()
  })
  .handler(async ({ data: idOrSlug }) => {
    const { supabase } = await import('../lib/supabase/client')
    const clean = idOrSlug.trim().toLowerCase()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = supabase
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        language,
        status,
        visibility,
        publication_status,
        word_count,
        chapter_count,
        reading_time_minutes,
        view_count,
        like_count,
        save_count,
        created_at,
        updated_at,
        last_activity_at,
        author:profiles!works_author_id_fkey(
          id,
          username,
          display_name,
          avatar_path,
          bio
        ),
        category:categories(id, name, slug),
        acts(
          id,
          work_id,
          act_number,
          title,
          slug,
          description,
          status
        ),
        chapters(
          id,
          work_id,
          act_id,
          chapter_number,
          title,
          subtitle,
          slug,
          content,
          word_count,
          reading_time_minutes,
          status,
          banner_image_path,
          view_count,
          published_at
        )
      `)
      .in('visibility', ['public', 'unlisted', 'draft'])

    if (isUuid) {
      query = query.or(`id.eq.${clean},slug.eq.${clean}`)
    } else {
      query = query.eq('slug', clean)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return null

    let mappedStatus: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled' = 'Ongoing'
    if (data.status === 'completed') mappedStatus = 'Completed'
    else if (data.status === 'on_hiatus') mappedStatus = 'On Hiatus'
    else if (data.status === 'cancelled') mappedStatus = 'Cancelled'

    const rawChapters = ((data as any).chapters || [])

    const mappedActs = ((data as any).acts || [])
      .sort((a: any, b: any) => (a.act_number || 0) - (b.act_number || 0))
      .map((act: any) => {
        const actChapters = rawChapters.filter((c: any) => c.act_id === act.id)
        const actViewCount = actChapters.reduce((sum: number, c: any) => sum + (c.view_count || 0), 0)
        return {
          id: act.id,
          workId: act.work_id,
          number: act.act_number,
          title: act.title,
          slug: act.slug,
          description: act.description || '',
          status: act.status || 'published',
          viewCount: actViewCount,
        }
      })

    const mappedChapters = rawChapters
      .sort((a: any, b: any) => (a.chapter_number || 0) - (b.chapter_number || 0))
      .map((ch: any) => {
        const parentAct = mappedActs.find((a: any) => a.id === ch.act_id)
        return {
          id: ch.id,
          number: ch.chapter_number,
          title: ch.title,
          subtitle: ch.subtitle || '',
          bannerImage: ch.banner_image_path || undefined,
          actId: ch.act_id,
          actNumber: parentAct ? parentAct.number : 1,
          actTitle: parentAct ? parentAct.title : undefined,
          status: ch.status || 'published',
          wordCount: ch.word_count || 0,
          readTimeMinutes: ch.reading_time_minutes || 1,
          viewCount: Number(ch.view_count || 0),
          publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
          content: ch.content || '',
        }
      })

    const authorObj = (data as any).author
    const categoryObj = (data as any).category

    return {
      id: data.id,
      title: data.title,
      slug: data.slug || '',
      subtitle: '',
      cover:
        data.cover_image_path ||
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      category: categoryObj?.name || 'Novels',
      categorySlug: categoryObj?.slug || 'novels',
      genre: 'Literary Fiction',
      genreSlug: 'literary-fiction',
      tags: ['Serialized', 'Archival'],
      language: data.language || 'English',
      status: mappedStatus,
      visibility: (data.visibility === 'public' ? 'Public' : 'Unlisted') as any,
      isMature: false,
      featured: true,
      trending: false,
      rising: false,
      editorPick: false,
      synopsis: data.description || '',
      fullDescription: data.description || '',
      chaptersCount: mappedChapters.length || data.chapter_count || 1,
      publishedChaptersCount: mappedChapters.filter((c: any) => c.status === 'published').length || 1,
      totalReads: String(data.view_count || '0'),
      totalSaves: Number(data.save_count || 0),
      ratingScore: 5.0,
      ratingCount: 0,
      createdAt: data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString(),
      updatedAt: data.updated_at ? new Date(data.updated_at).toISOString() : new Date().toISOString(),
      lastActivityAt: data.last_activity_at ? new Date(data.last_activity_at).toISOString() : data.created_at,
      author: {
        id: authorObj?.id || 'author-unknown',
        name: authorObj?.display_name || 'Hatchpen Author',
        handle: authorObj?.username || 'author',
        avatar:
          authorObj?.avatar_path ||
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        bio: authorObj?.bio || '',
        location: '',
        worksCount: 1,
        followersCount: 0,
        totalReads: String(data.view_count || '0'),
      },
      acts: mappedActs,
      chapters: mappedChapters,
    }
  })

/**
 * Server Function: Get a public author profile by ID or handle.
 */
export const getPublicAuthorServerFn = createServerFn({ method: 'GET' })
  .validator((idOrHandle: string) => {
    if (typeof idOrHandle !== 'string' || !idOrHandle.trim()) {
      throw new Error('Valid author identifier is required')
    }
    return idOrHandle.trim()
  })
  .handler(async ({ data: idOrHandle }) => {
    const { supabase } = await import('../lib/supabase/client')
    const clean = idOrHandle.trim().toLowerCase()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_path, bio, location, is_verified')

    if (isUuid) {
      query = query.or(`id.eq.${clean},username.eq.${clean}`)
    } else {
      query = query.eq('username', clean)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return null

    // Query live followers and authored works count
    const [{ count: followersCount }, { count: worksCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', data.id),
      supabase.from('works').select('*', { count: 'exact', head: true }).eq('author_id', data.id),
    ])

    return {
      id: data.id,
      name: data.display_name,
      handle: data.username,
      avatar:
        data.avatar_path ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bio: data.bio || '',
      location: data.location || '',
      worksCount: worksCount ?? 1,
      followersCount: followersCount ?? 0,
      totalReads: '0',
      verified: Boolean(data.is_verified),
    }
  })

/**
 * Server Function: Get paginated discovery feed.
 * Enforces pagination limits (max 50) and filters.
 */
export const getDiscoverWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params?: { categoryId?: string; status?: WorkStatus; limit?: number; offset?: number }) => {
    const limit = Math.min(Math.max(1, params?.limit || 20), 50)
    const offset = Math.max(0, params?.offset || 0)
    return {
      categoryId: params?.categoryId,
      status: params?.status,
      limit,
      offset,
    }
  })
  .handler(async ({ data }) => {
    return await getDiscoverWorks(data)
  })

/**
 * Server Function: Create a new Work draft in Writer Studio.
 * Validates inputs and creates a minimal draft.
 */
export const createWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    authorProfileId: string
    title: string
    slug: string
    description?: string
    cover_image_path?: string
    category_id?: string
    language?: string
  }) => {
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    if (!payload.title || payload.title.trim().length < 2) throw new Error('Title must be at least 2 characters')
    if (!payload.slug || payload.slug.trim().length < 2) throw new Error('Slug must be at least 2 characters')

    return {
      ...payload,
      title: payload.title.trim(),
      slug: payload.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    }
  })
  .handler(async ({ data }) => {
    return await createWork(data.authorProfileId, data)
  })

/**
 * Server Function: Update an existing Work.
 * Enforces IDOR protection by checking authorProfileId.
 */
export const updateWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: {
    workId: string
    authorProfileId: string
    updates: {
      title?: string
      description?: string
      cover_image_path?: string
      category_id?: string
    }
  }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    return await updateWork(data.workId, data.authorProfileId, data.updates)
  })

/**
 * Server Function: Publish a Work.
 * Enforces author IDOR check and triggers background content moderation if configured.
 */
export const publishWorkServerFn = createServerFn({ method: 'POST' })
  .validator((payload: { workId: string; authorProfileId: string; visibility?: 'public' | 'unlisted' }) => {
    if (!payload.workId) throw new Error('Work ID is required')
    if (!payload.authorProfileId) throw new Error('Author profile ID is required')
    return payload
  })
  .handler(async ({ data }) => {
    const published = await publishWork(data.workId, data.authorProfileId, data.visibility || 'public')

    // Optional background non-blocking invocation to content-moderation edge function
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/content-moderation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          targetType: 'work',
          targetId: data.workId,
          content: `${published?.title || ''}\n${published?.description || ''}`,
        }),
      }).catch((err) => {
        // Log background error without interrupting user response
        console.warn('[publishWorkServerFn] Non-blocking moderation trigger error:', err?.message)
      })
    }

    return published
  })

/**
 * Server Function: Get all published works with dynamic collection attributes.
 * Backed directly by PostgreSQL works_with_collections view.
 * Exposes new_this_week, new_chapters_this_week, and collection string array.
 */
export const getPlatformWorksServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    try {
      const q = `
        SELECT
          w.id,
          w.title,
          w.slug,
          w.description,
          w.cover_image_path,
          w.status,
          w.visibility,
          w.publication_status,
          w.word_count,
          w.chapter_count,
          w.reading_time_minutes,
          w.view_count,
          w.like_count,
          w.save_count,
          w.created_at,
          w.updated_at,
          w.last_activity_at,
          w.last_activity_type,
          w.last_activity_detail,
          w.new_this_week,
          w.new_chapters_this_week,
          w.collections,
          p.id AS author_id,
          p.display_name AS author_name,
          p.username AS author_handle,
          p.avatar_path AS author_avatar,
          p.bio AS author_bio,
          c.name AS category_name,
          c.slug AS category_slug,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', a.id,
                  'workId', a.work_id,
                  'number', a.act_number,
                  'title', a.title,
                  'slug', a.slug,
                  'description', a.description,
                  'status', a.status,
                  'chapters', COALESCE(
                    (
                      SELECT json_agg(
                        json_build_object(
                          'id', ch.id,
                          'workId', ch.work_id,
                          'number', ch.chapter_number,
                          'title', ch.title,
                          'slug', ch.slug,
                          'content', ch.content,
                          'wordCount', ch.word_count,
                          'readTimeMinutes', ch.reading_time_minutes,
                          'status', ch.status,
                          'publishedAt', ch.published_at,
                          'actId', ch.act_id,
                          'actNumber', a.act_number,
                          'actTitle', a.title
                        ) ORDER BY ch.chapter_number ASC
                      )
                      FROM chapters ch
                      WHERE ch.act_id = a.id
                    ),
                    '[]'
                  )
                ) ORDER BY a.act_number ASC
              )
              FROM acts a
              WHERE a.work_id = w.id
            ),
            '[]'
          ) AS acts,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ch.id,
                  'workId', ch.work_id,
                  'number', ch.chapter_number,
                  'title', ch.title,
                  'slug', ch.slug,
                  'content', ch.content,
                  'wordCount', ch.word_count,
                  'readTimeMinutes', ch.reading_time_minutes,
                  'status', ch.status,
                  'publishedAt', ch.published_at,
                  'actId', ch.act_id
                ) ORDER BY ch.chapter_number ASC
              )
              FROM chapters ch
              WHERE ch.work_id = w.id
            ),
            '[]'
          ) AS chapters
        FROM works_with_collections w
        LEFT JOIN profiles p ON p.id = w.author_id
        LEFT JOIN categories c ON c.id = w.category_id
        WHERE w.visibility = 'public' AND w.publication_status = 'published'
        ORDER BY w.last_activity_at DESC NULLS LAST;
      `

      // Use pg client via service connection for complex lateral aggregates
      const { Client } = await import('pg')
      const client = new Client({
        connectionString:
          process.env.DATABASE_URL ||
          'postgresql://postgres:cvp1EbYv4LR4fkiV@db.amplbczsaqtleoshttsb.supabase.co:5432/postgres',
      })
      await client.connect()
      const res = await client.query(q)
      await client.end()

      return (res.rows || []).map((row: any) => {
        let mappedStatus: 'Ongoing' | 'Completed' | 'On Hiatus' | 'Cancelled' = 'Ongoing'
        if (row.status === 'completed') mappedStatus = 'Completed'
        else if (row.status === 'on_hiatus') mappedStatus = 'On Hiatus'
        else if (row.status === 'cancelled') mappedStatus = 'Cancelled'

        return {
          id: row.id,
          title: row.title,
          slug: row.slug || '',
          subtitle: '',
          cover: row.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
          category: row.category_name || 'Novels',
          categorySlug: row.category_slug || 'novels',
          genre: 'Literary Fiction',
          genreSlug: 'literary-fiction',
          tags: ['Serialized', 'Archival'],
          language: row.language || 'English',
          status: mappedStatus,
          visibility: (row.visibility === 'public' ? 'Public' : 'Unlisted') as any,
          isMature: false,
          featured: true,
          trending: (row.collections || []).includes('trending_now'),
          rising: (row.collections || []).includes('rising_stories'),
          editorPick: (row.collections || []).includes('editor_picks'),
          new_this_week: Boolean(row.new_this_week),
          new_chapters_this_week: Boolean(row.new_chapters_this_week),
          collection: row.collections || [],
          synopsis: row.description || '',
          fullDescription: row.description || '',
          chaptersCount: row.chapters?.length || row.chapter_count || 1,
          publishedChaptersCount: (row.chapters || []).filter((c: any) => c.status === 'published').length || 1,
          totalReads: String(row.view_count || '0'),
          totalSaves: Number(row.save_count || 0),
          ratingScore: 5.0,
          ratingCount: 0,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at).toISOString() : row.created_at,
          lastActivityType: row.last_activity_type,
          lastActivityDetail: row.last_activity_detail,
          author: {
            id: row.author_id || 'author-unknown',
            name: row.author_name || 'Hatchpen Author',
            handle: row.author_handle || 'author',
            avatar: row.author_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
            bio: row.author_bio || '',
            location: '',
            worksCount: 1,
            followersCount: '0',
          },
          acts: row.acts || [],
          chapters: row.chapters || [],
        }
      })
    } catch (err: any) {
      console.warn('[getPlatformWorksServerFn] Fallback / error fetching DB works:', err?.message)
      return []
    }
  })

/**
 * Server Function: Track view strictly with zero duplicates across 3 layers:
 * 1. Book View: Triggered once per viewer per work (increments works.view_count)
 * 2. Chapter View: Triggered once per viewer per chapter (increments chapters.view_count)
 * 3. Act View: Implicitly computed as sum of its chapters' views
 */
export const trackStrictViewServerFn = createServerFn({ method: 'POST' })
  .validator((params: { viewerKey: string; workId: string; chapterId?: string }) => {
    if (!params.viewerKey || !params.viewerKey.trim()) {
      throw new Error('Viewer key is required for deduplication')
    }
    if (!params.workId || !params.workId.trim()) {
      throw new Error('Work ID is required')
    }
    return {
      viewerKey: params.viewerKey.trim(),
      workId: params.workId.trim(),
      chapterId: params.chapterId?.trim() || undefined,
    }
  })
  .handler(async ({ data: { viewerKey, workId, chapterId } }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve work UUID if passed as slug
    let targetWorkUuid = workId
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workId)
    if (!isUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', workId).maybeSingle()
      if (wRow?.id) targetWorkUuid = wRow.id
      else return { success: false, message: 'Work not found' }
    }

    let isNewWorkView = false
    let isNewChapterView = false

    // 2. Strict Book-level View Deduplication
    try {
      const { error: insertWorkErr } = await admin.from('unique_views').insert({
        viewer_key: viewerKey,
        work_id: targetWorkUuid,
        chapter_id: null,
        view_type: 'work',
      })

      // If insert succeeds without duplicate key violation (23505), increment work view_count
      if (!insertWorkErr) {
        isNewWorkView = true
        const { data: currentWork } = await admin.from('works').select('view_count').eq('id', targetWorkUuid).single()
        const newWorkViews = (currentWork?.view_count || 0) + 1
        await admin.from('works').update({ view_count: newWorkViews }).eq('id', targetWorkUuid)
      }
    } catch (e: any) {
      // Duplicate constraint caught safely - no increment
    }

    // 3. Strict Chapter-level View Deduplication
    if (chapterId) {
      let targetChapterUuid = chapterId
      const isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId)
      if (!isChapterUuid) {
        const { data: chRow } = await admin.from('chapters').select('id').eq('work_id', targetWorkUuid).eq('slug', chapterId).maybeSingle()
        if (chRow?.id) targetChapterUuid = chRow.id
      }

      try {
        const { error: insertChErr } = await admin.from('unique_views').insert({
          viewer_key: viewerKey,
          work_id: targetWorkUuid,
          chapter_id: targetChapterUuid,
          view_type: 'chapter',
        })

        if (!insertChErr) {
          isNewChapterView = true
          const { data: currentChapter } = await admin.from('chapters').select('view_count').eq('id', targetChapterUuid).single()
          const newChViews = (currentChapter?.view_count || 0) + 1
          await admin.from('chapters').update({ view_count: newChViews }).eq('id', targetChapterUuid)
        }
      } catch (e: any) {
        // Duplicate chapter view caught safely - no increment
      }
    }

    return {
      success: true,
      isNewWorkView,
      isNewChapterView,
    }
  })

/**
 * Server Function: Get all bookmarked work IDs for an authenticated user from PostgreSQL DB.
 */
export const getUserBookmarksServerFn = createServerFn({ method: 'GET' })
  .validator((clerkUserId: string) => {
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required')
    }
    return clerkUserId.trim()
  })
  .handler(async ({ data: clerkUserId }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve user profile ID from Clerk user ID
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle()

    if (!profile?.id) {
      return { bookmarkIds: [] }
    }

    // 2. Fetch all bookmarked work IDs from bookmarks table
    const { data: bookmarks, error } = await admin
      .from('bookmarks')
      .select('work_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getUserBookmarksServerFn] DB Error:', error.message)
      return { bookmarkIds: [] }
    }

    return {
      bookmarkIds: (bookmarks || []).map((b) => b.work_id),
    }
  })

/**
 * Server Function: Toggle bookmark (add/remove) in PostgreSQL DB for authenticated user.
 */
export const toggleBookmarkServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; workId: string }) => {
    if (!params.clerkUserId || typeof params.clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required')
    }
    if (!params.workId || typeof params.workId !== 'string') {
      throw new Error('Valid workId is required')
    }
    return {
      clerkUserId: params.clerkUserId.trim(),
      workId: params.workId.trim(),
    }
  })
  .handler(async ({ data }) => {
    const { createAdminClient } = await import('../lib/supabase/server')
    const admin = createAdminClient()

    // 1. Resolve user profile ID
    let { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', data.clerkUserId)
      .maybeSingle()

    if (!profile?.id) {
      // Auto-create/upsert minimal profile if not yet created
      const minimalUsername = `user_${data.clerkUserId.slice(0, 8)}`
      const { data: newProfile, error: createErr } = await admin
        .from('profiles')
        .upsert(
          {
            clerk_user_id: data.clerkUserId,
            username: minimalUsername,
            display_name: 'Tellnest Reader',
            is_public: true,
          },
          { onConflict: 'clerk_user_id' }
        )
        .select('id')
        .single()

      if (createErr || !newProfile) {
        throw new Error(`Failed to resolve user profile: ${createErr?.message}`)
      }
      profile = newProfile
    }

    // 2. Check if already bookmarked in DB
    const { data: existing } = await admin
      .from('bookmarks')
      .select('id')
      .eq('user_id', profile.id)
      .eq('work_id', data.workId)
      .maybeSingle()

    let isSaved = false

    if (existing) {
      // Remove bookmark from DB
      await admin
        .from('bookmarks')
        .delete()
        .eq('user_id', profile.id)
        .eq('work_id', data.workId)
      isSaved = false

      // Decrement work save_count safely if work is a DB UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (isUuid) {
        const { data: workRow } = await admin.from('works').select('save_count').eq('id', data.workId).maybeSingle()
        if (workRow) {
          const newCount = Math.max(0, (workRow.save_count || 0) - 1)
          await admin.from('works').update({ save_count: newCount }).eq('id', data.workId)
        }
      }
    } else {
      // Add bookmark to DB
      await admin.from('bookmarks').insert({
        user_id: profile.id,
        work_id: data.workId,
      })
      isSaved = true

      // Increment work save_count safely if work is a DB UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
      if (isUuid) {
        const { data: workRow } = await admin.from('works').select('save_count').eq('id', data.workId).maybeSingle()
        if (workRow) {
          const newCount = (workRow.save_count || 0) + 1
          await admin.from('works').update({ save_count: newCount }).eq('id', data.workId)
        }
      }
    }

    // Return updated list of bookmark IDs for this user
    const { data: allUserBookmarks } = await admin
      .from('bookmarks')
      .select('work_id')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    return {
      success: true,
      isSaved,
      bookmarkIds: (allUserBookmarks || []).map((b) => b.work_id),
    }
  })

// Server in-memory cache for Cloudinary platform assets (1 hour TTL)
interface CloudinaryCacheEntry {
  assets: Array<{
    publicId: string
    secureUrl: string
    assetFolder: string
    format: string
    width?: number
    height?: number
    aspectRatio?: number
    createdAt?: string
  }>
  timestamp: number
}

const CLOUDINARY_ASSETS_CACHE: Record<string, CloudinaryCacheEntry> = {}
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Server Function: Fetch platform-defined curated images from Cloudinary folders
 * (e.g. 'book_cover' and 'banner' asset folders) using the Cloudinary Admin Search API.
 * Uses 1-hour in-memory cache to save Cloudinary API limits, with forceRefresh capability.
 */
export const getCloudinaryPlatformAssetsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { folder: 'book_cover' | 'banner' | 'all'; forceRefresh?: boolean } | 'book_cover' | 'banner' | 'all') => {
    if (typeof params === 'string') {
      return { folder: params, forceRefresh: false }
    }
    return {
      folder: params?.folder || 'book_cover',
      forceRefresh: Boolean(params?.forceRefresh),
    }
  })
  .handler(async ({ data }) => {
    const { folder, forceRefresh } = data
    const cacheKey = folder

    // 1. Check server-side memory cache
    if (!forceRefresh) {
      const cached = CLOUDINARY_ASSETS_CACHE[cacheKey]
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { assets: cached.assets, fromCache: true }
      }
    }

    const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || 'pxluxw9a'
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!apiKey || !apiSecret) {
      console.warn('[getCloudinaryPlatformAssetsServerFn] Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET')
      return { assets: [] }
    }

    try {
      const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
      let expression = 'asset_folder:book_cover'
      if (folder === 'banner') {
        expression = 'asset_folder:banner'
      } else if (folder === 'all') {
        expression = 'asset_folder:book_cover OR asset_folder:banner'
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression,
          max_results: 100,
          sort_by: [{ created_at: 'desc' }],
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('[getCloudinaryPlatformAssetsServerFn] Search API Error:', errText)
        // If API fails, fall back to existing cache if available
        if (CLOUDINARY_ASSETS_CACHE[cacheKey]) {
          return { assets: CLOUDINARY_ASSETS_CACHE[cacheKey].assets, fromCache: true }
        }
        return { assets: [] }
      }

      const resData = await res.json()
      const assets = (resData.resources || []).map((r: any) => ({
        publicId: r.public_id,
        secureUrl: r.secure_url,
        assetFolder: r.asset_folder || (folder === 'banner' ? 'banner' : 'book_cover'),
        format: r.format,
        width: r.width,
        height: r.height,
        aspectRatio: r.aspect_ratio,
        createdAt: r.created_at,
      }))

      // Store in memory cache
      CLOUDINARY_ASSETS_CACHE[cacheKey] = {
        assets,
        timestamp: Date.now(),
      }

      return { assets, fromCache: false }
    } catch (err: any) {
      console.error('[getCloudinaryPlatformAssetsServerFn] Error:', err.message)
      if (CLOUDINARY_ASSETS_CACHE[cacheKey]) {
        return { assets: CLOUDINARY_ASSETS_CACHE[cacheKey].assets, fromCache: true }
      }
      return { assets: [] }
    }
  })

