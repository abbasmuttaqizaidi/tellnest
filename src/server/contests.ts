import { createServerFn } from '@tanstack/react-start'
import { auth } from '@clerk/tanstack-react-start/server'
import { createAdminClient } from '../lib/supabase/server.ts'
import { isValidAdminToken } from './admin.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ContestInfo {
  id: string
  title: string
  slug: string
  contest_type: 'monthly' | 'quarterly'
  theme: string
  category_restriction: string | null
  prize_inr: number
  start_date: string
  end_date: string
  status: 'upcoming' | 'active' | 'evaluating' | 'completed'
  winner_work_id?: string | null
  participant_boost_count?: number
  genre?: string | null
  rules_notes?: string | null
}

export interface ContestLeaderboardItem {
  id: string
  work_id: string
  submitted_at: string
  rank: number
  work: {
    id: string
    title: string
    slug: string
    cover_image?: string | null
    genre?: string | null
    category?: string | null
    synopsis?: string | null
    like_count: number
    published_at: string
    author: {
      id: string
      username: string
      name?: string | null
      avatar_url?: string | null
    }
  }
}

export interface ContestPublicPageData {
  contest: ContestInfo | null
  leaderboard: ContestLeaderboardItem[]
  totalEntries: number
  totalContestants: number
}

export interface SubmitContestEntryPayload {
  contestId: string
  workId: string
  upiId?: string | null
}

export interface ContestDependencies {
  createAdminClient?: () => SupabaseClient<any>
  getAuthState?: () => Promise<{ userId: string | null } | null>
  verifyAdminToken?: (token: string) => boolean
}

// Fast in-memory cache for author's eligible contest works: keyed by `${profileId}:${contestId}`
const eligibleWorksCache = new Map<string, { data: any; timestamp: number }>()
const ELIGIBLE_WORKS_CACHE_TTL_MS = 30_000 // 30 seconds TTL

export function clearContestEligibleWorksCache(profileId?: string, contestId?: string) {
  if (profileId && contestId) {
    eligibleWorksCache.delete(`${profileId}:${contestId}`)
  } else if (profileId) {
    for (const key of eligibleWorksCache.keys()) {
      if (key.startsWith(`${profileId}:`)) eligibleWorksCache.delete(key)
    }
  } else {
    eligibleWorksCache.clear()
  }
}

// UPI ID strict syntax regex (e.g. name@okhdfcbank, mobile@upi, username@axl)
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/

export function validateUpiId(upi: string): boolean {
  if (!upi || typeof upi !== 'string') return false
  return UPI_ID_REGEX.test(upi.trim())
}

/**
 * Returns canonical active monthly contest data and the live verified leaderboard.
 * STRICT PRIVACY INVARIANT: upi_id is NEVER projected or returned in public responses.
 */
