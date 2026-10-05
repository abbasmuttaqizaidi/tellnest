import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server'

export interface AdminUserWork {
  id: string
  title: string
  slug: string
  description?: string | null
  status: string
  visibility: string
  publicationStatus?: string
  chapterCount: number
  wordCount: number
  viewCount: number
  saveCount: number
  createdAt: string
  categoryName?: string
}

export interface AdminUserReading {
  workId: string
  workTitle: string
  workSlug?: string
  chapterId?: string | null
  chapterNumber?: number
  chapterTitle?: string
  progressPercent: number
  lastReadAt: string
}

export interface AdminUserSavedWork {
  workId: string
  workTitle: string
  coverImage?: string | null
  savedAt: string
}

export interface AdminUserFollowedAuthor {
  authorId: string
  authorName: string
  handle?: string
}

export interface AdminUser {
  clerkId: string
  profileId?: string | null
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string
  username: string
  avatarUrl: string | null
  createdAt: string
  lastSignInAt: string | null
  status: 'active' | 'suspended' | 'banned'
  works: AdminUserWork[]
  readingProgress: AdminUserReading[]
  savedWorks: AdminUserSavedWork[]
  followedAuthors: AdminUserFollowedAuthor[]
  interests: string[]
  preferences?: {
    theme?: string
    readingMode?: string
    fontSize?: number
  } | null
}

export interface AdminDashboardData {
  users: AdminUser[]
  totalCount: number
  stats: {
    totalUsers: number
    totalWorks: number
    activeReadingSessions: number
    totalLibrarySaves: number
  }
}

/**
 * Server Function: Fetches all users from Clerk and joins their Supabase manuscripts,
 * reading progress, saved library items, and engagement metrics.
 */
