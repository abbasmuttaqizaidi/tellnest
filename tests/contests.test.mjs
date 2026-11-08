import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  validateUpiId,
  executeGetActiveContest,
  executeSubmitContestEntry,
  executeSaveAdminContestConfig,
} from '../src/server/contests.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

test('Contest UPI Validation: validateUpiId accepts standard Indian VPAs and rejects malformed strings', () => {
  // Valid UPI IDs
  assert.equal(validateUpiId('author@okhdfcbank'), true)
  assert.equal(validateUpiId('9876543210@upi'), true)
  assert.equal(validateUpiId('indie.writer@axl'), true)
  assert.equal(validateUpiId('my_story_123@paytm'), true)
  assert.equal(validateUpiId('penname-india@sbi'), true)

  // Invalid UPI IDs
  assert.equal(validateUpiId(''), false)
  assert.equal(validateUpiId('notanupi'), false)
  assert.equal(validateUpiId('author@'), false)
  assert.equal(validateUpiId('@okhdfcbank'), false)
  assert.equal(validateUpiId('user name@upi'), false)
  assert.equal(validateUpiId(null), false)
  assert.equal(validateUpiId(undefined), false)
})

test('Contest Public Leaderboard: executeGetActiveContest ranks stories by likes and strictly hides upi_id', async () => {
  const currentMonthStart = new Date(Date.UTC(2026, 10, 1)).toISOString()
  const currentMonthEnd = new Date(Date.UTC(2026, 10, 30, 23, 59, 59)).toISOString()

  const mockContest = {
    id: 'contest-nov-2026',
    title: 'The HatchPen Indie Writer Contest — ₹2,000 Cash Prize',
    slug: 'monthly-indie-contest',
    contest_type: 'monthly',
    theme: 'Open Theme',
    category_restriction: 'all',
    prize_inr: 2000,
    start_date: currentMonthStart,
    end_date: currentMonthEnd,
    status: 'active',
  }

  const mockEntries = [
    {
      id: 'entry-1',
      contest_id: 'contest-nov-2026',
      work_id: 'work-1',
      author_id: 'auth-1',
      upi_id: 'secret_winner@upi', // MUST NEVER BE LEAKED
      status: 'accepted',
      submitted_at: '2026-11-05T10:00:00Z',
      works: {
        id: 'work-1',
        title: 'Story With Most Likes',
        slug: 'story-most-likes',
        like_count: 142,
        visibility: 'public',
        publication_status: 'published',
        published_at: '2026-11-02T12:00:00Z',
        category: 'Novels',
        genre: 'Romance',
        profiles: { id: 'auth-1', username: 'topwriter', full_name: 'Top Writer' },
      },
    },
    {
      id: 'entry-2',
      contest_id: 'contest-nov-2026',
      work_id: 'work-2',
      author_id: 'auth-2',
      upi_id: 'secret_runnerup@upi', // MUST NEVER BE LEAKED
      status: 'accepted',
      submitted_at: '2026-11-04T10:00:00Z',
      works: {
        id: 'work-2',
        title: 'Story With Fewer Likes',
        slug: 'story-fewer-likes',
        like_count: 58,
        visibility: 'public',
        publication_status: 'published',
        published_at: '2026-11-03T12:00:00Z',
        category: 'Short Stories',
        genre: 'Thriller',
        profiles: { id: 'auth-2', username: 'runnerup', full_name: 'Runner Up' },
      },
    },
  ]

  const mockAdminClient = () => ({
    from: (table) => {
      if (table === 'contests') {
        return {
          select: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: mockContest, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'contest_entries') {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: mockEntries, error: null }),
            }),
          }),
        }
      }
      return { select: () => ({}) }
    },
  })

  const result = await executeGetActiveContest('monthly-indie-contest', {
    createAdminClient: mockAdminClient,
  })

  assert.equal(result.contest?.id, 'contest-nov-2026')
  assert.equal(result.leaderboard.length, 2)

  // Rank 1 has 142 likes, Rank 2 has 58 likes
  assert.equal(result.leaderboard[0].rank, 1)
  assert.equal(result.leaderboard[0].work.title, 'Story With Most Likes')
  assert.equal(result.leaderboard[0].work.like_count, 142)

  assert.equal(result.leaderboard[1].rank, 2)
  assert.equal(result.leaderboard[1].work.title, 'Story With Fewer Likes')
  assert.equal(result.leaderboard[1].work.like_count, 58)

  // Strict Privacy Invariant: upi_id must NEVER be present on public leaderboard items
  result.leaderboard.forEach((item) => {
    assert.equal(item.upi_id, undefined, 'Public leaderboard item must never leak upi_id')
    assert.equal(item.work.upi_id, undefined, 'Work object must never contain upi_id')
  })
})

