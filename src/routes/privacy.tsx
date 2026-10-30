import { createFileRoute } from '@tanstack/react-router'
import { Shield, Lock, FileText, Mail, CheckCircle2 } from 'lucide-react'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () =>
    generateMeta({
      title: 'Privacy Policy — HatchPen',
      description:
        'HatchPen Privacy Policy. Learn how we collect, protect, and respect your personal information and Google user data.',
      canonicalUrl: 'https://hatchpen.com/privacy',
      ogType: 'website',
      noindex: false,
    }),
  component: PrivacyPolicyPage,
})

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 30, 2026'

  return (
    <div className="min-h-screen pb-24 bg-[var(--bg-canvas)]">
      <RouteHeader
        title="Privacy Policy"
        subtitle={`Last updated: ${lastUpdated}`}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        {/* Header Intro Card */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
            <Shield className="w-6 h-6" />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--ink-primary)]">
              HatchPen Privacy Policy
            </h1>
          </div>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            At HatchPen (accessible from <span className="font-mono text-xs font-semibold">https://hatchpen.com</span>),
            we believe that great writing flourishes in an environment of trust and transparency. This Privacy Policy
            details our practices regarding the collection, use, disclosure, and protection of information when you use
            our platform.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              1
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Information We Collect
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              When you create an account, browse stories, or publish serialized fiction on HatchPen, we collect only the
              information necessary to deliver and personalize your experience:
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>
                <strong className="text-[var(--ink-primary)]">Account Information:</strong> When registering via email
                or OAuth (such as Google Sign-In), we receive your verified email address, display name, and avatar URL.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Author & Reading Data:</strong> Manuscripts, stories,
                chapters, drafts, reading progress, bookmarks, and chapter likes you author or interact with.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Technical Usage Data:</strong> Browser user-agent, device
                characteristics, IP address, and platform metrics strictly used for rate limiting, security, and spam
                prevention.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 2: Google User Data & OAuth Compliance */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              2
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Google OAuth & User Data Policy Compliance
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
              <Lock className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm">
                HatchPen strictly adheres to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-semibold"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
            <p>
              When you choose to sign in to HatchPen using Google, we access only your basic Google profile information
              (<span className="font-mono text-xs">openid</span>, <span className="font-mono text-xs">email</span>, and{' '}
              <span className="font-mono text-xs">profile</span>):
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>
                We use Google user data exclusively to create and authenticate your HatchPen account profile and display
                your author name and avatar.
              </li>
              <li>We never request access to your Google Drive, Gmail, Contacts, or sensitive personal services.</li>
              <li>We never sell, rent, or transfer your Google user data to third parties, data brokers, or advertisers.</li>
              <li>We do not use Google user data to serve targeted advertisements or train external AI models.</li>
            </ul>
          </div>
        </section>

        {/* Section 3: How We Use Your Information */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              3
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              How We Use Your Information
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>We use the collected information solely to:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--ink-primary)]">Authenticate author & reader accounts</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--ink-primary)]">Publish and serialize original literary works</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--ink-primary)]">Synchronize reading progress across devices</span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[var(--ink-primary)]">Prevent spam, abuse, and automated scraping</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Data Retention & User Deletion Rights */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              4
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Data Retention & Account Deletion
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-4 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              You maintain full ownership and control over your personal data and creative works at all times:
            </p>
            <ul className="space-y-2 list-disc list-inside text-sm">
              <li>
                <strong className="text-[var(--ink-primary)]">Self-Service Account Deletion:</strong> You can permanently
                delete your account, author profile, and all associated manuscripts at any time directly through your{' '}
                <span className="font-semibold text-[var(--ink-primary)]">Account Settings</span>.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Complete Data Purge:</strong> When an account is deleted,
                all associated database records, authentication credentials, and uploaded drafts are purged.
              </li>
              <li>
                <strong className="text-[var(--ink-primary)]">Data Removal Requests:</strong> You can also email us at{' '}
                <a href="mailto:privacy@hatchpen.com" className="text-emerald-600 underline font-mono text-xs">
                  privacy@hatchpen.com
                </a>{' '}
                to request the expedited deletion of your account and personal information.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 5: Security & Infrastructure */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold font-mono text-[var(--ink-primary)]">
              5
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[var(--ink-primary)]">
              Security & Infrastructure
            </h2>
          </div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 space-y-3 text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            <p>
              We implement industry-standard encryption protocols (HTTPS/TLS) across all communications. User authentication
              sessions are securely handled via Clerk, and structured database storage is managed through Supabase with strict
              Row-Level Security (RLS) enforcement.
            </p>
          </div>
        </section>

        {/* Section 6: Contact Us */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[var(--ink-primary)]">
            <Mail className="w-5 h-5 text-emerald-600" />
            <h2 className="font-serif text-xl font-bold">Contact Our Privacy Team</h2>
          </div>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            If you have questions, concerns, or requests regarding this Privacy Policy or how HatchPen processes your data,
            please contact us at:
          </p>
          <div className="pt-2 text-sm">
            <p className="font-semibold text-[var(--ink-primary)]">HatchPen Privacy & Legal</p>
            <p className="text-[var(--ink-muted)]">
              Email:{' '}
              <a href="mailto:privacy@hatchpen.com" className="text-emerald-600 underline font-mono">
                privacy@hatchpen.com
              </a>
            </p>
            <p className="text-[var(--ink-muted)]">Website: https://hatchpen.com</p>
          </div>
        </section>
      </div>
    </div>
  )
}
