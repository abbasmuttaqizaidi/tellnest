import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Helper to resolve profile from Clerk user ID
 */
async function resolveProfile(admin: any, clerkUserId: string) {
  let { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!profile?.id) {
    const minimalUsername = `reader_${clerkUserId.slice(0, 8)}`
    const { data: newProfile, error: createErr } = await admin
      .from('profiles')
      .upsert(
        {
          clerk_user_id: clerkUserId,
          username: minimalUsername,
          display_name: 'Reader',
          avatar_path: '/unisex-avatar.svg',
          is_public: true,
        },
        { onConflict: 'clerk_user_id' }
      )
      .select('id, username, display_name')
      .single()

    if (createErr || !newProfile) {
      throw new Error(`Failed to resolve reader profile: ${createErr?.message}`)
    }
    return newProfile
  }

  return profile
}

/**
 * Server Function: Get Chapter Heart status & count
 */
export const getChapterHeartStatusServerFn = createServerFn({ method: 'GET' })
  .validator(
    (params: {
      workId: string
      chapterId: string
      clerkUserId?: string | null
    }) => {
      if (!params.workId || !params.chapterId) {
        throw new Error('workId and chapterId are required')
      }
      return params
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork = UUID_REGEX.test(params.workId) && UUID_REGEX.test(params.chapterId)

    if (!isRealDbWork) {
      return {
        success: true,
        heartCount: 0,
        userHearted: false,
      }
    }

    const admin = createAdminClient()

    // 1. Fetch chapter like_count
    const { data: chapter } = await admin
      .from('chapters')
      .select('like_count')
      .eq('id', params.chapterId)
      .maybeSingle()

    const heartCount = Number(chapter?.like_count || 0)

    // 2. Check if current user has hearted
    let userHearted = false
    if (params.clerkUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', params.clerkUserId)
        .maybeSingle()

      if (profile?.id) {
        const { data: likeRecord } = await admin
          .from('chapter_likes')
          .select('id')
          .eq('chapter_id', params.chapterId)
          .eq('user_id', profile.id)
          .maybeSingle()

        userHearted = Boolean(likeRecord?.id)
      }
    }

    return {
      success: true,
      heartCount,
      userHearted,
    }
  })

/**
 * Server Function: Toggle Heart on a Chapter (Only authenticated users can heart)
 */
export const toggleChapterHeartServerFn = createServerFn({ method: 'POST' })
  .validator(
    (params: {
      clerkUserId: string
      workId: string
      chapterId: string
    }) => {
      if (!params.clerkUserId) {
        throw new Error('You must be signed in to heart this chapter.')
      }
      if (!params.workId || !params.chapterId) {
        throw new Error('workId and chapterId are required')
      }
      return params
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork = UUID_REGEX.test(params.workId) && UUID_REGEX.test(params.chapterId)

    if (!isRealDbWork) {
      return {
        success: true,
        hearted: true,
        heartCount: 1,
      }
    }

    const admin = createAdminClient()
    const profile = await resolveProfile(admin, params.clerkUserId)

    // Check if like exists
    const { data: existingLike } = await admin
      .from('chapter_likes')
      .select('id')
      .eq('chapter_id', params.chapterId)
      .eq('user_id', profile.id)
      .maybeSingle()

    let nextHearted = false

    if (existingLike?.id) {
      // Remove like
      await admin
        .from('chapter_likes')
        .delete()
        .eq('id', existingLike.id)
      nextHearted = false
    } else {
      // Add like
      await admin
        .from('chapter_likes')
        .insert({
          user_id: profile.id,
          work_id: params.workId,
          chapter_id: params.chapterId,
        })
      nextHearted = true
    }

    // Read updated count
    const { data: updatedChapter } = await admin
      .from('chapters')
      .select('like_count')
      .eq('id', params.chapterId)
      .maybeSingle()

    return {
      success: true,
      hearted: nextHearted,
      heartCount: Number(updatedChapter?.like_count || 0),
    }
  })

/**
 * Server Function: Get Work Heart status & total count
 */
export const getWorkHeartStatusServerFn = createServerFn({ method: 'GET' })
  .validator(
    (params: {
      workId: string
      clerkUserId?: string | null
    }) => {
      if (!params.workId) throw new Error('workId is required')
      return params
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork = UUID_REGEX.test(params.workId)

    if (!isRealDbWork) {
      return {
        success: true,
        heartCount: 0,
        userHearted: false,
      }
    }

    const admin = createAdminClient()

    // 1. Fetch work like_count
    const { data: work } = await admin
      .from('works')
      .select('like_count')
      .eq('id', params.workId)
      .maybeSingle()

    const heartCount = Number(work?.like_count || 0)

    let userHearted = false
    if (params.clerkUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', params.clerkUserId)
        .maybeSingle()

      if (profile?.id) {
        const { data: likeRecord } = await admin
          .from('work_likes')
          .select('id')
          .eq('work_id', params.workId)
          .eq('user_id', profile.id)
          .maybeSingle()

        userHearted = Boolean(likeRecord?.id)
      }
    }

    return {
      success: true,
      heartCount,
      userHearted,
    }
  })

/**
 * Server Function: Toggle Heart on a Work (Story-level)
 */
export const toggleWorkHeartServerFn = createServerFn({ method: 'POST' })
  .validator(
    (params: {
      clerkUserId: string
      workId: string
    }) => {
      if (!params.clerkUserId) {
        throw new Error('You must be signed in to heart this story.')
      }
      if (!params.workId) throw new Error('workId is required')
      return params
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork = UUID_REGEX.test(params.workId)

    if (!isRealDbWork) {
      return {
        success: true,
        hearted: true,
        heartCount: 1,
      }
    }

    const admin = createAdminClient()
    const profile = await resolveProfile(admin, params.clerkUserId)

    const { data: existingLike } = await admin
      .from('work_likes')
      .select('id')
      .eq('work_id', params.workId)
      .eq('user_id', profile.id)
      .maybeSingle()

    let nextHearted = false

    if (existingLike?.id) {
      await admin.from('work_likes').delete().eq('id', existingLike.id)
      nextHearted = false
    } else {
      await admin.from('work_likes').insert({
        work_id: params.workId,
        user_id: profile.id,
      })
      nextHearted = true
    }

    const { data: updatedWork } = await admin
      .from('works')
      .select('like_count')
      .eq('id', params.workId)
      .maybeSingle()

    return {
      success: true,
      hearted: nextHearted,
      heartCount: Number(updatedWork?.like_count || 0),
    }
  })
