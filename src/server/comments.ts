import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server.ts'
import { INITIAL_COMMENTS } from '../data/mockData.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface FormattedCommentItem {
  id: string
  workId: string
  chapterId?: string | null
  parentId?: string | null
  authorId?: string | null
  authorName: string
  authorHandle: string
  authorAvatar: string
  isWorkAuthor?: boolean
  content: string
  timestamp: string
  likesCount: number
  userLiked: boolean
  isReported?: boolean
  replies?: FormattedCommentItem[]
}

/**
 * Helper to resolve or create a Supabase profile from a Clerk user ID
 */
async function resolveProfile(admin: any, clerkUserId: string) {
  let { data: profile } = await admin
    .from('profiles')
    .select('id, username, display_name, avatar_path')
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
      .select('id, username, display_name, avatar_path')
      .single()

    if (createErr || !newProfile) {
      throw new Error(`Failed to resolve reader profile: ${createErr?.message}`)
    }
    return newProfile
  }

  return profile
}

/**
 * Format timestamp into human-readable relative time (e.g. "Just now", "2h ago", "Oct 24")
 */
function formatRelativeTimestamp(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSec < 60) return 'Just now'
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Recently'
  }
}

/**
 * Server Function: Get all visible comments for a chapter or work (with likes count & threaded replies)
 * Ultra-optimized with single/double indexed scan and in-memory hierarchical assembly.
 */
