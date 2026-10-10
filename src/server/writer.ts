import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server'

/**
 * Helper to resolve or auto-provision a profile row for the authenticated Clerk user.
 */
async function resolveUserProfile(admin: any, clerkUserId: string) {
  let { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_path')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!profile?.id) {
    const minimalUsername = `author_${clerkUserId.slice(0, 8)}`
    const { data: newProfile, error: createErr } = await admin
      .from('profiles')
      .upsert(
        {
          clerk_user_id: clerkUserId,
          username: minimalUsername,
          display_name: 'Author',
          is_public: true,
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id, username, display_name, avatar_path')
      .single()

    if (createErr || !newProfile) {
      throw new Error(`Failed to resolve writer profile: ${createErr?.message}`)
    }
    profile = newProfile
  }

  return profile
}

export interface WriterWorkListItem {
  id: string
  title: string
  slug: string
  cover: string
  status: 'Published' | 'Draft' | 'Archived'
  category: string
  categorySlug: string
  genre: string
  genreSlug: string
  chaptersCount: number
  totalReads: string
  totalSaves: number
  lastUpdated: string
}

export interface GetWriterWorksResponse {
  works: WriterWorkListItem[]
  totalReads: number
  totalSaves: number
  activeDraftsCount: number
}

/**
 * 1. Fetch writer's own manuscripts directly from PostgreSQL
 */
export const getWriterWorksServerFn = createServerFn({ method: 'GET' })
  .validator((params: { clerkUserId: string } | string) => {
    const clerkUserId = typeof params === 'string' ? params : params?.clerkUserId
    if (!clerkUserId || typeof clerkUserId !== 'string') {
      throw new Error('Authenticated user ID is required')
    }
    return { clerkUserId: clerkUserId.trim() }
  })
  .handler(async ({ data }): Promise<GetWriterWorksResponse> => {
    const admin = createAdminClient()
    const profile = await resolveUserProfile(admin, data.clerkUserId)

    // Fetch works authored by this user
    const { data: dbWorks, error } = await admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        status,
        visibility,
        publication_status,
        chapter_count,
        word_count,
        view_count,
        save_count,
        created_at,
        updated_at,
        last_activity_at,
        category:categories(id, name, slug)
      `)
      .eq('author_id', profile.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[getWriterWorksServerFn] Error loading writer works:', error.message)
      throw new Error(error.message)
    }

    let aggregatedReads = 0
    let aggregatedSaves = 0
    let activeDraftsCount = 0

    const works: WriterWorkListItem[] = (dbWorks || []).map((w: any) => {
      const catObj = Array.isArray(w.category) ? w.category[0] : w.category
      const viewCountNum = Number(w.view_count || 0)
      const saveCountNum = Number(w.save_count || 0)
      aggregatedReads += viewCountNum
      aggregatedSaves += saveCountNum

      // Map status
      let uiStatus: 'Published' | 'Draft' | 'Archived' = 'Draft'
      if (w.publication_status === 'published' || w.visibility === 'public') {
        uiStatus = 'Published'
      } else if (w.publication_status === 'archived') {
        uiStatus = 'Archived'
      } else {
        uiStatus = 'Draft'
      }

      if (uiStatus === 'Draft') {
        activeDraftsCount++
      }

      const updatedDate = w.last_activity_at || w.updated_at || w.created_at
      const formattedDate = updatedDate ? new Date(updatedDate).toLocaleDateString() : 'Recently'

      return {
        id: w.id,
        title: w.title,
        slug: w.slug,
        cover: w.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
        status: uiStatus,
        category: catObj?.name || 'Novels',
        categorySlug: catObj?.slug || 'novels',
        genre: 'Literary Fiction',
        genreSlug: 'literary-fiction',
        chaptersCount: w.chapter_count || 0,
        totalReads: viewCountNum.toLocaleString(),
        totalSaves: saveCountNum,
        lastUpdated: formattedDate,
      }
    })

    return {
      works,
      totalReads: aggregatedReads,
      totalSaves: aggregatedSaves,
      activeDraftsCount,
    }
  })

export interface CreateWriterWorkPayload {
  clerkUserId: string
  title: string
  subtitle?: string
  description?: string
  categoryName?: string
  genreName?: string
  cover?: string
  tags?: string[]
  language?: string
  status?: 'Ongoing' | 'Completed'
  visibility?: 'Public' | 'Unlisted' | 'Draft'
}

/**
 * 2. Create a new manuscript directly in PostgreSQL with an initial Chapter 1
 */
export const createWriterWorkServerFn = createServerFn({ method: 'POST' })
  .validator((params: CreateWriterWorkPayload) => {
    if (!params.clerkUserId) throw new Error('User authentication required')
    if (!params.title?.trim()) throw new Error('Manuscript title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const profile = await resolveUserProfile(admin, data.clerkUserId)
    const nowIso = new Date().toISOString()

    // 1. Resolve Category ID
    let categoryId: string | null = null
    if (data.categoryName) {
      const { data: catData } = await admin
        .from('categories')
        .select('id')
        .ilike('name', data.categoryName.trim())
        .maybeSingle()
      if (catData?.id) categoryId = catData.id
    }
    if (!categoryId) {
      const { data: firstCat } = await admin.from('categories').select('id').limit(1).maybeSingle()
      if (firstCat?.id) categoryId = firstCat.id
    }

    // 2. Generate slug
    const baseSlug = data.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'manuscript'
    const uniqueSuffix = Math.random().toString(36).substring(2, 7)
    const slug = `${baseSlug}-${uniqueSuffix}`

    // 3. Map status & visibility to postgres enums
    const mappedStatus = data.status?.toLowerCase() === 'completed' ? 'completed' : 'ongoing'
    let mappedVisibility: 'draft' | 'private' | 'unlisted' | 'public' = 'public'
    let mappedPublicationStatus: 'draft' | 'published' | 'archived' = 'published'

    if (data.visibility === 'Draft') {
      mappedVisibility = 'draft'
      mappedPublicationStatus = 'draft'
    } else if (data.visibility === 'Unlisted') {
      mappedVisibility = 'unlisted'
      mappedPublicationStatus = 'published'
    }

    // 4. Insert Work into works table
    const { data: newWork, error: workErr } = await admin
      .from('works')
      .insert({
        author_id: profile.id,
        title: data.title.trim(),
        slug,
        description: data.description?.trim() || null,
        cover_image_path: data.cover?.trim() || null,
        language: data.language || 'English',
        category_id: categoryId,
        status: mappedStatus,
        visibility: mappedVisibility,
        publication_status: mappedPublicationStatus,
        is_indexable: mappedVisibility === 'public',
        content_rating: 'general',
        content_warning_required: false,
        reading_time_minutes: 5,
        word_count: 1250,
        chapter_count: 1,
        view_count: 0,
        like_count: 0,
        save_count: 0,
        comment_count: 0,
        published_at: mappedPublicationStatus === 'published' ? nowIso : null,
        last_published_at: mappedPublicationStatus === 'published' ? nowIso : null,
        created_at: nowIso,
        updated_at: nowIso,
        last_activity_at: nowIso,
        last_activity_type: 'work_created',
        last_activity_detail: {
          title: data.title.trim(),
          createdAt: nowIso,
          summaryText: 'Manuscript registered',
        },
      })
      .select('id, slug, title')
      .single()

    if (workErr || !newWork) {
      console.error('[createWriterWorkServerFn] Work insert failed:', workErr?.message)
      throw new Error(`Failed to create manuscript: ${workErr?.message}`)
    }

    // 5. Insert Act 1 into acts table
    const { data: actRow } = await admin
      .from('acts')
      .insert({
        work_id: newWork.id,
        act_number: 1,
        title: 'Act I',
        slug: `act-1-${uniqueSuffix}`,
        description: 'First Movement',
        status: 'published',
        display_order: 1,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id')
      .single()

    // 6. Insert initial Chapter 1
    const initialChapterContent =
      'The morning arrived without sound, wrapping the city in a cold silver fog that swallowed the tops of the towers...'
    const initialWordCount = initialChapterContent.trim().split(/\s+/).filter(Boolean).length
    const initialReadingTime = Math.max(1, Math.ceil(initialWordCount / 220))

    const { data: newCh, error: chErr } = await admin
      .from('chapters')
      .insert({
        work_id: newWork.id,
        act_id: actRow?.id || null,
        chapter_number: 1,
        title: 'Chapter One',
        slug: `chapter-1-${uniqueSuffix}`,
        subtitle: data.subtitle?.trim() || 'The Beginning',
        content: initialChapterContent,
        word_count: initialWordCount,
        reading_time_minutes: initialReadingTime,
        status: mappedPublicationStatus === 'published' ? 'published' : 'draft',
        is_indexable: mappedVisibility === 'public',
        view_count: 0,
        published_at: mappedPublicationStatus === 'published' ? nowIso : null,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('id, title, chapter_number')
      .single()

    if (chErr) {
      console.warn('[createWriterWorkServerFn] Initial chapter creation warning:', chErr.message)
    }

    return {
      success: true,
      workId: newWork.id,
      slug: newWork.slug,
      chapterId: newCh?.id,
    }
  })

/**
 * 3. Fetch detailed manuscript data (work + chapters + acts) for Manage & Editor pages
 */
export const getWriterWorkDetailsServerFn = createServerFn({ method: 'GET' })
  .validator((params: { workId: string; clerkUserId?: string } | string) => {
    const rawWorkId = typeof params === 'string' ? params : params?.workId
    const clerkUserId = typeof params === 'string' ? undefined : params?.clerkUserId
    if (!rawWorkId) throw new Error('Work identifier is required')
    return { workId: rawWorkId.trim(), clerkUserId }
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const clean = data.workId.toLowerCase()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)

    let query = admin
      .from('works')
      .select(`
        id,
        title,
        slug,
        description,
        cover_image_path,
        status,
        visibility,
        publication_status,
        language,
        word_count,
        chapter_count,
        view_count,
        save_count,
        reading_time_minutes,
        created_at,
        updated_at,
        last_activity_at,
        category:categories(id, name, slug),
        author:profiles(id, clerk_user_id, display_name, username, avatar_path)
      `)

    if (isUuid) {
      query = query.or(`id.eq.${clean},slug.eq.${clean}`)
    } else {
      query = query.eq('slug', clean)
    }

    const { data: dbWork, error } = await query.maybeSingle()

    if (error || !dbWork) {
      console.warn('[getWriterWorkDetailsServerFn] Work not found:', data.workId)
      return null
    }

    // Fetch acts
    const { data: dbActs } = await admin
      .from('acts')
      .select('*')
      .eq('work_id', dbWork.id)
      .order('act_number', { ascending: true })

    // Fetch chapters
    const { data: dbChapters } = await admin
      .from('chapters')
      .select('*')
      .eq('work_id', dbWork.id)
      .order('chapter_number', { ascending: true })

    const categoryObj = Array.isArray(dbWork.category) ? dbWork.category[0] : dbWork.category
    const authorObj = Array.isArray(dbWork.author) ? dbWork.author[0] : dbWork.author

    const acts = (dbActs || []).map((a: any) => ({
      id: a.id,
      number: a.act_number,
      title: a.title,
      slug: a.slug,
      description: a.description || '',
      status: a.status || 'published',
    }))

    const chapters = (dbChapters || []).map((ch: any) => {
      const parentAct = acts.find((a: any) => a.id === ch.act_id)
      return {
        id: ch.id,
        number: ch.chapter_number,
        title: ch.title,
        subtitle: ch.subtitle || '',
        bannerImage: ch.banner_image_path || undefined,
        actId: ch.act_id,
        actNumber: parentAct ? parentAct.number : 1,
        actTitle: parentAct ? parentAct.title : undefined,
        status: (ch.status === 'published' ? 'published' : 'draft') as 'published' | 'draft',
        wordCount: ch.word_count || 0,
        readTimeMinutes: ch.reading_time_minutes || 1,
        viewCount: Number(ch.view_count || 0),
        publishedAt: ch.published_at ? new Date(ch.published_at).toLocaleDateString() : undefined,
        content: ch.content || '',
      }
    })

    return {
      id: dbWork.id,
      title: dbWork.title,
      slug: dbWork.slug,
      subtitle: '',
      cover: dbWork.cover_image_path || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      category: categoryObj?.name || 'Novels',
      categorySlug: categoryObj?.slug || 'novels',
      genre: 'Literary Fiction',
      genreSlug: 'literary-fiction',
      tags: ['Serialized'],
      language: dbWork.language || 'English',
      status: dbWork.status === 'completed' ? 'Completed' : 'Ongoing',
      visibility: (dbWork.visibility === 'public' ? 'Public' : 'Unlisted') as any,
      isMature: false,
      synopsis: dbWork.description || '',
      fullDescription: dbWork.description || '',
      chaptersCount: chapters.length,
      publishedChaptersCount: chapters.filter((c: any) => c.status === 'published').length,
      totalReads: Number(dbWork.view_count || 0).toLocaleString(),
      totalSaves: Number(dbWork.save_count || 0),
      ratingScore: 5.0,
      ratingCount: 1,
      createdAt: dbWork.created_at ? new Date(dbWork.created_at).toLocaleDateString() : 'Recently',
      updatedAt: dbWork.updated_at ? new Date(dbWork.updated_at).toLocaleDateString() : 'Recently',
      author: {
        id: authorObj?.id || 'unknown',
        name: authorObj?.display_name || authorObj?.username || 'Author',
        handle: authorObj?.username || 'author',
        avatar: authorObj?.avatar_path || '/unisex-avatar.svg',
        bio: 'Author',
        worksCount: 1,
        followersCount: 0,
        totalReads: '0',
        verified: false,
      },
      acts,
      chapters,
    }
  })

export interface SaveWriterChapterPayload {
  workId: string
  chapterId: string
  title: string
  subtitle?: string
  content: string
  status?: 'draft' | 'published'
  bannerImage?: string | null
}

/**
 * 4. Save/Autosave chapter content, word counts, reading time, and status to PostgreSQL
 */
export const saveWriterChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: SaveWriterChapterPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.chapterId?.trim()) throw new Error('Chapter ID is required')
    if (!params.title?.trim()) throw new Error('Chapter title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()
    const wordCount = data.content.trim().split(/\s+/).filter(Boolean).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 220))
    const status = data.status || 'draft'

    // 1. Resolve work ID (if passed as slug)
    let workUuid = data.workId
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    }

    // 2. Check if chapter exists by ID (UUID check)
    const isChapterUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.chapterId)

    if (isChapterUuid) {
      const updateData: Record<string, any> = {
        title: data.title.trim(),
        subtitle: data.subtitle?.trim() || null,
        content: data.content,
        word_count: wordCount,
        reading_time_minutes: readingTime,
        status,
        updated_at: nowIso,
      }
      if (status === 'published') {
        updateData.published_at = nowIso
      }
      if (data.bannerImage !== undefined) {
        updateData.banner_image_path = data.bannerImage?.trim() || null
      }

      const { error: chErr } = await admin
        .from('chapters')
        .update(updateData)
        .eq('id', data.chapterId)

      if (chErr) {
        console.error('[saveWriterChapterServerFn] Error updating chapter in DB:', chErr.message)
        throw new Error(chErr.message)
      }
    } else {
      // If chapter was created optimistically with non-UUID, insert into DB
      const { data: existingChs } = await admin
        .from('chapters')
        .select('chapter_number')
        .eq('work_id', workUuid)
        .order('chapter_number', { ascending: false })
        .limit(1)

      const nextNum = (existingChs?.[0]?.chapter_number || 0) + 1
      const uniqueSuffix = Math.random().toString(36).substring(2, 6)
      const chSlug = `ch-${nextNum}-${uniqueSuffix}`

      const { data: newCh, error: insertErr } = await admin
        .from('chapters')
        .insert({
          work_id: workUuid,
          chapter_number: nextNum,
          title: data.title.trim(),
          subtitle: data.subtitle?.trim() || null,
          slug: chSlug,
          content: data.content,
          word_count: wordCount,
          reading_time_minutes: readingTime,
          status,
          published_at: status === 'published' ? nowIso : null,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('[saveWriterChapterServerFn] Error inserting chapter into DB:', insertErr.message)
      }
    }

    // 3. Recalculate and update aggregate word count, chapter count, and last activity on works table
    const { data: allChs } = await admin
      .from('chapters')
      .select('word_count, reading_time_minutes')
      .eq('work_id', workUuid)

    if (allChs) {
      const totalWords = allChs.reduce((sum, c) => sum + (c.word_count || 0), 0)
      const totalMinutes = allChs.reduce((sum, c) => sum + (c.reading_time_minutes || 0), 0)

      await admin
        .from('works')
        .update({
          word_count: totalWords,
          chapter_count: allChs.length,
          reading_time_minutes: totalMinutes,
          last_activity_at: nowIso,
          last_activity_type: status === 'published' ? 'chapter_published' : 'chapter_updated',
          last_activity_detail: {
            chapterTitle: data.title.trim(),
            updatedAt: nowIso,
            summaryText: `Chapter "${data.title.trim()}" ${status === 'published' ? 'published' : 'updated'}`,
          },
          updated_at: nowIso,
        })
        .eq('id', workUuid)
    }

    return {
      success: true,
      chapterId: data.chapterId,
      wordCount,
      readingTime,
      updatedAt: nowIso,
    }
  })

export interface CreateWriterChapterPayload {
  workId: string
  title: string
  actId?: string
}

/**
 * 5. Add a new chapter to a work directly in PostgreSQL
 */
export const createWriterChapterServerFn = createServerFn({ method: 'POST' })
  .validator((params: CreateWriterChapterPayload) => {
    if (!params.workId?.trim()) throw new Error('Work ID is required')
    if (!params.title?.trim()) throw new Error('Chapter title is required')
    return params
  })
  .handler(async ({ data }) => {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    // 1. Resolve work UUID
    let workUuid = data.workId
    const isWorkUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.workId)
    if (!isWorkUuid) {
      const { data: wRow } = await admin.from('works').select('id').eq('slug', data.workId).maybeSingle()
      if (wRow?.id) workUuid = wRow.id
    }

    // 2. Determine next chapter number
    const { data: existingChs } = await admin
      .from('chapters')
      .select('chapter_number')
      .eq('work_id', workUuid)
      .order('chapter_number', { ascending: false })

    const nextNumber = ((existingChs?.[0]?.chapter_number) || 0) + 1
    const uniqueSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `ch-${nextNumber}-${uniqueSuffix}`

    // 3. Resolve act_id if provided or default
    let actId: string | null = null
    if (data.actId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.actId)) {
      actId = data.actId
    } else {
      const { data: latestAct } = await admin
        .from('acts')
        .select('id')
        .eq('work_id', workUuid)
        .order('act_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latestAct?.id) actId = latestAct.id
    }

    const { data: createdCh, error: createErr } = await admin
      .from('chapters')
      .insert({
        work_id: workUuid,
        act_id: actId,
        chapter_number: nextNumber,
        title: data.title.trim(),
        slug,
        subtitle: '',
        content: '',
        word_count: 0,
        reading_time_minutes: 1,
        status: 'draft',
        is_indexable: false,
        view_count: 0,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (createErr || !createdCh) {
      console.error('[createWriterChapterServerFn] Error creating chapter:', createErr?.message)
      throw new Error(`Failed to create chapter: ${createErr?.message}`)
    }

    // 4. Update work's chapter_count and last activity
    const newCount = (existingChs?.length || 0) + 1
    await admin
      .from('works')
      .update({
        chapter_count: newCount,
        last_activity_at: nowIso,
        last_activity_type: 'chapter_drafted',
        last_activity_detail: {
          chapterId: createdCh.id,
          chapterNumber: nextNumber,
          chapterTitle: data.title.trim(),
          updatedAt: nowIso,
          summaryText: `Chapter ${nextNumber}: "${data.title.trim()}" drafted`,
        },
        updated_at: nowIso,
      })
      .eq('id', workUuid)

    return {
      success: true,
      chapter: {
        id: createdCh.id,
        number: createdCh.chapter_number,
        title: createdCh.title,
        subtitle: createdCh.subtitle || '',
        actId: createdCh.act_id,
        status: 'draft' as const,
        wordCount: 0,
        readTimeMinutes: 1,
        viewCount: 0,
        publishedAt: undefined,
        content: '',
      },
    }
  })
