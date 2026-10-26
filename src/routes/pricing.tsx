import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, ArrowRight, ShieldCheck, Sparkles, BookOpen, PenTool, HelpCircle } from 'lucide-react'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/pricing')({
  head: () =>
    generateMeta({
      title: 'Pricing & Access — 100% Free for Readers & Writers',
      description:
        'HatchPen is completely free. Read serialized fiction, publish original stories, and build your author community with zero subscription fees or paywalls.',
      canonicalUrl: 'https://hatchpen.com/pricing',
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Pricing & Access — 100% Free for Readers & Writers — HatchPen',
        url: 'https://hatchpen.com/pricing',
        description:
          'HatchPen is completely free. Read serialized fiction, publish original stories, and build your author community with zero subscription fees or paywalls.',
      },
    }),
  component: PricingPage,
})

export default function PricingPage() {
  return (
    <div className="min-h-screen pb-20 bg-[var(--bg-canvas)]">
      {/* Route Header */}
      <RouteHeader
        title="Pricing & Access"
        subtitle="Transparent, zero-cost access for readers and writers"
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[var(--ink-primary)] leading-tight">
            No Paywalls. No Subscriptions. Just Literature.
          </h1>

          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed max-w-2xl mx-auto">
            HatchPen believes original serialized fiction, essays, and literary manuscripts should be accessible to everyone. Readers discover without friction; writers create without platform fees or revenue cuts.
          </p>
        </div>

        {/* Two Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Reader Access Pillar */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all hover:border-[var(--border-strong)]">
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
                  For Readers
                </h2>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1">
                  Enjoy immersive long-form literature and serial narratives at zero cost.
                </p>
              </div>

              <div className="pt-2 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--ink-primary)] font-mono">$0</span>
                <span className="text-xs text-[var(--ink-muted)] ml-2">/ forever free</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[var(--ink-primary)]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Unlimited reading of all public serialized works & chapters</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Personal library, bookmarking, and reading history synchronization</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Customizable typography, font sizes, sepia, linen, and night reading themes</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>No intrusive banner popups or locked chapter paywalls</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/discover"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs sm:text-sm font-medium hover:opacity-90 transition-all no-underline shadow-xs"
              >
                <span>Browse Public Stories</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Writer Access Pillar */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all hover:border-[var(--border-strong)]">
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
                  For Writers & Authors
                </h2>
                <p className="text-xs sm:text-sm text-[var(--ink-muted)] mt-1">
                  Serialize manuscripts and cultivate a dedicated literary readership.
                </p>
              </div>

              <div className="pt-2 pb-4 border-b border-[var(--border-subtle)]">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--ink-primary)] font-mono">$0</span>
                <span className="text-xs text-[var(--ink-muted)] ml-2">/ no author fees</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-[var(--ink-primary)]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Full serialization suite: publish works, acts, and numbered chapters</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>100% Intellectual Property ownership: you retain all rights to your work</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Author profile with custom handle, bio, and catalog archive</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Distraction-free markdown drafting desk with instant auto-save</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                to="/write"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-[var(--border-strong)] bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--ink-primary)] text-xs sm:text-sm font-medium transition-all no-underline shadow-xs"
              >
                <span>Open Creator Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Transparent FAQ Section */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-2 text-[var(--ink-primary)] font-serif text-xl sm:text-2xl font-bold">
            <HelpCircle className="w-5 h-5 text-[#B94F37]" />
            <h2>Frequently Asked Questions About HatchPen Pricing</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Are there really no fees to read or publish?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                Yes. HatchPen is entirely free for readers and authors. There are no paid tiers, subscription paywalls, or fees to serialize your stories.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Do I need to enter a credit card?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                Never. We do not ask for or store payment credentials. You only need a free account to track reading progress or publish stories.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Who owns the rights to my published stories?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                You retain 100% of your copyright and intellectual property. HatchPen does not claim ownership or exclusive distribution rights over your manuscripts.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                How is HatchPen supported?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed">
                HatchPen is part of the Relay ecosystem, focused on advancing independent digital literature and supporting indie serial authors during open access.
              </p>
            </div>
          </div>
        </div>

        {/* App & Platform Callout */}
        <div className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="font-serif text-lg font-bold text-[var(--ink-primary)]">
              Modern Web App — Zero Download Required
            </h3>
            <p className="text-xs text-[var(--ink-muted)] max-w-xl">
              HatchPen works seamlessly across Chrome, Safari, Firefox, and Edge on iOS, Android, macOS, and Windows. Add it directly to your home screen for an app-like reading experience.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 px-5 py-2.5 rounded-full bg-[#18181B] dark:bg-white text-white dark:text-[#18181B] text-xs font-medium hover:opacity-90 transition-all no-underline shadow-xs"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  )
}
