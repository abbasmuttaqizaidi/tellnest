import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Check,
  X,
  Trophy,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Coins,
  Flame,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Feather,
  HeartHandshake,
} from 'lucide-react'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/wattpad-alternative')({
  head: () =>
    generateMeta({
      title: 'Best Wattpad Alternative for Serialized Fiction & Web Novels — HatchPen',
      description:
        'Looking for sites like Wattpad with no paywalls or coin systems? HatchPen offers 100% free chapter-by-chapter reading, genuine reader reach for underrated stories, and regular writing contests with ₹2,000 cash prizes.',
      canonicalUrl: 'https://hatchpen.com/wattpad-alternative',
      keywords: [
        'wattpad alternative',
        'sites like wattpad',
        'wattpad alternatives 2026',
        'free serialized stories',
        'writing contests cash prize',
        'read web novels free',
        'indie fiction platform',
        'publish stories without paywalls',
        'wattpad alternative without coins',
        'underrated stories',
      ],
      ogType: 'website',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Best Wattpad Alternative for Serialized Fiction & Web Novels — HatchPen',
          url: 'https://hatchpen.com/wattpad-alternative',
          description:
            'Looking for sites like Wattpad with no paywalls or coin systems? HatchPen offers 100% free chapter-by-chapter reading, genuine reader reach for underrated stories, and regular writing contests with ₹2,000 cash prizes.',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Why is HatchPen considered the best Wattpad alternative?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Unlike Wattpad, HatchPen has zero coin paywalls, zero wait-to-unlock chapter locks, and zero invasive banner ads. HatchPen prioritizes emerging indie authors and underrated stories so new writers can build a real, genuine audience from Chapter 1 without needing thousands of existing followers.',
              },
            },
            {
              '@type': 'Question',
              name: 'Are all stories on HatchPen completely free to read?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes! HatchPen is 100% free for readers. Every published chapter across all genres—romance, fantasy, thrillers, fan fiction, and literary serials—is accessible chapter-by-chapter without coins, tokens, or subscription gates.',
              },
            },
            {
              '@type': 'Question',
              name: 'How does the HatchPen writing contest with ₹2,000 cash prize work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'HatchPen hosts regular serialized writing contests to celebrate indie writers. Authors publish and tag their original serialized stories during the contest window. The winning story receives a direct ₹2,000 INR cash prize, permanent top-shelf editorial placement, and dedicated platform spotlight.',
              },
            },
            {
              '@type': 'Question',
              name: 'Can I cross-post stories that I already published on Wattpad to HatchPen?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Absolutely! As long as you own the copyright and haven’t signed an exclusive distribution contract elsewhere, you can freely publish or cross-post your stories to HatchPen to reach a fresh, highly engaged readership.',
              },
            },
            {
              '@type': 'Question',
              name: 'Do authors retain full copyright of their work on HatchPen?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, 100%. Writers retain all intellectual property and publishing rights to their manuscripts. You are completely free to serialize, edit, adapt, or unpublish your stories at any time.',
              },
            },
          ],
        },
      ],
    }),
  component: WattpadAlternativePage,
})

