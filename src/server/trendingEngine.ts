/**
 * HatchPen Trending V1 Engine
 *
 * Implements approved rolling 7-day Trending ranking with:
 * 1. Rolling 7-day unique readers.
 * 2. Rolling 7-day unique saves.
 * 3. Chapter reach (% of published chapters opened by reader, mean across 7-day readers).
 *
 * Tier A: mean chapter reach >= 80% (0.80)
 * Tier B: mean chapter reach < 80% (0.80)
 * All Tier A stories strictly precede Tier B stories.
 * Likes and lifetime/total views have 0 influence on Trending.
 */

export interface TrendingRankedItem {
  workId: string
  rank: number
  tier: 'A' | 'B'
  score: number
  uniqueReaders7d: number
  uniqueSaves7d: number
  meanChapterReach: number
  publishedChaptersCount: number
  authorId: string
}

export interface TrendingSnapshotRecord {
  id: string
  windowStart: string
  windowEnd: string
  rankings: TrendingRankedItem[]
  tierACount: number
  tierBCount: number
  totalCount: number
  isActive: boolean
  status: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface EligibleWorkCandidate {
  id: string
  authorId: string
  status: string
  publicationStatus?: string
  isPublished?: boolean
  visibility?: string
  publishedChapterIds: string[]
}

export interface ChapterOpenEvent {
  viewerKey: string
  workId: string
  chapterId: string
  openedAt: string | Date
}

export interface SaveEvent {
  userId: string
  workId: string
  createdAt: string | Date
}

/**
 * Approved Trending V1 Scoring Formula:
 * 50% Unique 7-Day Readers (log-scaled)
 * 35% Unique 7-Day Saves (log-scaled)
 * 15% Mean Chapter Reach (0.0 to 1.0)
 *
 * Natural log ln(1 + x) prevents viral anomalies from completely drowning out
 * high-completion serialized works.
 */
export function calculateTrendingScore(
  uniqueReaders7d: number,
  uniqueSaves7d: number,
  meanChapterReach: number
): number {
  const safeReaders = Math.max(0, uniqueReaders7d)
  const safeSaves = Math.max(0, uniqueSaves7d)
  const safeReach = Math.min(1.0, Math.max(0.0, meanChapterReach))

  const readersComponent = 0.50 * Math.log(1 + safeReaders)
  const savesComponent = 0.35 * Math.log(1 + safeSaves)
  const reachComponent = 0.15 * safeReach

  const rawScore = readersComponent + savesComponent + reachComponent
  return Number(rawScore.toFixed(6))
}

/**
 * Pure calculation function for Trending V1 rankings.
 * Evaluates candidate stories against fresh activity in the window.
 */
export function computeTrendingRankings(
  candidates: EligibleWorkCandidate[],
  chapterOpens: ChapterOpenEvent[],
  saves: SaveEvent[],
  options?: {
    windowStart?: Date
    windowEnd?: Date
    maxResults?: number
    authorDiversityCap?: number
  }
): {
  rankings: TrendingRankedItem[]
  tierACount: number
  tierBCount: number
  totalCount: number
} {
  const maxResults = options?.maxResults ?? 10
  const authorDiversityCap = options?.authorDiversityCap ?? 2

  const windowStartMs = options?.windowStart ? new Date(options.windowStart).getTime() : 0
  const windowEndMs = options?.windowEnd ? new Date(options.windowEnd).getTime() : Infinity

  // 1. Index published chapters by work
  const workCandidateMap = new Map<string, EligibleWorkCandidate>()
  for (const c of candidates) {
    // Qualification check: public, published, and has >= 1 published chapter
    const isPublic = c.visibility === 'public'
    const isPublished =
      c.status === 'published' &&
      (c.publicationStatus === undefined || c.publicationStatus === 'published') &&
      (c.isPublished === undefined || c.isPublished === true)
    const hasChapters = Array.isArray(c.publishedChapterIds) && c.publishedChapterIds.length > 0

    if (isPublic && isPublished && hasChapters) {
      workCandidateMap.set(c.id, c)
    }
  }

  // 2. Index saves within rolling window by work
  // Saves created within [windowStart, windowEnd]
  const workSavesMap = new Map<string, Set<string>>()
  for (const s of saves) {
    if (!workCandidateMap.has(s.workId)) continue
    const sTime = new Date(s.createdAt).getTime()
    if (sTime >= windowStartMs && sTime <= windowEndMs) {
      if (!workSavesMap.has(s.workId)) {
        workSavesMap.set(s.workId, new Set())
      }
      workSavesMap.get(s.workId)!.add(s.userId)
    }
  }

  // 3. Index distinct chapter opens within rolling window by work and viewer
  // Deduplicates repeated opens of the same chapter by the same reader
  const workReaderChaptersMap = new Map<string, Map<string, Set<string>>>()
  for (const ev of chapterOpens) {
    const candidate = workCandidateMap.get(ev.workId)
    if (!candidate) continue

    const evTime = new Date(ev.openedAt).getTime()
    if (evTime < windowStartMs || evTime > windowEndMs) continue

    // Only count chapters that are currently published for this work
    if (!candidate.publishedChapterIds.includes(ev.chapterId)) continue

    if (!workReaderChaptersMap.has(ev.workId)) {
      workReaderChaptersMap.set(ev.workId, new Map())
    }
    const readerMap = workReaderChaptersMap.get(ev.workId)!
    if (!readerMap.has(ev.viewerKey)) {
      readerMap.set(ev.viewerKey, new Set())
    }
    readerMap.get(ev.viewerKey)!.add(ev.chapterId)
  }

  // 4. Score every eligible candidate that has recent activity
  const scoredItems: Array<{
    candidate: EligibleWorkCandidate
    tier: 'A' | 'B'
    score: number
    uniqueReaders7d: number
    uniqueSaves7d: number
    meanChapterReach: number
  }> = []

  for (const [workId, candidate] of workCandidateMap.entries()) {
    const readerMap = workReaderChaptersMap.get(workId) || new Map<string, Set<string>>()
    const savesSet = workSavesMap.get(workId) || new Set<string>()

    const uniqueReaders7d = readerMap.size
    const uniqueSaves7d = savesSet.size

    // Invariant: Story must have genuine recent activity (readers or saves) in the window
    if (uniqueReaders7d === 0 && uniqueSaves7d === 0) {
      continue
    }

    const totalPubChapters = candidate.publishedChapterIds.length

    // Compute mean chapter reach across all distinct 7-day readers
    let totalReachSum = 0
    if (uniqueReaders7d > 0) {
      for (const chaptersSet of readerMap.values()) {
        const openedCount = chaptersSet.size
        const readerReach = Math.min(1.0, openedCount / totalPubChapters)
        totalReachSum += readerReach
      }
    }

    const meanChapterReach =
      uniqueReaders7d > 0
        ? Number((totalReachSum / uniqueReaders7d).toFixed(6))
        : 0.0

    // Tier A: mean chapter reach >= 80% (0.80)
    // Tier B: mean chapter reach < 80% (0.80)
    const tier: 'A' | 'B' = meanChapterReach >= 0.80 ? 'A' : 'B'

    const score = calculateTrendingScore(uniqueReaders7d, uniqueSaves7d, meanChapterReach)

    scoredItems.push({
      candidate,
      tier,
      score,
      uniqueReaders7d,
      uniqueSaves7d,
      meanChapterReach,
    })
  }

  // 5. Partition and deterministically sort Tier A and Tier B
  const compareRanked = (a: typeof scoredItems[0], b: typeof scoredItems[0]) => {
    // 1. Tier: Tier A before Tier B
    if (a.tier !== b.tier) {
      return a.tier === 'A' ? -1 : 1
    }
    // 2. Score: Descending
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // 3. Saves: Descending
    if (b.uniqueSaves7d !== a.uniqueSaves7d) {
      return b.uniqueSaves7d - a.uniqueSaves7d
    }
    // 4. Readers: Descending
    if (b.uniqueReaders7d !== a.uniqueReaders7d) {
      return b.uniqueReaders7d - a.uniqueReaders7d
    }
    // 5. Stable Story Identifier Tie-Breaker (UUID / string ASC)
    return a.candidate.id.localeCompare(b.candidate.id)
  }

  scoredItems.sort(compareRanked)

  // 6. Apply author diversity cap (max 2 stories per author in top 10)
  // If author reaches cap, skip subsequent stories by that author IF alternative eligible stories exist
  const finalRanked: TrendingRankedItem[] = []
  const authorCountMap = new Map<string, number>()
  const deferredItems: typeof scoredItems = []

  for (const item of scoredItems) {
    const authorId = item.candidate.authorId
    const currentAuthorCount = authorCountMap.get(authorId) || 0

    if (currentAuthorCount < authorDiversityCap) {
      authorCountMap.set(authorId, currentAuthorCount + 1)
      finalRanked.push({
        workId: item.candidate.id,
        rank: finalRanked.length + 1,
        tier: item.tier,
        score: item.score,
        uniqueReaders7d: item.uniqueReaders7d,
        uniqueSaves7d: item.uniqueSaves7d,
        meanChapterReach: item.meanChapterReach,
        publishedChaptersCount: item.candidate.publishedChapterIds.length,
        authorId: item.candidate.authorId,
      })
      if (finalRanked.length >= maxResults) break
    } else {
      deferredItems.push(item)
    }
  }

  // If slots remain and no other authors exist, fill with deferred items without inventing candidates
  if (finalRanked.length < maxResults && deferredItems.length > 0) {
    for (const item of deferredItems) {
      if (finalRanked.length >= maxResults) break
      finalRanked.push({
        workId: item.candidate.id,
        rank: finalRanked.length + 1,
        tier: item.tier,
        score: item.score,
        uniqueReaders7d: item.uniqueReaders7d,
        uniqueSaves7d: item.uniqueSaves7d,
        meanChapterReach: item.meanChapterReach,
        publishedChaptersCount: item.candidate.publishedChapterIds.length,
        authorId: item.candidate.authorId,
      })
    }
  }

  // Update final sequential ranks
  finalRanked.forEach((item, idx) => {
    item.rank = idx + 1
  })

  const tierACount = finalRanked.filter((item) => item.tier === 'A').length
  const tierBCount = finalRanked.filter((item) => item.tier === 'B').length

  return {
    rankings: finalRanked,
    tierACount,
    tierBCount,
    totalCount: finalRanked.length,
  }
}

// In-memory memoized active snapshot to avoid hitting DB on every user request
let cachedActiveSnapshot: TrendingSnapshotRecord | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 1 minute in-memory cache

export function clearTrendingCache(): void {
  cachedActiveSnapshot = null
  cacheTimestamp = 0
}

/**
 * Retrieves the currently active trending snapshot.
 * Reads from memory cache if fresh, otherwise loads from PostgreSQL `trending_snapshots`.
 */
export async function getActiveTrendingSnapshot(
  adminClient?: any
): Promise<TrendingSnapshotRecord | null> {
  const now = Date.now()
  if (cachedActiveSnapshot && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedActiveSnapshot
  }

  let admin = adminClient
  if (!admin) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return cachedActiveSnapshot
    }
    try {
      const { createAdminClient } = await import('../lib/supabase/server.ts')
      admin = createAdminClient()
    } catch {
      return cachedActiveSnapshot
    }
  }

  try {
    const { data, error } = await admin
      .from('trending_snapshots')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('[getActiveTrendingSnapshot] Database query warning:', error.message)
      return cachedActiveSnapshot
    }

    if (!data) {
      return cachedActiveSnapshot
    }

    cachedActiveSnapshot = {
      id: data.id,
      windowStart: data.window_start,
      windowEnd: data.window_end,
      rankings: (data.rankings || []) as TrendingRankedItem[],
      tierACount: Number(data.tier_a_count || 0),
      tierBCount: Number(data.tier_b_count || 0),
      totalCount: Number(data.total_count || 0),
      isActive: Boolean(data.is_active),
      status: data.status || 'completed',
      metadata: data.metadata || {},
      createdAt: data.created_at,
    }
    cacheTimestamp = now

    return cachedActiveSnapshot
  } catch (err: any) {
    console.error('[getActiveTrendingSnapshot] Unexpected error:', err?.message || err)
    return cachedActiveSnapshot
  }
}