export const getAdminUsersServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<AdminDashboardData> => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY || ''
    const admin = createAdminClient()

    // 1. Fetch Clerk Users
    let clerkUsers: any[] = []
    if (clerkSecretKey) {
      try {
        const clerkRes = await fetch('https://api.clerk.com/v1/users?limit=100&order_by=-created_at', {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        })
        if (clerkRes.ok) {
          const body = await clerkRes.json()
          if (Array.isArray(body)) {
            clerkUsers = body
          }
        } else {
          console.warn('[getAdminUsersServerFn] Clerk API returned status:', clerkRes.status)
        }
      } catch (err: any) {
        console.error('[getAdminUsersServerFn] Error fetching Clerk users:', err?.message)
      }
    }

    // 2. Fetch Supabase Data
    let profiles: any[] = []
    let works: any[] = []
    let readingProgress: any[] = []
    let libraryItems: any[] = []
    let follows: any[] = []
    let userPreferences: any[] = []

    try {
      const [
        pRes,
        wRes,
        rpRes,
        liRes,
        fRes,
        upRes
      ] = await Promise.all([
        admin.from('profiles').select('*'),
        admin.from('works').select('*, category:categories(name)'),
        admin.from('reading_progress').select('*, work:works(id, title, slug), chapter:chapters(id, chapter_number, title)'),
        admin.from('library_items').select('*, work:works(id, title, slug, cover_image_path)'),
        admin.from('follows').select('*, following:profiles!follows_following_id_fkey(id, display_name, username)'),
        admin.from('user_preferences').select('*')
      ])

      profiles = pRes.data || []
      works = wRes.data || []
      readingProgress = rpRes.data || []
      libraryItems = liRes.data || []
      follows = fRes.data || []
      userPreferences = upRes.data || []
    } catch (dbErr: any) {
      console.warn('[getAdminUsersServerFn] Supabase query notice:', dbErr?.message)
    }

    // 3. Assemble unified user list
    const usersMap = new Map<string, AdminUser>()

    // First map all Clerk users
    for (const u of clerkUsers) {
      const email = u.email_addresses?.[0]?.email_address || 'No email'
      const firstName = u.first_name || ''
      const lastName = u.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim() || u.username || email.split('@')[0]
      const username = u.username || email.split('@')[0] || `user_${u.id.slice(0, 8)}`
      const avatarUrl = u.image_url || null
      const createdDate = u.created_at ? new Date(u.created_at).toISOString() : new Date().toISOString()
      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).toISOString() : null

      const matchingProfile = profiles.find((p) => p.clerk_user_id === u.id)
      const profileId = matchingProfile?.id || null

      const userWorks: AdminUserWork[] = profileId
        ? works
            .filter((w) => w.author_id === profileId)
            .map((w) => ({
              id: w.id,
              title: w.title,
              slug: w.slug,
              description: w.description,
              status: w.status,
              visibility: w.visibility,
              publicationStatus: w.publication_status,
              chapterCount: w.chapter_count || 0,
              wordCount: w.word_count || 0,
              viewCount: Number(w.view_count || 0),
              saveCount: Number(w.save_count || 0),
              createdAt: w.created_at,
              categoryName: w.category?.name || 'General Literature',
            }))
        : []

      const userReading: AdminUserReading[] = profileId
        ? readingProgress
            .filter((rp) => rp.user_id === profileId)
            .map((rp) => ({
              workId: rp.work_id,
              workTitle: rp.work?.title || 'Manuscript',
              workSlug: rp.work?.slug,
              chapterId: rp.chapter_id,
              chapterNumber: rp.chapter?.chapter_number || 1,
              chapterTitle: rp.chapter?.title || 'Chapter',
              progressPercent: Number(rp.progress_percent || 0),
              lastReadAt: rp.last_read_at,
            }))
        : []

      const userSaved: AdminUserSavedWork[] = profileId
        ? libraryItems
            .filter((li) => li.user_id === profileId)
            .map((li) => ({
              workId: li.work_id,
              workTitle: li.work?.title || 'Saved Manuscript',
              coverImage: li.work?.cover_image_path || null,
              savedAt: li.created_at,
            }))
        : []

      const userFollows: AdminUserFollowedAuthor[] = profileId
        ? follows
            .filter((f) => f.follower_id === profileId)
            .map((f) => ({
              authorId: f.following_id,
              authorName: f.following?.display_name || 'Resident Author',
              handle: f.following?.username,
            }))
        : []

      const prefs = profileId ? userPreferences.find((pr) => pr.user_id === profileId) : null

      // Deduce interests from works & saved items
      const interestSet = new Set<string>()
      userWorks.forEach((w) => {
        if (w.categoryName) interestSet.add(w.categoryName)
      })
      userSaved.forEach(() => interestSet.add('Serialized Fiction'))
      if (interestSet.size === 0) {
        interestSet.add('Contemporary Prose')
        interestSet.add('Serialized Fiction')
      }

      usersMap.set(u.id, {
        clerkId: u.id,
        profileId,
        email,
        firstName,
        lastName,
        displayName: matchingProfile?.display_name || fullName,
        username: matchingProfile?.username || username,
        avatarUrl: matchingProfile?.avatar_path || avatarUrl,
        createdAt: matchingProfile?.created_at || createdDate,
        lastSignInAt: lastSignIn,
        status: (matchingProfile?.account_status as any) || 'active',
        works: userWorks,
        readingProgress: userReading,
        savedWorks: userSaved,
        followedAuthors: userFollows,
        interests: Array.from(interestSet),
        preferences: prefs
          ? {
              theme: prefs.theme,
              readingMode: prefs.reading_mode,
              fontSize: prefs.font_size,
            }
          : null,
      })
    }

    // Also include any profiles in Supabase that might not be in the current Clerk page
    for (const p of profiles) {
      if (!usersMap.has(p.clerk_user_id)) {
        const userWorks = works
          .filter((w) => w.author_id === p.id)
          .map((w) => ({
            id: w.id,
            title: w.title,
            slug: w.slug,
            description: w.description,
            status: w.status,
            visibility: w.visibility,
            publicationStatus: w.publication_status,
            chapterCount: w.chapter_count || 0,
            wordCount: w.word_count || 0,
            viewCount: Number(w.view_count || 0),
            saveCount: Number(w.save_count || 0),
            createdAt: w.created_at,
            categoryName: w.category?.name || 'General Literature',
          }))

        const userReading = readingProgress
          .filter((rp) => rp.user_id === p.id)
          .map((rp) => ({
            workId: rp.work_id,
            workTitle: rp.work?.title || 'Manuscript',
            workSlug: rp.work?.slug,
            chapterId: rp.chapter_id,
            chapterNumber: rp.chapter?.chapter_number || 1,
            chapterTitle: rp.chapter?.title || 'Chapter',
            progressPercent: Number(rp.progress_percent || 0),
            lastReadAt: rp.last_read_at,
          }))

        usersMap.set(p.clerk_user_id, {
          clerkId: p.clerk_user_id,
          profileId: p.id,
          email: `${p.username}@tellnest.folio`,
          firstName: p.display_name?.split(' ')[0] || null,
          lastName: p.display_name?.split(' ').slice(1).join(' ') || null,
          displayName: p.display_name,
          username: p.username,
          avatarUrl: p.avatar_path,
          createdAt: p.created_at,
          lastSignInAt: null,
          status: p.account_status || 'active',
          works: userWorks,
          readingProgress: userReading,
          savedWorks: [],
          followedAuthors: [],
          interests: ['Serialized Fiction'],
          preferences: null,
        })
      }
    }

    const users = Array.from(usersMap.values())

    return {
      users,
      totalCount: users.length,
      stats: {
        totalUsers: users.length,
        totalWorks: works.length,
        activeReadingSessions: readingProgress.length,
        totalLibrarySaves: libraryItems.length,
      },
    }
  })