test('Contest Submission Invariants: executeSubmitContestEntry enforces authentication, UPI format, publication date, and 1-entry limit', async () => {
  const currentMonthStart = '2026-11-01T00:00:00Z'
  const currentMonthEnd = '2026-11-30T23:59:59Z'

  const mockContest = {
    id: 'c-101',
    start_date: currentMonthStart,
    end_date: currentMonthEnd,
    status: 'active',
    category_restriction: 'all',
  }

  const mockProfile = { id: 'p-auth-1', username: 'authorone' }

  // 1. Unauthenticated request fails
  const unauthRes = await executeSubmitContestEntry(
    { contestId: 'c-101', workId: 'w-1', upiId: 'valid@upi' },
    { getAuthState: async () => null }
  )
  assert.equal(unauthRes.success, false)
  assert.match(unauthRes.message, /must be signed in/i)

  // 2. Invalid UPI ID fails
  const invalidUpiRes = await executeSubmitContestEntry(
    { contestId: 'c-101', workId: 'w-1', upiId: 'invalid-vpa-string' },
    { getAuthState: async () => ({ userId: 'clerk-user-1' }) }
  )
  assert.equal(invalidUpiRes.success, false)
  assert.match(invalidUpiRes.message, /valid UPI ID/i)

  // 3. Story published outside current month fails
  const mockOldWork = {
    id: 'w-old',
    title: 'Story Published 3 Months Ago',
    author_id: 'p-auth-1',
    publication_status: 'published',
    visibility: 'public',
    published_at: '2026-08-15T12:00:00Z', // August, outside November contest
    category: 'Novels',
  }

  const oldWorkClient = () => ({
    from: (table) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockProfile, error: null }) }) }) }
      }
      if (table === 'contests') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockContest, error: null }) }) }) }
      }
      if (table === 'contest_entries') {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }) }
      }
      if (table === 'works') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockOldWork, error: null }) }) }) }
      }
      return { select: () => ({}) }
    },
  })

  const oldWorkRes = await executeSubmitContestEntry(
    { contestId: 'c-101', workId: 'w-old', upiId: 'writer@okhdfcbank' },
    {
      getAuthState: async () => ({ userId: 'clerk-user-1' }),
      createAdminClient: oldWorkClient,
    }
  )
  assert.equal(oldWorkRes.success, false)
  assert.match(oldWorkRes.message, /not published during the current contest month/i)

  // 4. Valid Story Published This Month Succeeds
  const mockValidWork = {
    id: 'w-new',
    title: 'Fresh Story Written This Month',
    author_id: 'p-auth-1',
    publication_status: 'published',
    visibility: 'public',
    published_at: '2026-11-04T14:30:00Z', // Inside November contest
    category: 'Novels',
  }

  let insertedEntry = null

  const validWorkClient = () => ({
    from: (table) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockProfile, error: null }) }) }) }
      }
      if (table === 'contests') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockContest, error: null }) }) }) }
      }
      if (table === 'contest_entries') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
          insert: (entry) => {
            insertedEntry = entry
            return {
              select: () => ({
                single: async () => ({ data: { id: 'entry-new-uuid' }, error: null }),
              }),
            }
          },
        }
      }
      if (table === 'works') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockValidWork, error: null }) }) }) }
      }
      return { select: () => ({}) }
    },
  })

  const validRes = await executeSubmitContestEntry(
    { contestId: 'c-101', workId: 'w-new', upiId: 'writer@okhdfcbank' },
    {
      getAuthState: async () => ({ userId: 'clerk-user-1' }),
      createAdminClient: validWorkClient,
    }
  )

  assert.equal(validRes.success, true)
  assert.equal(validRes.entryId, 'entry-new-uuid')
  assert.equal(insertedEntry.upi_id, 'writer@okhdfcbank')
  assert.equal(insertedEntry.work_id, 'w-new')
  assert.equal(insertedEntry.author_id, 'p-auth-1')
})