/**
 * Executes a full weekly trending calculation and generates a snapshot.
 * Atomic swap ensures zero downtime and preserves the prior snapshot on failure.
 */
export async function executeGenerateTrendingSnapshot(options?: {
  windowStart?: Date
  windowEnd?: Date
  forceActive?: boolean
  adminClient?: any
}): Promise<{
  success: boolean
  snapshotId?: string
  totalRanked: number
  tierACount: number
  tierBCount: number
  rankings: TrendingRankedItem[]
  message?: string
}> {
  const now = new Date()
  const windowEnd = options?.windowEnd || now
  const windowStart =
    options?.windowStart || new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  let admin = options?.adminClient
  if (!admin) {
    const { createAdminClient } = await import('../lib/supabase/server.ts')
    admin = createAdminClient()
  }

  // 1. Fetch public, published works with published chapters
  const { data: worksData, error: worksErr } = await admin
    .from('works')
    .select(`
      id,
      author_id,
      status,
      publication_status,
      visibility,
      chapters!chapters_work_id_fkey(id, status)
    `)
    .eq('visibility', 'public')
    .eq('publication_status', 'published')

  if (worksErr) {
    console.error('[executeGenerateTrendingSnapshot] Error fetching works:', worksErr.message)
    throw new Error(`Database error querying works: ${worksErr.message}`)
  }

  const candidates: EligibleWorkCandidate[] = []
  for (const w of worksData || []) {
    const pubChapters = (w.chapters || [])
      .filter((ch: any) => ch.status === 'published')
      .map((ch: any) => ch.id)

    if (pubChapters.length > 0) {
      candidates.push({
        id: w.id,
        authorId: w.author_id,
        status: w.status,
        publicationStatus: w.publication_status,
        isPublished: w.publication_status === 'published',
        visibility: w.visibility,
        publishedChapterIds: pubChapters,
      })
    }
  }

  // 2. Fetch rolling 7-day chapter opens
  const { data: opensData, error: opensErr } = await admin
    .from('trending_chapter_opens')
    .select('viewer_key, work_id, chapter_id, opened_at')
    .gte('opened_at', windowStart.toISOString())
    .lte('opened_at', windowEnd.toISOString())

  if (opensErr) {
    console.error('[executeGenerateTrendingSnapshot] Error fetching chapter opens:', opensErr.message)
    throw new Error(`Database error querying trending_chapter_opens: ${opensErr.message}`)
  }

  const chapterOpens: ChapterOpenEvent[] = (opensData || []).map((o: any) => ({
    viewerKey: o.viewer_key,
    workId: o.work_id,
    chapterId: o.chapter_id,
    openedAt: o.opened_at,
  }))

  // 3. Fetch rolling 7-day saves from bookmarks
  const { data: savesData, error: savesErr } = await admin
    .from('bookmarks')
    .select('user_id, work_id, created_at')
    .gte('created_at', windowStart.toISOString())
    .lte('created_at', windowEnd.toISOString())

  if (savesErr) {
    console.error('[executeGenerateTrendingSnapshot] Error fetching saves:', savesErr.message)
    throw new Error(`Database error querying bookmarks: ${savesErr.message}`)
  }

  const saves: SaveEvent[] = (savesData || []).map((s: any) => ({
    userId: s.user_id,
    workId: s.work_id,
    createdAt: s.created_at,
  }))

  // 4. Compute rankings
  const { rankings, tierACount, tierBCount, totalCount } = computeTrendingRankings(
    candidates,
    chapterOpens,
    saves,
    {
      windowStart,
      windowEnd,
      maxResults: 10,
      authorDiversityCap: 2,
    }
  )

  // 5. Store and activate snapshot atomically
  const shouldActivate = options?.forceActive !== false
  let snapshotId: string
  const snapshotMetadata = {
    candidatesEvaluated: candidates.length,
    chapterOpensProcessed: chapterOpens.length,
    savesProcessed: saves.length,
    generatedAt: now.toISOString(),
  }

  if (shouldActivate) {
    // 1. Attempt database-level atomic activation RPC (Primary & Canonical)
    let rpcSnapshotId: string | null = null
    let isMissingFunctionError = false

    try {
      const { data, error: rpcErr } = await admin.rpc(
        'activate_trending_snapshot_atomic',
        {
          p_window_start: windowStart.toISOString(),
          p_window_end: windowEnd.toISOString(),
          p_rankings: rankings,
          p_tier_a_count: tierACount,
          p_tier_b_count: tierBCount,
          p_total_count: totalCount,
          p_metadata: snapshotMetadata,
        }
      )

      if (rpcErr) {
        // Strict Fail-Closed: ONLY verified PostgreSQL 42883 (undefined_function)
        // qualifies as evidence that the RPC procedure does not exist in the database.
        // Schema cache delays (PGRST202), invalid arguments, permission failures, and ambiguous errors MUST NOT trigger fallback.
        if (rpcErr.code === '42883') {
          isMissingFunctionError = true
        } else {
          console.error('[executeGenerateTrendingSnapshot] Atomic activation RPC failed with database error:', rpcErr)
          throw new Error(`Atomic activation RPC failed (${rpcErr.code || 'unknown'}): ${rpcErr.message || JSON.stringify(rpcErr)}`)
        }
      } else if (data) {
        rpcSnapshotId = data
      }
    } catch (callErr: any) {
      if (isMissingFunctionError) {
        // Handled below
      } else if (callErr?.code === '42883') {
        isMissingFunctionError = true
      } else {
        console.error('[executeGenerateTrendingSnapshot] Unexpected error during atomic snapshot activation:', callErr?.message || callErr)
        throw callErr
      }
    }

    if (rpcSnapshotId) {
      snapshotId = rpcSnapshotId
    } else if (isMissingFunctionError) {
      // 2. Legacy fallback: Permitted ONLY when stored procedure explicitly does not exist (code 42883)
      console.warn('[executeGenerateTrendingSnapshot] activate_trending_snapshot_atomic not found (code 42883). Using legacy non-atomic fallback.')
      
      // Respect the single-active-snapshot unique constraint by deactivating prior active snapshots first
      await admin
        .from('trending_snapshots')
        .update({ is_active: false })
        .eq('is_active', true)

      const { data: insertedSnapshot, error: insertErr } = await admin
        .from('trending_snapshots')
        .insert({
          window_start: windowStart.toISOString(),
          window_end: windowEnd.toISOString(),
          rankings,
          tier_a_count: tierACount,
          tier_b_count: tierBCount,
          total_count: totalCount,
          is_active: true,
          status: 'completed',
          metadata: snapshotMetadata,
        })
        .select('id, created_at')
        .single()

      if (insertErr || !insertedSnapshot) {
        console.error('[executeGenerateTrendingSnapshot] Failed to insert snapshot in fallback:', insertErr?.message)
        throw new Error(`Failed to save trending snapshot: ${insertErr?.message}`)
      }
      snapshotId = insertedSnapshot.id
    } else {
      throw new Error('Snapshot activation failed without returning a valid snapshot ID.')
    }

    // Update in-memory cache immediately
    cachedActiveSnapshot = {
      id: snapshotId!,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      rankings,
      tierACount,
      tierBCount,
      totalCount,
      isActive: true,
      status: 'completed',
      metadata: snapshotMetadata,
      createdAt: now.toISOString(),
    }
    cacheTimestamp = Date.now()
  } else {
    // Non-active snapshot insertion (e.g. preview/dry-run)
    const { data: insertedSnapshot, error: insertErr } = await admin
      .from('trending_snapshots')
      .insert({
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        rankings,
        tier_a_count: tierACount,
        tier_b_count: tierBCount,
        total_count: totalCount,
        is_active: false,
        status: 'draft',
        metadata: snapshotMetadata,
      })
      .select('id')
      .single()

    if (insertErr || !insertedSnapshot) {
      throw new Error(`Failed to save draft trending snapshot: ${insertErr?.message}`)
    }
    snapshotId = insertedSnapshot.id
  }

  return {
    success: true,
    snapshotId,
    totalRanked: totalCount,
    tierACount,
    tierBCount,
    rankings,
  }
}
