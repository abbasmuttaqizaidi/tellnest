import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  Trophy,
  Sparkles,
  Award,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ShieldAlert,
  Calendar,
  Clock,
  Heart,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Flame,
  Users,
} from 'lucide-react'
import { generateMeta } from '../lib/seo'
import { getActiveContestServerFn, type ContestPublicPageData } from '../server/contests'
import { ContestEntryModal } from '../components/ContestEntryModal'
import { formatHeartCount } from '../lib/utils'

export const Route = createFileRoute('/writing-contests')({
  staleTime: 60_000,
  gcTime: 5 * 60 * 1000,
  loader: async (): Promise<ContestPublicPageData> => {
    try {
      const data = await getActiveContestServerFn({ data: 'monthly-indie-contest' })
      return data
    } catch (err) {
      console.warn('[Route /writing-contests] Loader error:', err)
      const now = new Date()
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()
      return {
        contest: {
          id: 'default-monthly-contest',
          title: 'The HatchPen Indie Writer Contest — ₹2,000 Cash Prize',
          slug: 'monthly-indie-contest',
          contest_type: 'monthly',
          theme: 'Open Theme — Original Fiction & Web Serials',
          category_restriction: 'all',
          prize_inr: 2000,
          start_date: start,
          end_date: end,
          status: 'active',
          rules_notes: 'Maximum verified reader likes wins.',
        },
        leaderboard: [],
        totalEntries: 0,
        totalContestants: 0,
      }
    }
  },
  head: ({ loaderData }) => {
    const contest = loaderData?.contest
    const now = new Date()
    const contestDate = contest?.start_date ? new Date(contest.start_date) : now
    const currentYear = contestDate.getFullYear()
    const currentMonthLong = contestDate.toLocaleDateString('en-US', { month: 'long' })
    const formattedMonthYear = `${currentMonthLong} ${currentYear}`
    const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)).toISOString()
    const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59)).toISOString()

    const title = `Writing Contests in India & Asia (${currentYear}) — ₹2,000 Cash Prize & Free Entry | HatchPen`
    const description =
      `Participate in the ${formattedMonthYear} monthly online story writing contest in India and Asia with free entry and ₹2,000 cash prizes. Submit original serialized fiction, web novels, and short stories on HatchPen. Maximum reader likes wins.`
    const canonicalUrl = 'https://hatchpen.com/writing-contests'

    const eventJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: contest?.title ? `${contest.title} (${formattedMonthYear})` : `The HatchPen Indie Writer Contest (${formattedMonthYear})`,
      description,
      startDate: contest?.start_date || defaultStart,
      endDate: contest?.end_date || defaultEnd,
      eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'VirtualLocation',
        url: canonicalUrl,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
        url: canonicalUrl,
        availability: 'https://schema.org/InStock',
      },
      organizer: {
        '@type': 'Organization',
        name: 'HatchPen',
        url: 'https://hatchpen.com',
      },
    }

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is there any entry fee to participate in HatchPen writing contests in India & Asia?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. HatchPen writing contests are 100% free to enter. There are zero entry fees, zero hidden charges, and zero platform deduction from the cash prize.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is the winner determined in the Monthly Contest?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The winner is determined purely by verified reader engagement: the participating manuscript that accumulates the highest number of reader likes (hearts) by the end of the calendar month wins the ₹2,000 prize.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which stories are eligible for the Monthly Contest?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Any original manuscript published on HatchPen during the active contest calendar month is eligible. Authors must manually register their eligible manuscript to join the contest leaderboard.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is the ₹2,000 cash prize paid to the winning writer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The prize money is transferred directly to the winner via UPI (Unified Payments Interface) within 48 hours of month-end verification. International writers can receive equivalent funds via PayPal/Bank Transfer.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does HatchPen ask for OTP or bank credentials for prize distribution?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Never. HatchPen will NEVER call you or message you asking for an OTP, bank PIN, or passwords. We only need your public UPI ID (VPA) to directly send prize funds.',
          },
        },
      ],
    }

    const breadcrumbsJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://hatchpen.com',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Writing Contests',
          item: canonicalUrl,
        },
      ],
    }

    return generateMeta({
      title,
      description,
      canonicalUrl,
      keywords: [
        'writing contest india',
        'writing competition asia',
        `writing contests in india ${currentYear}`,
        `writing contest ${currentMonthLong.toLowerCase()} ${currentYear}`,
        'online story writing contest cash prize',
        'free entry writing competition india',
        'short story contest with prize',
        'indie author contest india',
        'web novel competition',
        'HatchPen writing contest',
      ],
      ogType: 'website',
      jsonLd: [eventJsonLd, faqJsonLd, breadcrumbsJsonLd],
      breadcrumbs: [
        { name: 'Home', url: '/' },
        { name: 'Writing Contests', url: canonicalUrl },
      ],
    })
  },
  component: WritingContestsPage,
})