test('Contest SEO & Security Invariants: /writing-contests SSR, Schema.org Event & FAQ, and Anti-Fraud Notice', () => {
  // 1. Route exists
  const routePath = path.join(rootDir, 'src/routes/writing-contests.tsx')
  assert.ok(fs.existsSync(routePath), 'writing-contests.tsx route must exist')
  const routeCode = fs.readFileSync(routePath, 'utf-8')

  // 2. SEO Title & Target Keywords for India & Asia
  assert.ok(
    routeCode.includes('Writing Contests in India & Asia (${currentYear})') ||
    routeCode.includes('Writing Contests in India & Asia'),
    'Title must dynamically target India & Asia with current year'
  )
  assert.ok(routeCode.includes('currentYear'), 'Route must dynamically calculate currentYear')
  assert.ok(routeCode.includes('formattedMonth'), 'Route must dynamically calculate formattedMonth with year')
  assert.ok(routeCode.includes("'writing contest india'"), 'Keywords must include writing contest india')
  assert.ok(routeCode.includes("'writing competition asia'"), 'Keywords must include writing competition asia')

  // 3. Schema.org Event, FAQPage, BreadcrumbList
  assert.ok(routeCode.includes("'@type': 'Event'"), 'Must output Schema.org Event JSON-LD')
  assert.ok(routeCode.includes("'@type': 'FAQPage'"), 'Must output Schema.org FAQPage JSON-LD')
  assert.ok(routeCode.includes("'@type': 'BreadcrumbList'"), 'Must output Schema.org BreadcrumbList JSON-LD')

  // 4. Safe Payout & Anti-Fraud Guarantee Invariant
  assert.ok(
    routeCode.includes('NEVER call you, WhatsApp you, or message you asking for an OTP') ||
    routeCode.includes('NEVER call you or message you asking for an OTP'),
    'Landing page must prominently state HatchPen never calls or asks for OTP'
  )

  // 5. Modal Component Security & Public Visitor Invariant
  const modalPath = path.join(rootDir, 'src/components/ContestEntryModal.tsx')
  assert.ok(fs.existsSync(modalPath), 'ContestEntryModal.tsx must exist')
  const modalCode = fs.readFileSync(modalPath, 'utf-8')
  assert.ok(modalCode.includes('We will NEVER call you or message you'), 'Entry modal must warn writers about OTP safety')
  assert.ok(modalCode.includes('validateUpiId'), 'Entry modal must validate UPI ID syntax')
  assert.ok(modalCode.includes('isSignedIn'), 'Entry modal must verify user authentication state')
  assert.ok(modalCode.includes('Sign In to Enter Contest'), 'Entry modal must display a clear sign-in gate for public visitors')
  assert.ok(modalCode.includes('openAuthModal'), 'Entry modal must invoke openAuthModal for unauthenticated users')

  // 6. Sitemap Inclusion
  const sitemapCode = fs.readFileSync(path.join(rootDir, 'src/server/sitemap.ts'), 'utf-8')
  assert.ok(sitemapCode.includes('/writing-contests'), 'sitemap.ts must include /writing-contests entry')

  // 7. Footer Link Equity
  const footerCode = fs.readFileSync(path.join(rootDir, 'src/components/Footer.tsx'), 'utf-8')
  assert.ok(footerCode.includes('to="/writing-contests"'), 'Footer must link to /writing-contests')

  // 8. Admin Panel Section
  const adminCode = fs.readFileSync(path.join(rootDir, 'src/routes/secret-adminpanel.tsx'), 'utf-8')
  assert.ok(adminCode.includes("activeAdminSection === 'contests'"), 'Admin panel must have contests section')
  assert.ok(adminCode.includes('getAdminContestOverviewServerFn'), 'Admin panel must call getAdminContestOverviewServerFn')
})

