import { createFileRoute } from '@tanstack/react-router'
import { FileText, BookOpen, ShieldAlert, Award, Mail, CheckCircle2 } from 'lucide-react'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/terms')({
  head: () =>
    generateMeta({
      title: 'Terms of Service — HatchPen',
      description:
        'HatchPen Terms of Service. Understand rights, author copyright protections, community standards, and platform usage guidelines.',
      canonicalUrl: 'https://hatchpen.com/terms',
      ogType: 'website',
      noindex: false,
    }),
  component: TermsOfServicePage,
})

export default function TermsOfServicePage() {
  const lastUpdated = 'October 30, 2026'

  return (
    <div className="min-h-screen pb-24 bg-[var(--bg-canvas)]">
      <RouteHeader
        title="Terms of Service"
        subtitle={`Last updated: ${lastUpdated}`}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Header Intro Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <FileText className="w-6 h-6" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
              HatchPen Terms of Service
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Welcome to HatchPen (<span className="font-mono text-xs font-semibold">https://hatchpen.com</span>). By
            accessing or using our digital literary platform, reading serialized fiction, or publishing original stories,
            you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </div>

        {/* Section 1: Acceptance & Eligibility */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              1
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Acceptance & Eligibility
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              By accessing HatchPen, you represent that you are at least 13 years of age (or the minimum legal age required
              in your jurisdiction) and possess the legal capacity to enter into these terms.
            </p>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities
              conducted under your account.
            </p>
          </div>
        </section>

        {/* Section 2: Author Ownership & Copyright (Crucial for Writers) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              2
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Writers Retain 100% Intellectual Property & Copyright
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
              <Award className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium">
                You retain complete, exclusive ownership and copyright of all original stories, manuscripts, chapters,
                characters, and poetry that you publish on HatchPen.
              </p>
            </div>
            <p>
              By publishing or uploading content to HatchPen, you grant HatchPen a worldwide, non-exclusive, royalty-free
              license solely to host, display, format, distribute, and index your content on the platform and to search engines
              for reading and discovery purposes.
            </p>
            <p>
              You have the right to edit, unpublish, or permanently delete your stories at any time. HatchPen claims zero
              ownership, film/print rights, or exclusivity over your creative work.
            </p>
          </div>
        </section>

        {/* Section 3: Community Guidelines & Acceptable Use */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              3
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Acceptable Use & Community Standards
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>To preserve a thoughtful, respectful community for literature, you agree not to upload or engage in:</p>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>
                <strong className="text-[var(--ink-primary)]">Plagiarism & Infringement:</strong> Content that infringes
                upon the intellectual property, copyright, trademark, or rights of others.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Hate Speech & Harassment:</strong> Defamatory, abusive,
                harassing, or violently discriminatory material against individuals or groups.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Automated Scraping & Flooding:</strong> Unauthorized
                mass automated scraping, denial of service attacks, artificial reading-count manipulation, or spamming.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Illegal Content:</strong> Any material violating local or
                international laws.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Platform Availability & Termination */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              4
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Account Suspension & Platform Availability
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              We reserve the right to suspend or terminate accounts, or remove published content, that violates these
              Terms of Service, community safety rules, or applicable copyright laws.
            </p>
            <p>
              We strive for continuous platform availability but do not guarantee uninterrupted service. HatchPen is
              provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.
            </p>
          </div>
        </section>

        {/* Section 5: Limitation of Liability */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              5
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Limitation of Liability
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              To the fullest extent permitted by law, HatchPen and its operators shall not be liable for any indirect,
              incidental, consequential, or punitive damages resulting from your access to or inability to use the platform.
            </p>
          </div>
        </section>

        {/* Section 6: Contact */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[var(--ink-primary)]">
            <Mail className="w-5 h-5 text-emerald-600" />
            <h2 className="font-serif text-xl font-bold">Questions Regarding Terms</h2>
          </div>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            If you have questions about these Terms of Service or need to report copyright violations, please contact us at:
          </p>
          <div className="pt-2 text-sm">
            <p className="font-semibold text-[var(--ink-primary)]">HatchPen Legal & Support</p>
            <p className="text-[var(--ink-muted)]">
              Email:{' '}
              <a href="mailto:support@hatchpen.com" className="text-emerald-600 underline font-mono">
                support@hatchpen.com
              </a>
            </p>
            <p className="text-[var(--ink-muted)]">Website: https://hatchpen.com</p>
          </div>
        </section>
      </div>
    </div>
  )
}