export async function executeGetActiveContest(
  slug = 'monthly-indie-contest',
  deps: ContestDependencies = {}
): Promise<ContestPublicPageData> {
  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  // Default fallback dates for the current calendar month
  const now = new Date()
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
  const currentMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()

  const defaultContest: ContestInfo = {
    id: 'default-monthly-contest',
    title: 'The HatchPen Indie Writer Contest — ₹2,000 Cash Prize',
    slug: 'monthly-indie-contest',
    contest_type: 'monthly',
    theme: 'Open Theme — Original Fiction & Web Serials',
    category_restriction: 'all',
    genre: 'All Genres',
    prize_inr: 2000,
    start_date: currentMonthStart,
    end_date: currentMonthEnd,
    status: 'active',
    participant_boost_count: 0,
    rules_notes:
      'Maximum verified reader likes wins. Story must be published during the active contest month. Open to all indie writers in India & Asia.',
  }

  try {
    const { data: contestData, error: contestErr } = await client
      .from('contests')
      .select('*')
      .or(`slug.eq.${slug},status.eq.active`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Dynamic month/year rollover invariant:
    // If a DB contest exists, ensure its active window has not expired.
    // If expired, smoothly roll over to defaultContest for the active calendar month/year.
    let activeContest: ContestInfo = defaultContest
    if (contestData && !contestErr) {
      const contestEnd = contestData.end_date ? new Date(contestData.end_date).getTime() : Infinity
      const isStillActiveWindow = contestEnd >= now.getTime()
      if (contestData.status === 'active' && isStillActiveWindow) {
        activeContest = contestData
      } else if (contestData.slug === slug && isStillActiveWindow) {
        activeContest = contestData
      }
    }

    // Fetch accepted entries with work and author details
    const { data: entries, error: entriesErr } = await client
      .from('contest_entries')
      .select(
        'id, work_id, submitted_at, status, works:work_id(id, title, slug, cover_image_path, like_count, published_at, visibility, publication_status, profiles:author_id(id, username, display_name, avatar_path))'
      )
      .eq('contest_id', activeContest.id)
      .eq('status', 'accepted')

    const boostCount = Math.max(0, Number(activeContest.participant_boost_count) || 0)

    if (entriesErr || !Array.isArray(entries)) {
      return {
        contest: activeContest,
        leaderboard: [],
        totalEntries: 0,
        totalContestants: boostCount,
      }
    }

    // Rank stories by verified like_count descending
    const items: ContestLeaderboardItem[] = entries
      .filter((e: any) => e.works && (e.works.visibility || '').toLowerCase() === 'public')
      .map((e: any) => {
        const w = e.works
        const authorProfile = w.profiles || {}
        return {
          id: e.id,
          work_id: e.work_id,
          submitted_at: e.submitted_at,
          rank: 0,
          work: {
            id: w.id,
            title: w.title,
            slug: w.slug || w.id,
            cover_image: w.cover_image_path || w.cover_image,
            genre: w.genre,
            category: w.category,
            synopsis: w.description || w.synopsis,
            like_count: Number(w.like_count || 0),
            published_at: w.published_at,
            author: {
              id: authorProfile.id || '',
              username: authorProfile.username || 'author',
              name: authorProfile.display_name || authorProfile.full_name || authorProfile.username || 'HatchPen Author',
              avatar_url: authorProfile.avatar_path || authorProfile.avatar_url,
            },
          },
        }
      })
      .sort((a, b) => b.work.like_count - a.work.like_count)
      .map((item, idx) => ({ ...item, rank: idx + 1 }))

    const realEntries = items.length

    return {
      contest: activeContest,
      leaderboard: items,
      totalEntries: realEntries,
      totalContestants: realEntries + boostCount,
    }
  } catch (err) {
    console.warn('[executeGetActiveContest] Fallback triggered:', err)
    return {
      contest: defaultContest,
      leaderboard: [],
      totalEntries: 0,
      totalContestants: 0,
    }
  }
}

/**
 * Validates and registers a writer's manuscript into the active monthly contest.
 */
export async function executeSubmitContestEntry(
  payload: SubmitContestEntryPayload,
  deps: ContestDependencies = {}
): Promise<{ success: boolean; message: string; entryId?: string }> {
  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  // 1. Authenticate user
  const authFn = deps.getAuthState || (async () => await auth())
  const authState = await authFn()
  const clerkUserId = authState?.userId
  if (!clerkUserId) {
    return { success: false, message: 'You must be signed in to enter the contest.' }
  }

  // 2. Validate UPI ID only if explicitly provided (UPI is optional at entry, collected from winner)
  const rawUpi = payload.upiId ? String(payload.upiId).trim() : ''
  if (rawUpi && !validateUpiId(rawUpi)) {
    return {
      success: false,
      message: 'Please provide a valid UPI ID (e.g. yourname@okhdfcbank or 9876543210@upi).',
    }
  }
  const cleanUpi = rawUpi || null

  // 3. Resolve user profile
  const { data: profile, error: profErr } = await client
    .from('profiles')
    .select('id, username')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (profErr || !profile) {
    return { success: false, message: 'Author profile could not be found. Please complete profile setup.' }
  }

  // 4. Resolve Contest
  let { data: contest, error: contestErr } = await client
    .from('contests')
    .select('*')
    .eq('id', payload.contestId)
    .maybeSingle()

  if (!contest) {
    const { data: activeContest } = await client
      .from('contests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    contest = activeContest
  }

  if (!contest) {
    return { success: false, message: 'Active contest not found or submissions are closed.' }
  }

  if (contest.status !== 'active') {
    return { success: false, message: `Submissions are currently ${contest.status} for this contest.` }
  }

  // 5. Check if author already submitted an entry this month (1 story per writer per month)
  const { data: existingAuthorEntry } = await client
    .from('contest_entries')
    .select('id')
    .eq('contest_id', contest.id)
    .eq('author_id', profile.id)
    .maybeSingle()

  if (existingAuthorEntry) {
    return {
      success: false,
      message: 'You have already submitted an entry for this month’s contest. Only 1 manuscript is allowed per writer.',
    }
  }

  // 6. Resolve Work & Verify Eligibility
  const { data: work, error: workErr } = await client
    .from('works')
    .select('id, title, author_id, publication_status, visibility, published_at, category_id, categories:category_id (name)')
    .eq('id', payload.workId)
    .maybeSingle()

  if (workErr || !work) {
    return { success: false, message: 'Selected manuscript could not be found.' }
  }

  if (work.author_id !== profile.id) {
    return { success: false, message: 'You can only enter manuscripts authored by your account.' }
  }

  if ((work.publication_status || '').toLowerCase() !== 'published' || (work.visibility || '').toLowerCase() !== 'public') {
    return { success: false, message: 'Your manuscript must be publicly published to participate in the contest.' }
  }

  // Date Check: Work published_at must fall within contest start and end date
  const workPubDate = work.published_at ? new Date(work.published_at).getTime() : 0
  const contestStart = new Date(contest.start_date).getTime()
  const contestEnd = new Date(contest.end_date).getTime()

  if (workPubDate < contestStart || workPubDate > contestEnd) {
    return {
      success: false,
      message: 'This manuscript was not published during the current contest month. Only stories published this month are eligible.',
    }
  }

  // Category restriction check
  if (contest.category_restriction && contest.category_restriction !== 'all') {
    const categoryName = (work as any)?.categories?.name || (work as any)?.category || ''
    const workCat = categoryName.toLowerCase()
    const reqCat = contest.category_restriction.toLowerCase()
    if (!workCat.includes(reqCat)) {
      return {
        success: false,
        message: `This month’s contest is restricted to the "${contest.category_restriction}" category.`,
      }
    }
  }

  // 7. Save Entry (UPI is optional at entry time, collected strictly from winner)
  let insertPayload: any = {
    contest_id: contest.id,
    work_id: work.id,
    author_id: profile.id,
    upi_id: cleanUpi,
    status: 'accepted',
  }

  let { data: inserted, error: insertErr } = await client
    .from('contest_entries')
    .insert(insertPayload)
    .select('id')
    .single()

  // Defensive fallback if live database table has not yet applied the nullable upi_id migration
  if (insertErr && (insertErr.message?.toLowerCase().includes('upi_id') || insertErr.message?.includes('not-null'))) {
    insertPayload.upi_id = 'pending_winner_payout'
    const fallbackRes = await client
      .from('contest_entries')
      .insert(insertPayload)
      .select('id')
      .single()
    inserted = fallbackRes.data
    insertErr = fallbackRes.error
  }

  if (insertErr || !inserted) {
    return { success: false, message: insertErr?.message || 'Failed to submit contest entry. Please try again.' }
  }

  // Invalidate cached eligible works for this author so subsequent calls reflect the new entry immediately
  clearContestEligibleWorksCache(profile.id, contest.id)

  return {
    success: true,
    message: `"${work.title}" has been successfully entered into the contest! Share your story with readers to collect likes.`,
    entryId: inserted.id,
  }
}

/**
 * Fetches user's own published works that qualify for the current active contest.
 */
export async function executeGetEligibleUserWorksForContest(
  contestId: string,
  deps: ContestDependencies = {}
): Promise<{ works: Array<{ id: string; title: string; category: string; published_at: string; isEligible: boolean; reason?: string }>; alreadyEnteredWorkId?: string | null }> {
  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  const authFn = deps.getAuthState || (async () => await auth())
  const authState = await authFn()
  const clerkUserId = authState?.userId
  if (!clerkUserId) return { works: [], alreadyEnteredWorkId: null }

  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!profile) return { works: [], alreadyEnteredWorkId: null }

  let { data: contest } = await client
    .from('contests')
    .select('id, start_date, end_date, category_restriction')
    .eq('id', contestId)
    .maybeSingle()

  if (!contest) {
    const { data: activeContest } = await client
      .from('contests')
      .select('id, start_date, end_date, category_restriction')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    contest = activeContest
  }

  if (!contest) return { works: [], alreadyEnteredWorkId: null }

  // 1. Check in-memory cache
  const cacheKey = `${profile.id}:${contest.id}`
  const cached = eligibleWorksCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < ELIGIBLE_WORKS_CACHE_TTL_MS) {
    return cached.data
  }

  // 2. Check if author already entered a work
  const { data: existingEntry } = await client
    .from('contest_entries')
    .select('work_id, works:work_id(id, title, slug, like_count)')
    .eq('contest_id', contest.id)
    .eq('author_id', profile.id)
    .maybeSingle()

  const enteredWork = existingEntry?.works
    ? {
        id: existingEntry.work_id,
        title: (existingEntry.works as any).title,
        slug: (existingEntry.works as any).slug,
        like_count: Number((existingEntry.works as any).like_count || 0),
      }
    : null

  // 3. Lean query: Select strictly necessary fields (id, title, published_at) filtered directly by publication window
  const { data: userWorks } = await client
    .from('works')
    .select('id, title, published_at')
    .eq('author_id', profile.id)
    .eq('publication_status', 'published')
    .eq('visibility', 'public')
    .gte('published_at', contest.start_date)
    .lte('published_at', contest.end_date)
    .order('published_at', { ascending: false })

  const worksList = (userWorks || []).map((w: any) => ({
    id: w.id,
    title: w.title,
    published_at: w.published_at,
    isEligible: true,
  }))

  const responseData = {
    works: worksList,
    alreadyEnteredWorkId: existingEntry?.work_id || null,
    alreadyEnteredWork: enteredWork,
  }

  // Cache response for 30 seconds
  eligibleWorksCache.set(cacheKey, { data: responseData, timestamp: Date.now() })

  return responseData
}