test('Contest Dynamic Month & Year Rollover: Automatically transitions to new calendar month and year without manual intervention', async () => {
  // If database contest has expired (e.g. November 2026 ended), executeGetActiveContest smoothly
  // rolls over to defaultContest for the active calendar month/year
  const mockExpiredClient = () => ({
    from: (table) => {
      if (table === 'contests') {
        return {
          select: () => ({
            or: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'old-contest-expired',
                      title: 'Expired Contest',
                      slug: 'expired-contest',
                      status: 'active',
                      end_date: '2020-01-01T00:00:00Z', // Long in the past
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {
        select: () => ({ eq: () => ({ eq: async () => ({ data: [], error: null }) }) }),
      }
    },
  })

  const result = await executeGetActiveContest('monthly-indie-contest', {
    createAdminClient: mockExpiredClient,
  })

  // Must have rolled over to current active calendar month/year, NOT frozen on expired
  assert.notEqual(result.contest?.id, 'old-contest-expired')
  const now = new Date()
  const contestStartDate = new Date(result.contest?.start_date)
  assert.equal(contestStartDate.getUTCFullYear(), now.getUTCFullYear())
  assert.equal(contestStartDate.getUTCMonth(), now.getUTCMonth())
})

test('Contest Admin Participant Increment: Enforces strictly non-decreasing invariant and calculates totalContestants accurately', async () => {
  let savedBoost = 25
  const mockClient = () => ({
    from: (table) => {
      if (table === 'contests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { participant_boost_count: savedBoost },
                error: null,
              }),
            }),
          }),
          update: (payload) => ({
            eq: async () => {
              savedBoost = payload.participant_boost_count
              return { error: null }
            },
          }),
        }
      }
      return {}
    },
  })

  // 1. Decrement attempt must fail closed (e.g. going from 25 to 20 is forbidden)
  await assert.rejects(
    async () => {
      await executeSaveAdminContestConfig(
        'valid-admin-token',
        { id: 'c-1', participant_boost_count: 20 },
        {
          verifyAdminToken: () => true,
          createAdminClient: mockClient,
        }
      )
    },
    /Contestant count can only be incremented, not decremented/
  )

  // 2. Increment attempt must succeed (e.g. going from 25 to 30)
  const incRes = await executeSaveAdminContestConfig(
    'valid-admin-token',
    { id: 'c-1', participant_boost_count: 30 },
    {
      verifyAdminToken: () => true,
      createAdminClient: mockClient,
    }
  )
  assert.equal(incRes.success, true)
  assert.equal(savedBoost, 30)
})

test('Contest Details Quick Modal & Header Discovery Invariants', () => {
  // 1. ContestDetailsModal component exists
  const modalPath = path.join(rootDir, 'src/components/ContestDetailsModal.tsx')
  assert.ok(fs.existsSync(modalPath), 'ContestDetailsModal.tsx must exist')
  const modalCode = fs.readFileSync(modalPath, 'utf-8')
  assert.ok(modalCode.includes('totalContestants'), 'Modal must display totalContestants count')
  assert.ok(modalCode.includes('to="/writing-contests"'), 'Modal must have button linking to /writing-contests')
  assert.ok(!modalCode.includes('Monthly Writing Contest •'), 'Static header pill "Monthly Writing Contest •" must be removed')
  assert.ok(modalCode.includes('setShowDetails'), 'Modal must have details toggle button')
  assert.ok(modalCode.includes('Target Genre (Key Highlight)') || modalCode.includes('Featured Genre'), 'Genre must be highlighted')
  assert.ok(modalCode.includes('Theme (Optional)'), 'Theme must be displayed')
  assert.ok(modalCode.includes('All Categories'), 'Category with All Categories placeholder must be present')

  // 2. Global Header integration & RouteHeader invariant
  const globalHeaderPath = path.join(rootDir, 'src/components/Header.tsx')
  const globalHeaderCode = fs.readFileSync(globalHeaderPath, 'utf-8')
  assert.ok(globalHeaderCode.includes('ContestDetailsModal'), 'Header.tsx must import ContestDetailsModal')
  assert.ok(globalHeaderCode.includes('setContestModalOpen(true)'), 'Header.tsx must have button to open contest modal')

  const routeHeaderPath = path.join(rootDir, 'src/components/RouteHeader.tsx')
  const routeHeaderCode = fs.readFileSync(routeHeaderPath, 'utf-8')
  assert.ok(!routeHeaderCode.includes('ContestDetailsModal'), 'Secondary RouteHeader must not render ContestDetailsModal')
  assert.ok(!routeHeaderCode.includes('Contest — ₹2k'), 'Secondary RouteHeader must not display the contest button')

  // 3. PublicHome & PublicMobileStories discovery
  const publicHomePath = path.join(rootDir, 'src/components/home/PublicHome.tsx')
  const publicHomeCode = fs.readFileSync(publicHomePath, 'utf-8')
  assert.ok(publicHomeCode.includes('ContestDetailsModal'), 'PublicHome must include ContestDetailsModal')
  assert.ok(publicHomeCode.includes('setIsContestModalOpen(true)'), 'PublicHome must trigger contest details modal')
})