export default function WattpadAlternativePage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx)
  }

  const COMPARISON_ROWS = [
    {
      feature: 'Reading Cost & Paywalls',
      wattpad: 'Paid coins, chapter wait timers, locked stories',
      hatchpen: '100% Free forever. Zero coins, zero paywalls',
      hatchpenHighlight: true,
    },
    {
      feature: 'New Writer Visibility',
      wattpad: 'Buried under algorithmic bias favoring 10M+ read books',
      hatchpen: 'New Voices First — genuine reach from Chapter 1',
      hatchpenHighlight: true,
    },
    {
      feature: 'Writing Contests & Prizes',
      wattpad: 'Sticker badges, rare cash, exclusive platform lock-in',
      hatchpen: 'Regular Writing Contests with ₹2,000 Cash Prize',
      hatchpenHighlight: true,
    },
    {
      feature: 'Reading Environment',
      wattpad: 'Pop-up video ads, promotional interruptions, coin prompts',
      hatchpen: 'Distraction-free typographic reader, zero intrusive ads',
      hatchpenHighlight: true,
    },
    {
      feature: 'Reader Feedback & Community',
      wattpad: 'Lost in millions of short comments or meme reactions',
      hatchpen: 'Thoughtful chapter marginalia & genuine reader connections',
      hatchpenHighlight: false,
    },
    {
      feature: 'Writer Rights & Freedom',
      wattpad: 'Complex exclusivity tiers and contract retention',
      hatchpen: '100% Author Ownership. Retain full copyright always',
      hatchpenHighlight: true,
    },
  ]

  const FAQS = [
    {
      question: 'Why is HatchPen considered the best Wattpad alternative?',
      answer:
        'Unlike Wattpad, HatchPen has zero coin paywalls, zero wait-to-unlock chapter locks, and zero invasive banner ads. HatchPen prioritizes emerging indie authors and underrated stories so new writers can build a real, genuine audience from Chapter 1 without needing thousands of existing followers.',
    },
    {
      question: 'Are all stories on HatchPen completely free to read?',
      answer:
        'Yes! HatchPen is 100% free for readers. Every published chapter across all genres—romance, fantasy, thrillers, fan fiction, and serialized fiction—is accessible chapter-by-chapter without coins, tokens, or subscription gates.',
    },
    {
      question: 'How does the HatchPen writing contest with ₹2,000 cash prize work?',
      answer:
        'HatchPen hosts regular serialized writing contests to celebrate indie writers. Authors publish and tag their original serialized stories during the contest window. The winning story receives a direct ₹2,000 INR cash prize, permanent top-shelf editorial placement, and dedicated platform spotlight.',
    },
    {
      question: 'Can I cross-post stories that I already published on Wattpad to HatchPen?',
      answer:
        'Absolutely! As long as you own the copyright and haven’t signed an exclusive distribution contract elsewhere, you can freely publish or cross-post your stories to HatchPen to reach a fresh, highly engaged readership.',
    },
    {
      question: 'Do authors retain full copyright of their work on HatchPen?',
      answer:
        'Yes, 100%. Writers retain all intellectual property and publishing rights to their manuscripts. You are completely free to serialize, edit, adapt, or unpublish your stories at any time.',
    },
  ]

  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-canvas)]">
      {/* Route Header */}
      <RouteHeader
        title="Wattpad Alternative"
        subtitle="The quiet, free platform for authentic serialized reading & writing"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-16 sm:space-y-24">
        {/* =========================================================================
            1. HERO SECTION
            ========================================================================= */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[#B94F37] text-xs font-semibold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#B94F37]" />
            <span>The Genuine Indie Alternative</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--ink-primary)] leading-[1.08]">
            The Quiet, Free Alternative to <span className="text-[#B94F37]">Wattpad</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--ink-muted)] leading-relaxed max-w-2xl mx-auto font-normal">
            No coin paywalls, no algorithmic lockouts. A distraction-free home where underrated stories find genuine readers, and emerging writers compete in regular writing contests with real cash prizes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#201F1D] text-[#F2EDE3] dark:bg-[#F2EDE3] dark:text-[#201F1D] text-sm font-semibold hover:opacity-90 transition-all shadow-sm no-underline"
            >
              <span>Start Reading Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/write"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-[var(--border-strong)] text-[var(--ink-primary)] text-sm font-semibold hover:bg-[var(--bg-surface)] transition-all no-underline"
            >
              <Feather className="w-4 h-4 text-[#B94F37]" />
              <span>Publish Your Story</span>
            </Link>
          </div>

          {/* Micro Trust Points */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 text-xs text-[var(--ink-muted)]">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Zero Coin Paywalls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>₹2,000 Writing Contest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>100% Writer Ownership</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Ad-Free Reader</span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. WRITING CONTEST SPOTLIGHT (₹2,000 CASH PRIZE)
            ========================================================================= */}
        <section className="rounded-3xl border-2 border-[#B94F37]/30 bg-gradient-to-br from-[var(--bg-surface)] via-[var(--bg-surface)] to-[#B94F37]/5 p-6 sm:p-10 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-[#B94F37]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B94F37]/10 text-[#B94F37] text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5" />
              <span>Writer Spotlight & Cash Reward</span>
            </div>

            <div className="space-y-3">
              <h2 className="font-serif text-2xl sm:text-4xl font-extrabold text-[var(--ink-primary)] leading-tight">
                The HatchPen Indie Writer Contest — <span className="text-[#B94F37]">₹2,000 Cash Prize</span>
              </h2>
              <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
                We believe emerging indie storytelling deserves real rewards, not just digital sticker badges. Every contest cycle, HatchPen celebrates original serialized stories. The winning writer takes home a direct <strong>₹2,000 cash prize</strong>, permanent top-shelf editorial placement, and platform-wide reader spotlight.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-primary)]">
                  <Award className="w-4 h-4 text-[#B94F37]" />
                  <span>Direct Cash Reward</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-normal">
                  ₹2,000 transferred straight to the winning author. No token conversions or hidden deductions.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-primary)]">
                  <Users className="w-4 h-4 text-[#B94F37]" />
                  <span>Fair Discovery, Not Bot Views</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-normal">
                  Evaluated on chapter engagement, reader completion, and narrative craft—never gamified view counters.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-primary)]">
                  <ShieldCheck className="w-4 h-4 text-[#B94F37]" />
                  <span>100% Rights Kept</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-normal">
                  Winning does not lock you into exclusive publisher contracts. Your intellectual property stays 100% yours.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-primary)]">
                  <Flame className="w-4 h-4 text-[#B94F37]" />
                  <span>Top Shelf Spotlight</span>
                </div>
                <p className="text-xs text-[var(--ink-muted)] leading-normal">
                  Winners gain sitewide feature placement in HatchPen’s curated collections and homepage hero feeds.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/write"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#B94F37] text-white text-sm font-semibold hover:bg-[#a0432e] transition-colors shadow-xs no-underline"
              >
                <span>Enter Your Serial in the Contest</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. CORE COMPARISON TABLE
            ========================================================================= */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[var(--ink-primary)]">
              Why Readers & Writers Are Making the Switch
            </h2>
            <p className="text-sm sm:text-base text-[var(--ink-muted)]">
              See how HatchPen compares directly to Wattpad across discovery, reading, and creator rewards.
            </p>
          </div>

          {/* Responsive Comparison Matrix */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60">
                    <th className="py-4 px-4 sm:px-6 font-mono text-xs uppercase tracking-wider text-[var(--ink-muted)] w-2/5">
                      Platform Feature
                    </th>
                    <th className="py-4 px-4 sm:px-6 font-mono text-xs uppercase tracking-wider text-neutral-400 w-[30%]">
                      Wattpad
                    </th>
                    <th className="py-4 px-4 sm:px-6 font-mono text-xs uppercase tracking-wider text-[#B94F37] font-bold w-[30%] bg-[#B94F37]/5">
                      HatchPen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[var(--bg-canvas)]/40 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6 font-medium text-[var(--ink-primary)]">
                        {row.feature}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-[var(--ink-muted)]">
                        <div className="flex items-start gap-2">
                          <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <span>{row.wattpad}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 font-semibold text-[var(--ink-primary)] bg-[#B94F37]/5">
                        <div className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#B94F37] shrink-0 mt-0.5" />
                          <span>{row.hatchpen}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. THREE CORE PILLARS
            ========================================================================= */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#B94F37]/10 flex items-center justify-center text-[#B94F37]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
              Underrated Stories First
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              We celebrate voice and craftsmanship rather than sensational clickbait. Readers discover hidden gems that never get buried by commercial popularity algorithms.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
              Zero-Friction Free Reading
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              No reader should ever get locked out of a cliffhanger chapter by a coin barrier. Read effortlessly on mobile, tablet, or desktop in any standard browser.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
              Genuine Author Community
            </h3>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
              Receive thoughtful marginalia notes and real discussions from readers who care about narrative arcs, character development, and serialized storytelling.
            </p>
          </div>
        </section>

        {/* =========================================================================
            5. FREQUENTLY ASKED QUESTIONS
            ========================================================================= */}
        <section className="space-y-6 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-2">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ink-muted)]">
              Everything you need to know about switching from Wattpad to HatchPen.
            </p>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 sm:px-6">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div key={idx} className="py-4 sm:py-5">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between text-left text-sm sm:text-base font-semibold text-[var(--ink-primary)] focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#B94F37] shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--ink-muted)] shrink-0 ml-2" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="mt-2.5 pr-4 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* =========================================================================
            6. BOTTOM CTA
            ========================================================================= */}
        <section className="text-center max-w-2xl mx-auto py-8 sm:py-12 space-y-5 border-t border-[var(--border-subtle)]">
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[var(--ink-primary)]">
            Ready for a Quieter Place with Bolder Stories?
          </h2>
          <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
            Join thousands of readers and writers who have stepped beyond algorithmic hype to discover original serialized fiction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              to="/discover"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#201F1D] text-[#F2EDE3] dark:bg-[#F2EDE3] dark:text-[#201F1D] text-sm font-semibold hover:opacity-90 transition-all shadow-sm no-underline"
            >
              <span>Start Reading Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/write"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-[var(--border-strong)] text-[var(--ink-primary)] text-sm font-semibold hover:bg-[var(--bg-surface)] transition-all no-underline"
            >
              <span>Publish Your Story</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