/**
 * Dedicated Writer Status: Fetches the logged-in writer's active monthly contest submission
 * and count of eligible manuscripts so they can review entry details in their studio.
 */
export async function executeGetWriterContestStatus(
  deps: ContestDependencies = {}
): Promise<{
  contest: ContestInfo | null
  entry: {
    id: string
    workId: string
    title: string
    slug: string
    like_count: number
    submitted_at: string
    status: string
    cover_image_path?: string | null
    published_at?: string
  } | null
  hasEligibleUnsubmittedWorks: boolean
  eligibleWorksCount: number
}> {
  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  const authFn = deps.getAuthState || (async () => await auth())
  const authState = await authFn()
  const clerkUserId = authState?.userId
  if (!clerkUserId) {
    return { contest: null, entry: null, hasEligibleUnsubmittedWorks: false, eligibleWorksCount: 0 }
  }

  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle()

  if (!profile) {
    return { contest: null, entry: null, hasEligibleUnsubmittedWorks: false, eligibleWorksCount: 0 }
  }

  // Active contest in DB or current month fallback
  const { data: contestData } = await client
    .from('contests')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const contest: ContestInfo | null = contestData || null
  if (!contest) {
    return { contest: null, entry: null, hasEligibleUnsubmittedWorks: false, eligibleWorksCount: 0 }
  }

  // Check if author entered a work this month
  const { data: existingEntry } = await client
    .from('contest_entries')
    .select('id, work_id, submitted_at, status, works:work_id(id, title, slug, like_count, published_at, cover_image_path)')
    .eq('contest_id', contest.id)
    .eq('author_id', profile.id)
    .maybeSingle()

  const entryData = existingEntry?.works
    ? {
        id: existingEntry.id,
        workId: existingEntry.work_id,
        title: (existingEntry.works as any).title,
        slug: (existingEntry.works as any).slug,
        like_count: Number((existingEntry.works as any).like_count || 0),
        submitted_at: existingEntry.submitted_at,
        status: existingEntry.status,
        cover_image_path: (existingEntry.works as any).cover_image_path,
        published_at: (existingEntry.works as any).published_at,
      }
    : null

  // Count eligible published works this month
  const { count: eligibleCount } = await client
    .from('works')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', profile.id)
    .eq('publication_status', 'published')
    .eq('visibility', 'public')
    .gte('published_at', contest.start_date)
    .lte('published_at', contest.end_date)

  const count = Number(eligibleCount || 0)

  return {
    contest,
    entry: entryData,
    hasEligibleUnsubmittedWorks: !entryData && count > 0,
    eligibleWorksCount: count,
  }
}