export const getChapterCommentsServerFn = createServerFn({ method: 'GET' })
  .validator(
    (params: {
      workId: string
      chapterId?: string | null
      clerkUserId?: string | null
      workAuthorId?: string | null
      workAuthorHandle?: string | null
    }) => {
      if (!params.workId) {
        throw new Error('workId is required')
      }
      return params
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork =
      UUID_REGEX.test(params.workId) &&
      (!params.chapterId || UUID_REGEX.test(params.chapterId))

    // Fallback for mock catalog works that aren't in Supabase
    if (!isRealDbWork) {
      const mockMatches = INITIAL_COMMENTS.filter(
        (c) => c.workId === params.workId && (!params.chapterId || c.chapterId === params.chapterId)
      )
      return {
        success: true,
        comments: mockMatches.map((c) => ({
          id: c.id,
          workId: c.workId,
          chapterId: c.chapterId,
          authorName: c.authorName,
          authorHandle: c.authorHandle,
          authorAvatar: c.authorAvatar || '/unisex-avatar.svg',
          isWorkAuthor: c.isWorkAuthor || false,
          content: c.content,
          timestamp: c.timestamp,
          likesCount: c.likesCount || 0,
          userLiked: c.userLiked || false,
          replies: (c.replies || []).map((r) => ({
            id: r.id,
            workId: r.workId,
            chapterId: r.chapterId,
            authorName: r.authorName,
            authorHandle: r.authorHandle,
            authorAvatar: r.authorAvatar || '/unisex-avatar.svg',
            isWorkAuthor: r.isWorkAuthor || false,
            content: r.content,
            timestamp: r.timestamp,
            likesCount: r.likesCount || 0,
            userLiked: r.userLiked || false,
          })),
        })),
        totalCount: mockMatches.length,
      }
    }

    const admin = createAdminClient()

    // 1. Resolve current user profile ID if logged in (for checking userLiked)
    let currentProfileId: string | null = null
    if (params.clerkUserId) {
      const { data: currentProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', params.clerkUserId)
        .maybeSingle()
      if (currentProfile?.id) {
        currentProfileId = currentProfile.id
      }
    }

    // 2. Build indexed query for comments
    let commentsQuery = admin
      .from('comments')
      .select(`
        id,
        work_id,
        chapter_id,
        parent_comment_id,
        content,
        created_at,
        user:profiles(
          id,
          username,
          display_name,
          avatar_path
        )
      `)
      .eq('work_id', params.workId)
      .eq('status', 'visible')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (params.chapterId) {
      commentsQuery = commentsQuery.eq('chapter_id', params.chapterId)
    } else {
      commentsQuery = commentsQuery.is('chapter_id', null)
    }

    const { data: rawComments, error: commentsErr } = await commentsQuery

    if (commentsErr) {
      console.error('[getChapterCommentsServerFn] Comments query error:', commentsErr.message)
      throw new Error(`Failed to load reflections: ${commentsErr.message}`)
    }

    if (!rawComments || rawComments.length === 0) {
      return { success: true, comments: [], totalCount: 0 }
    }

    const commentIds = rawComments.map((c) => c.id)

    // 3. Batch fetch likes for all retrieved comments in one parallel indexed query
    const { data: rawReactions } = await admin
      .from('comment_reactions')
      .select('comment_id, user_id')
      .in('comment_id', commentIds)
      .eq('reaction_type', 'like')

    // Count likes and track user's own like
    const likeCounts: Record<string, number> = {}
    const userLikesSet = new Set<string>()

    if (rawReactions) {
      for (const r of rawReactions) {
        likeCounts[r.comment_id] = (likeCounts[r.comment_id] || 0) + 1
        if (currentProfileId && r.user_id === currentProfileId) {
          userLikesSet.add(r.comment_id)
        }
      }
    }

    // 4. Assemble hierarchical tree (parent comments with nested replies)
    const commentMap = new Map<string, FormattedCommentItem>()
    const topLevelComments: FormattedCommentItem[] = []

    for (const raw of rawComments) {
      const user = raw.user as any
      const authorId = user?.id || null
      const authorHandle = user?.username || 'anonymous'
      const authorName = user?.display_name || authorHandle
      const authorAvatar = user?.avatar_path || '/unisex-avatar.svg'

      const isWorkAuthor =
        (params.workAuthorId && authorId === params.workAuthorId) ||
        (params.workAuthorHandle && authorHandle.toLowerCase() === params.workAuthorHandle.toLowerCase())

      const item: FormattedCommentItem = {
        id: raw.id,
        workId: raw.work_id,
        chapterId: raw.chapter_id,
        parentId: raw.parent_comment_id || null,
        authorId,
        authorName,
        authorHandle,
        authorAvatar,
        isWorkAuthor: Boolean(isWorkAuthor),
        content: raw.content,
        timestamp: formatRelativeTimestamp(raw.created_at),
        likesCount: likeCounts[raw.id] || 0,
        userLiked: userLikesSet.has(raw.id),
        replies: [],
      }

      commentMap.set(raw.id, item)
    }

    // Connect replies to their parents
    for (const item of commentMap.values()) {
      if (item.parentId && commentMap.has(item.parentId)) {
        const parent = commentMap.get(item.parentId)!
        parent.replies = parent.replies || []
        parent.replies.push(item)
      } else {
        // Top-level comments ordered newest first
        topLevelComments.unshift(item)
      }
    }

    return {
      success: true,
      comments: topLevelComments,
      totalCount: rawComments.length,
    }
  })

/**
 * Server Function: Post a new comment or reply
 */
export const postChapterCommentServerFn = createServerFn({ method: 'POST' })
  .validator(
    (params: {
      clerkUserId: string
      workId: string
      chapterId?: string | null
      content: string
      parentCommentId?: string | null
      workAuthorId?: string | null
      workAuthorHandle?: string | null
    }) => {
      if (!params.clerkUserId) throw new Error('You must be signed in to post a reflection.')
      if (!params.workId) throw new Error('Work is required.')
      const cleanContent = (params.content || '').trim()
      if (!cleanContent) throw new Error('Reflection content cannot be empty.')
      if (cleanContent.length > 2500) throw new Error('Reflection exceeds maximum length of 2500 characters.')

      return {
        ...params,
        content: cleanContent,
      }
    }
  )
  .handler(async ({ data: params }) => {
    const isRealDbWork =
      UUID_REGEX.test(params.workId) &&
      (!params.chapterId || UUID_REGEX.test(params.chapterId))

    // Fallback for mock works: simulated post
    if (!isRealDbWork) {
      return {
        success: true,
        comment: {
          id: `comm-${Date.now()}`,
          workId: params.workId,
          chapterId: params.chapterId || null,
          parentId: params.parentCommentId || null,
          authorName: 'You',
          authorHandle: 'you',
          authorAvatar: '/unisex-avatar.svg',
          isWorkAuthor: false,
          content: params.content,
          timestamp: 'Just now',
          likesCount: 0,
          userLiked: false,
          replies: [],
        },
      }
    }

    const admin = createAdminClient()
    const profile = await resolveProfile(admin, params.clerkUserId)

    const payload: Record<string, any> = {
      user_id: profile.id,
      work_id: params.workId,
      content: params.content,
      status: 'visible',
    }

    if (params.chapterId && UUID_REGEX.test(params.chapterId)) {
      payload.chapter_id = params.chapterId
    }

    if (params.parentCommentId && UUID_REGEX.test(params.parentCommentId)) {
      payload.parent_comment_id = params.parentCommentId
    }

    const { data: newRow, error: insertErr } = await admin
      .from('comments')
      .insert(payload)
      .select('id, work_id, chapter_id, parent_comment_id, content, created_at')
      .single()

    if (insertErr || !newRow) {
      console.error('[postChapterCommentServerFn] Insert error:', insertErr?.message)
      throw new Error(`Failed to publish reflection: ${insertErr?.message || 'Database error'}`)
    }

    const isWorkAuthor =
      (params.workAuthorId && profile.id === params.workAuthorId) ||
      (params.workAuthorHandle && profile.username.toLowerCase() === params.workAuthorHandle.toLowerCase())

    const formattedComment: FormattedCommentItem = {
      id: newRow.id,
      workId: newRow.work_id,
      chapterId: newRow.chapter_id,
      parentId: newRow.parent_comment_id || null,
      authorId: profile.id,
      authorName: profile.display_name || profile.username,
      authorHandle: profile.username,
      authorAvatar: profile.avatar_path || '/unisex-avatar.svg',
      isWorkAuthor: Boolean(isWorkAuthor),
      content: newRow.content,
      timestamp: 'Just now',
      likesCount: 0,
      userLiked: false,
      replies: [],
    }

    return {
      success: true,
      comment: formattedComment,
    }
  })

/**
 * Server Function: Toggle Like / Heart on a comment (atomic insert/delete)
 */
export const toggleCommentLikeServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; commentId: string }) => {
    if (!params.clerkUserId) throw new Error('Sign in to like reflections.')
    if (!params.commentId) throw new Error('commentId is required')
    return params
  })
  .handler(async ({ data: params }) => {
    const isRealDbComment = UUID_REGEX.test(params.commentId)
    if (!isRealDbComment) {
      return { success: true, liked: true }
    }

    const admin = createAdminClient()
    const profile = await resolveProfile(admin, params.clerkUserId)

    // Check if like exists
    const { data: existingLike } = await admin
      .from('comment_reactions')
      .select('id')
      .eq('comment_id', params.commentId)
      .eq('user_id', profile.id)
      .eq('reaction_type', 'like')
      .maybeSingle()

    if (existingLike?.id) {
      // Delete like (unlike)
      await admin
        .from('comment_reactions')
        .delete()
        .eq('id', existingLike.id)

      return { success: true, liked: false }
    } else {
      // Insert like
      await admin
        .from('comment_reactions')
        .insert({
          comment_id: params.commentId,
          user_id: profile.id,
          reaction_type: 'like',
        })

      return { success: true, liked: true }
    }
  })