/**
 * Server Function: Purges a user completely from both Clerk and Supabase.
 * Cascades through all Supabase tables (profiles, works, chapters, library_items,
 * reading_progress, comments, notifications) and deletes the Clerk user identity.
 */
export const purgeUserServerFn = createServerFn({ method: 'POST' })
  .validator((params: { clerkUserId: string; profileId?: string | null }) => {
    if (!params.clerkUserId || typeof params.clerkUserId !== 'string') {
      throw new Error('Valid clerkUserId is required to purge a user')
    }
    return {
      clerkUserId: params.clerkUserId.trim(),
      profileId: params.profileId ? params.profileId.trim() : null,
    }
  })
  .handler(async ({ data: { clerkUserId, profileId } }) => {
    const admin = createAdminClient()
    const clerkSecretKey = process.env.CLERK_SECRET_KEY || ''

    const report = {
      success: false,
      clerkDeleted: false,
      supabaseDeleted: false,
      clerkMessage: '',
      supabaseMessage: '',
    }

    // 1. Flush Supabase Database
    try {
      let targetProfileId = profileId
      if (!targetProfileId) {
        const { data: found } = await admin
          .from('profiles')
          .select('id')
          .eq('clerk_user_id', clerkUserId)
          .maybeSingle()
        if (found?.id) {
          targetProfileId = found.id
        }
      }

      if (targetProfileId) {
        // Clean auxiliary social and notification items
        await admin.from('comments').delete().eq('user_id', targetProfileId)
        await admin.from('notifications').delete().or(`user_id.eq.${targetProfileId},actor_id.eq.${targetProfileId}`)
        await admin.from('moderation_reports').delete().eq('reporter_id', targetProfileId)

        // Delete profile (cascades to works, chapters, library_items, reading_progress, reading_history, follows, preferences)
        const { error: delErr } = await admin.from('profiles').delete().eq('id', targetProfileId)
        if (delErr) {
          report.supabaseMessage = `Supabase error: ${delErr.message}`
        } else {
          report.supabaseDeleted = true
          report.supabaseMessage = 'All database records, manuscripts, and activity flushed successfully.'
        }
      } else {
        report.supabaseDeleted = true
        report.supabaseMessage = 'No associated Supabase profile rows found (already clean).'
      }
    } catch (sbErr: any) {
      report.supabaseMessage = sbErr?.message || 'Failed during Supabase table purge'
      console.error('[purgeUserServerFn] Supabase purge exception:', sbErr)
    }

    // 2. Flush Clerk Authentication System
    if (clerkSecretKey) {
      try {
        const clerkRes = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (clerkRes.ok) {
          report.clerkDeleted = true
          report.clerkMessage = 'User credentials and security tokens purged from Clerk.'
        } else if (clerkRes.status === 404) {
          report.clerkDeleted = true
          report.clerkMessage = 'User was already absent or previously deleted in Clerk.'
        } else {
          const errData = await clerkRes.json().catch(() => ({}))
          report.clerkMessage = errData?.errors?.[0]?.message || `Clerk HTTP ${clerkRes.status}`
        }
      } catch (cErr: any) {
        report.clerkMessage = cErr?.message || 'Failed to communicate with Clerk API'
        console.error('[purgeUserServerFn] Clerk API purge exception:', cErr)
      }
    } else {
      report.clerkMessage = 'CLERK_SECRET_KEY missing in server environment.'
    }

    report.success = report.clerkDeleted && report.supabaseDeleted
    return report
  })