/**
 * Admin: Fetches full contest registry with UPI IDs and entries for winner declaration.
 */
export async function executeGetAdminContestOverview(
  adminToken: string,
  deps: ContestDependencies = {}
) {
  const verifyFn = deps.verifyAdminToken || isValidAdminToken
  if (!verifyFn(adminToken)) {
    throw new Error('Unauthorized admin access.')
  }

  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  const { data: contest } = await client
    .from('contests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!contest) return { contest: null, entries: [] }

  const { data: entries } = await client
    .from('contest_entries')
    .select(
      'id, upi_id, submitted_at, status, author:author_id(id, username, display_name), work:work_id(id, title, slug, like_count, published_at)'
    )
    .eq('contest_id', contest.id)
    .order('submitted_at', { ascending: false })

  return {
    contest,
    entries: entries || [],
  }
}

/**
 * Admin: Updates contest configuration or selects a winner.
 */
export async function executeSaveAdminContestConfig(
  adminToken: string,
  config: Partial<ContestInfo> & { winnerWorkId?: string },
  deps: ContestDependencies = {}
) {
  const verifyFn = deps.verifyAdminToken || isValidAdminToken
  if (!verifyFn(adminToken)) {
    throw new Error('Unauthorized admin access.')
  }

  const getClient = deps.createAdminClient || createAdminClient
  const client = getClient()

  // Resolve target contest ID: either explicit UUID or active DB contest fallback
  let targetId = config.id && config.id !== 'default-monthly-contest' ? config.id : null

  if (!targetId) {
    const { data: existingActive } = await client
      .from('contests')
      .select('id, participant_boost_count')
      .or(`slug.eq.monthly-indie-contest,status.eq.active`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingActive?.id) {
      targetId = existingActive.id
    }
  }

  if (targetId) {
    // If admin is adjusting participant_boost_count, enforce non-decreasing rule:
    // "admin agar chahye to is count mein icrement kar sakta hai but decrement nahi kar sakta"
    if (config.participant_boost_count !== undefined) {
      const { data: currentContest } = await client
        .from('contests')
        .select('participant_boost_count')
        .eq('id', targetId)
        .maybeSingle()

      const currentBoost = Math.max(0, Number(currentContest?.participant_boost_count) || 0)
      const requestedBoost = Math.max(0, Number(config.participant_boost_count) || 0)

      if (requestedBoost < currentBoost) {
        throw new Error(
          `Contestant count can only be incremented, not decremented (current: ${currentBoost}, requested: ${requestedBoost}).`
        )
      }
    }

    const updatePayload: any = {
      ...(config.title ? { title: config.title } : {}),
      ...(config.theme ? { theme: config.theme } : {}),
      ...(config.category_restriction !== undefined ? { category_restriction: config.category_restriction } : {}),
      ...(config.genre !== undefined ? { genre: config.genre } : {}),
      ...(config.prize_inr ? { prize_inr: config.prize_inr } : {}),
      ...(config.status ? { status: config.status } : {}),
      ...(config.participant_boost_count !== undefined
        ? { participant_boost_count: Math.max(0, Number(config.participant_boost_count) || 0) }
        : {}),
      ...(config.winnerWorkId ? { winner_work_id: config.winnerWorkId } : {}),
      updated_at: new Date().toISOString(),
    }
    const { error } = await client.from('contests').update(updatePayload).eq('id', targetId)
    if (error) throw new Error(error.message)
    return { success: true, contestId: targetId }
  }

  // Create new contest
  const { data, error } = await client.from('contests').insert({
    title: config.title || 'HatchPen Monthly Contest',
    slug: (config.title || 'monthly-contest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    theme: config.theme || 'Open Theme',
    category_restriction: config.category_restriction || 'all',
    genre: config.genre || 'All Genres',
    prize_inr: config.prize_inr || 2000,
    participant_boost_count: Math.max(0, Number(config.participant_boost_count) || 0),
    start_date: config.start_date || new Date().toISOString(),
    end_date: config.end_date || new Date().toISOString(),
    status: config.status || 'active',
  }).select().single()

  if (error) throw new Error(error.message)
  return { success: true, contestId: data.id }
}

// ==============================================================================
// Server Functions (TanStack Start RPC Endpoints)
// ==============================================================================

export const getActiveContestServerFn = createServerFn({ method: 'GET' })
  .validator((slug?: string) => String(slug || 'monthly-indie-contest'))
  .handler(async ({ data }) => {
    return await executeGetActiveContest(data)
  })

export const submitContestEntryServerFn = createServerFn({ method: 'POST' })
  .validator((payload: SubmitContestEntryPayload) => payload)
  .handler(async ({ data }) => {
    return await executeSubmitContestEntry(data)
  })

export const getEligibleUserWorksForContestServerFn = createServerFn({ method: 'GET' })
  .validator((contestId: string) => String(contestId || ''))
  .handler(async ({ data }) => {
    return await executeGetEligibleUserWorksForContest(data)
  })

export const getWriterContestStatusServerFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    return await executeGetWriterContestStatus()
  })

export const getAdminContestOverviewServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminToken: string }) => data)
  .handler(async ({ data }) => {
    return await executeGetAdminContestOverview(data.adminToken)
  })

export const saveAdminContestConfigServerFn = createServerFn({ method: 'POST' })
  .validator((data: { adminToken: string; config: any }) => data)
  .handler(async ({ data }) => {
    return await executeSaveAdminContestConfig(data.adminToken, data.config)
  })