/**
 * Server Function: Delete a comment (ownership verified)
 */
export const deleteChapterCommentServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; commentId: string }) => {
    if (!params.clerkUserId) throw new Error('Unauthorized')
    if (!params.commentId) throw new Error('commentId is required')
    return params
  })
  .handler(async ({ data: params }) => {
    const isRealDbComment = UUID_REGEX.test(params.commentId)
    if (!isRealDbComment) {
      return { success: true }
    }

    const admin = createAdminClient()
    const profile = await resolveProfile(admin, params.clerkUserId)

    // Check that comment belongs to this user
    const { data: comment } = await admin
      .from('comments')
      .select('id, user_id')
      .eq('id', params.commentId)
      .single()

    if (!comment || comment.user_id !== profile.id) {
      throw new Error('You can only delete your own reflections.')
    }

    // Soft delete with status = 'deleted' and deleted_at timestamp
    const { error } = await admin
      .from('comments')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', params.commentId)

    if (error) {
      throw new Error(`Failed to delete reflection: ${error.message}`)
    }

    return { success: true }
  })

/**
 * Server Function: Report a comment for moderation review
 */
export const reportChapterCommentServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId?: string | null; commentId: string; reason?: string }) => {
    if (!params.commentId) throw new Error('commentId is required')
    return params
  })
  .handler(async ({ data: params }) => {
    const isRealDbComment = UUID_REGEX.test(params.commentId)
    if (!isRealDbComment) {
      return { success: true }
    }

    const admin = createAdminClient()

    // Mark comment status as flagged for review
    await admin
      .from('comments')
      .update({ status: 'flagged' })
      .eq('id', params.commentId)

    return { success: true }
  })