function WritingContestsPage() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()
  const contest = loaderData?.contest
  const leaderboard = loaderData?.leaderboard || []
  const totalContestants =
    loaderData?.totalContestants ?? (leaderboard.length || 0) + (contest?.participant_boost_count || 0)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)

  // Calculate days remaining in contest month
  const daysLeft = useMemo(() => {
    if (!contest?.end_date) return 0
    const end = new Date(contest.end_date).getTime()
    const now = Date.now()
    const diff = end - now
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [contest?.end_date])

  const contestDate = useMemo(() => {
    return contest?.start_date ? new Date(contest.start_date) : new Date()
  }, [contest?.start_date])

  const formattedMonth = useMemo(() => {
    return contestDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [contestDate])

  return (
    <div className="min-h-screen py-4 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6 sm:space-y-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono text-[var(--ink-muted)]">
        <Link to="/" className="hover:text-[var(--ink-primary)] text-inherit no-underline">
          Home
        </Link>
        <span>/</span>
        <span className="text-[var(--ink-primary)] font-semibold">Writing Contests</span>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-10 md:p-12 shadow-xs text-center">
        <div className="max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
          <p className="text-xs sm:text-sm font-mono tracking-wide text-[var(--ink-muted)]">
            Pan-India & Asia Writers | <span className="bg-[var(--ink-primary)] text-[var(--accent-contrast)]">Free Entry</span>
          </p>

          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-[var(--ink-primary)] tracking-tight leading-tight">
            The HatchPen Indie Writer Contest — ₹{contest?.prize_inr.toLocaleString()} Cash Prize
          </h1>

          <p className="text-xs sm:text-base text-[var(--ink-secondary)] leading-relaxed font-sans max-w-2xl mx-auto">
            A genuine, transparent monthly writing competition for emerging authors in India and Asia. No vanity algorithms or paid boosts. The story that garners the most verified reader likes wins the ₹2,000 cash prize transferred directly via UPI.
          </p>

          {/* Quick Metrics Cards (Neutral Monochromatic & Fully Responsive) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 sm:pt-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block truncate">
                Cash Prize
              </span>
              <span className="text-sm sm:text-lg font-bold font-mono text-[var(--ink-primary)] block truncate">
                ₹{contest?.prize_inr.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block truncate">
                Entry Fee
              </span>
              <span className="text-sm sm:text-lg font-bold font-mono text-[var(--ink-primary)] block truncate">
                100% Free
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--ink-primary)] bg-[var(--bg-subtle)] shadow-md">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block truncate">
                Winning Rule
              </span>
              <span className="text-sm sm:text-lg font-bold font-mono text-[var(--ink-primary)] flex items-center justify-center gap-1 sm:gap-1.5 truncate">
                <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--ink-primary)] fill-[var(--ink-primary)] shrink-0" />
                <span>Max Likes</span>
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[var(--ink-tertiary)] block truncate">
                Days Left ({formattedMonth})
              </span>
              <span className="text-sm sm:text-lg font-bold font-mono text-[var(--ink-primary)] block truncate">
                {daysLeft} Days
              </span>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2 sm:pt-3">
            <button
              onClick={() => setIsEntryModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Enter Contest With Your Story</span>
            </button>

            <Link
              to="/write/new"
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] text-xs sm:text-sm font-semibold hover:bg-[var(--bg-surface)] transition-colors no-underline inline-flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Start Writing New Story</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Contestants Big Showcase Card (Replacing Leaderboard per user request) */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 md:p-14 shadow-xs text-center space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] font-mono text-[11px] sm:text-xs">
          <Users className="w-3.5 h-3.5 text-[var(--ink-primary)]" />
          <span>Active Contestants • {formattedMonth}</span>
        </div>

        <div className="space-y-2">
          <div className="font-serif sm:font-mono text-5xl sm:text-7xl md:text-8xl font-extrabold text-[var(--ink-primary)] tracking-tight leading-none">
            {totalContestants.toLocaleString()}
          </div>
          <h2 className="font-serif text-lg sm:text-2xl md:text-3xl font-bold text-[var(--ink-primary)] max-w-lg mx-auto pt-1 sm:pt-2 leading-snug">
            Indie Authors Competing This Month
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-xl mx-auto leading-relaxed font-sans px-2">
          Authors across India and Asia have submitted original manuscripts for the ₹{contest?.prize_inr.toLocaleString()} cash prize. Stories published during {formattedMonth} collect verified reader likes until month-end.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-md mx-auto">
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span>Submit Your Story Now</span>
          </button>
        </div>
      </section>

      {/* 
        Contest Leaderboard temporarily commented out per user instruction:
        Leaderboard story cards and rank podium preserved below for when leaderboard is unhidden.
      */}
      {/*
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
              <Flame className="w-4 h-4" />
              <span>Live Monthly Standings</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)] mt-1">
              Contest Leaderboard — {formattedMonth}
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--ink-muted)]">
            {leaderboard.length} Participating {leaderboard.length === 1 ? 'Manuscript' : 'Manuscripts'}
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3">
            <Trophy className="w-10 h-10 text-[var(--ink-tertiary)] mx-auto" />
            <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
              Be The First Writer To Enter This Month!
            </h3>
            <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto leading-relaxed">
              Submissions for {formattedMonth} are active. Publish an original manuscript on HatchPen this month and register it to take the #1 spot on the leaderboard.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsEntryModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[var(--ink-primary)] text-[var(--accent-contrast)] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Enter My Story Now
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaderboard.map((item) => {
              const isWinnerPodium = item.rank === 1
              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
                    isWinnerPodium
                      ? 'border-amber-500/50 bg-amber-500/5 shadow-xs'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                          item.rank === 1
                            ? 'bg-amber-500 text-white'
                            : item.rank === 2
                            ? 'bg-slate-400 text-white'
                            : item.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)]'
                        }`}
                      >
                        <span>Rank #{item.rank}</span>
                        {item.rank === 1 && <Trophy className="w-3 h-3 ml-0.5" />}
                      </span>

                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink-primary)]">
                        <Heart className="w-3.5 h-3.5 fill-[var(--ink-primary)] text-[var(--ink-primary)]" />
                        <span>{formatHeartCount(item.work.like_count)} Likes</span>
                      </span>
                    </div>

                    <div>
                      <Link
                        to="/works/$workId"
                        params={{ workId: item.work.slug || item.work.id }}
                        className="font-serif text-lg font-bold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors no-underline line-clamp-1"
                      >
                        {item.work.title}
                      </Link>
                      <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                        by{' '}
                        <span className="text-[var(--ink-primary)] font-medium">
                          {item.work.author.name}
                        </span>{' '}
                        • {item.work.category || item.work.genre || 'Story'}
                      </p>
                    </div>

                    {item.work.synopsis && (
                      <p className="text-xs text-[var(--ink-muted)] line-clamp-2 leading-relaxed font-sans">
                        {item.work.synopsis}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] mt-3 flex items-center justify-between text-xs">
                    {false && (
                      <span className="text-[11px] font-mono text-[var(--ink-tertiary)]">
                        Published {new Date(item.work.published_at).toLocaleDateString()}
                      </span>
                    )}
                    <Link
                      to="/works/$workId"
                      params={{ workId: item.work.slug || item.work.id }}
                      className="font-medium text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1 no-underline"
                    >
                      <span>Read & Like</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
      */}

      {/* Rules & Eligibility Guidelines */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-8 space-y-3 sm:space-y-4">
        <h3 className="font-serif text-lg sm:text-2xl font-bold text-[var(--ink-primary)]">
          Contest Rules & Submission Guidelines
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5 text-xs text-[var(--ink-secondary)] leading-relaxed font-sans">
          <div className="space-y-1.5 p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <h4 className="font-semibold text-sm text-[var(--ink-primary)]">1. Publication Window</h4>
            <p>
              Your manuscript must be publicly published on HatchPen during the active contest month ({formattedMonth}). Drafts created previously are eligible as long as they were published this month.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <h4 className="font-semibold text-sm text-[var(--ink-primary)]">2. Transparent Like Voting</h4>
            <p>
              The winner is determined purely by verified reader likes. Share your chapter links with your friends, social media, and readers to collect likes. One entry per author per month.
            </p>
          </div>

          <div className="space-y-1.5 p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <h4 className="font-semibold text-sm text-[var(--ink-primary)]">3. Instant UPI Payout</h4>
            <p>
              Prize money of ₹2,000 is transferred directly to the winner's UPI ID within 48 hours of month-end verification. No hidden cuts, taxes, or deduction.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Security Guarantee Banner */}
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-8 space-y-2.5 sm:space-y-3">
        <div className="flex items-start sm:items-center gap-2 sm:gap-2.5 text-emerald-800 dark:text-emerald-400 font-serif text-base sm:text-xl font-bold">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
          <h3>Safe Payout & Anti-Fraud Guarantee</h3>
        </div>
        <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans max-w-3xl">
          HatchPen believes in 100% creator transparency. We will <strong>NEVER call you, WhatsApp you, or message you asking for an OTP, bank PIN, or passwords</strong>. We ONLY require your public UPI ID to transfer prize money. Never share bank details or OTP with anyone.
        </p>
      </section>

      {/* Frequently Asked Questions */}
      <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-10 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2 text-[var(--ink-primary)] font-serif text-lg sm:text-2xl font-bold">
          <HelpCircle className="w-5 h-5 text-[var(--accent)] shrink-0" />
          <h2>Frequently Asked Questions</h2>
        </div>

        <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-1">
          <details className="group py-3 sm:py-3.5 [&_summary::-webkit-details-marker]:hidden" open>
            <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>Is there any entry fee to participate in HatchPen writing contests?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-2 sm:pr-4">
              No. HatchPen writing contests are 100% free to enter. There are no entry fees, subscription gates, or paywalls required.
            </p>
          </details>

          <details className="group py-3 sm:py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>How is the winner determined in the Monthly Contest?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-2 sm:pr-4">
              The winner is determined purely by verified reader engagement: the participating manuscript that accumulates the highest number of reader likes (hearts) by the end of the calendar month wins the ₹2,000 prize.
            </p>
          </details>

          <details className="group py-3 sm:py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>Who is eligible to participate from India & Asia?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-2 sm:pr-4">
              All independent authors and writers based in India, South Asia, and across Asia are eligible. Stories must be written in English across fiction, romance, fantasy, poetry, or essays.
            </p>
          </details>

          <details className="group py-3 sm:py-3.5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between cursor-pointer list-none text-xs sm:text-sm font-semibold text-[var(--ink-primary)] hover:text-[var(--accent)] transition-colors">
              <span>Do authors retain copyright of their manuscripts?</span>
              <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] group-open:rotate-180 transition-transform duration-200 shrink-0 ml-2" />
            </summary>
            <p className="mt-2 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed font-sans pr-2 sm:pr-4">
              Yes, 100%. Authors retain all rights, copyright, and ownership of their stories. HatchPen never claims exclusive or publishing rights over your intellectual property.
            </p>
          </details>
        </div>
      </section>

      {/* Entry Modal */}
      {contest && (
        <ContestEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setIsEntryModalOpen(false)}
          contest={contest}
          onSuccess={async () => {
            // Smoothly refresh data without white-screen page reload
            await router.invalidate()
          }}
        />
      )}
    </div>
  )
}
