import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUser } from '@clerk/react'
import { useApp } from '../context/AppContext'
import {
  Button,
  Badge,
  AnimatedTabs,
  CardAccordion,
  OmniSearch,
  Modal,
  ActivitiesCard,
  TactileProfileCard,
  MetricProgressCard,
  DeploymentCard,
  type TabOption,
  type ActivityEntry
} from '../design-system'
import {
  Building2,
  CheckCircle2,
  Clock,
  Send,
  Mail,
  Bell,
  Search,
  ShieldCheck,
  Users,
  Briefcase,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Award,
  Layers
} from 'lucide-react'

export const Route = createFileRoute('/association')({
  component: AssociationPage,
})

interface ApprovedBusiness {
  id: string
  name: string
  registryCode: string
  category: string
  location: string
  logo: string
  description: string
  verifiedSince: string
  activeAssociatesCount: number
  publishedWorksCount: number
  adminName: string
  adminEmail: string
  website: string
  rating: number
}

interface AssociationRequest {
  id: string
  businessId: string
  businessName: string
  applicantName: string
  applicantHandle: string
  applicantAvatar: string
  applicantEmail: string
  role: string
  message: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
}

const APPROVED_BUSINESSES: ApprovedBusiness[] = [
  {
    id: 'biz-1',
    name: 'Meridian Literary Syndicate',
    registryCode: 'RLY-8841',
    category: 'Publishing & Editorial Syndication',
    location: 'London & Zurich',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    description: 'Premier European literary press and serialized manuscript distributor, specializing in modern fiction, speculative worldbuilding, and translated classics.',
    verifiedSince: '2023',
    activeAssociatesCount: 24,
    publishedWorksCount: 142,
    adminName: 'Lord Alistair Sterling',
    adminEmail: 'press@meridiansyndicate.com',
    website: 'https://meridiansyndicate.relay.business',
    rating: 4.9,
  },
  {
    id: 'biz-2',
    name: 'Aethelgard Press & Media Group',
    registryCode: 'RLY-9923',
    category: 'Narrative Fiction & Audio Drama',
    location: 'New York & Oslo',
    logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=200&q=80',
    description: 'Boutique media collective curating atmospheric fiction, episodic serialized dramas, and author syndicates across the North Atlantic.',
    verifiedSince: '2024',
    activeAssociatesCount: 18,
    publishedWorksCount: 88,
    adminName: 'Helena Berg',
    adminEmail: 'editorial@aethelgard.com',
    website: 'https://aethelgard.relay.business',
    rating: 4.85,
  },
  {
    id: 'biz-3',
    name: 'Vance Strategic Holdings',
    registryCode: 'RLY-5510',
    category: 'Creative Non-Fiction & Cultural Monographs',
    location: 'Edinburgh & Geneva',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    description: 'Institutional endowment funding research-backed investigative essays, economic philosophy, and architectural retrospectives.',
    verifiedSince: '2022',
    activeAssociatesCount: 31,
    publishedWorksCount: 215,
    adminName: 'Dr. Gregory Vance',
    adminEmail: 'directorate@vanceholdings.org',
    website: 'https://vance.relay.business',
    rating: 4.95,
  },
  {
    id: 'biz-4',
    name: 'Kojima Cybernetic Archives',
    registryCode: 'RLY-3312',
    category: 'Speculative Sci-Fi & Anthologies',
    location: 'Tokyo & San Francisco',
    logo: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?auto=format&fit=crop&w=200&q=80',
    description: 'Digital-first imprint committed to experimental cyberpunk, computational humanities, and futuristic serialized novellas.',
    verifiedSince: '2024',
    activeAssociatesCount: 14,
    publishedWorksCount: 64,
    adminName: 'Ren Tanaka',
    adminEmail: 'curator@kojima-archives.org',
    website: 'https://kojima-archives.relay.business',
    rating: 4.78,
  },
]

export default function AssociationPage() {
  const { user } = useUser()
  const { showToast, addNotification } = useApp()

  // Primary Perspective Switcher
  const [activeTab, setActiveTab] = useState<'creator' | 'business'>('creator')

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Active Association Request State (Simulated & Persisted in Memory)
  const [activeRequest, setActiveRequest] = useState<AssociationRequest | null>({
    id: 'req-8902',
    businessId: 'biz-1',
    businessName: 'Meridian Literary Syndicate',
    applicantName: user?.fullName || 'Julian Montgomery',
    applicantHandle: user?.username || 'jmontgomery',
    applicantAvatar: user?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    applicantEmail: user?.primaryEmailAddress?.emailAddress || 'julian.montgomery@tellnest.relay',
    role: 'Resident Author & Essayist',
    message: 'Requesting verified author affiliation with Meridian Literary Syndicate for upcoming serialized novel release.',
    status: 'pending',
    submittedAt: 'Today, 10:45 AM',
  })

  // Modal States
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [targetBusiness, setTargetBusiness] = useState<ApprovedBusiness | null>(null)
  const [selectedRole, setSelectedRole] = useState('Resident Author')
  const [requestNote, setRequestNote] = useState('')
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Filtered Businesses
  const filteredBusinesses = useMemo(() => {
    return APPROVED_BUSINESSES.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.registryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory =
        selectedCategory === 'All' || b.category.toLowerCase().includes(selectedCategory.toLowerCase())
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  // Handle Send Request
  const handleOpenRequest = (biz: ApprovedBusiness) => {
    setTargetBusiness(biz)
    setSelectedRole('Resident Author')
    setRequestNote('')
    setIsRequestModalOpen(true)
  }

  const handleSubmitRequest = () => {
    if (!targetBusiness) return

    const newReq: AssociationRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      businessId: targetBusiness.id,
      businessName: targetBusiness.name,
      applicantName: user?.fullName || 'Tellnest Creator',
      applicantHandle: user?.username || 'creator',
      applicantAvatar: user?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      applicantEmail: user?.primaryEmailAddress?.emailAddress || 'creator@tellnest.relay',
      role: selectedRole,
      message: requestNote || `Affiliation request submitted for verified credentials at ${targetBusiness.name}.`,
      status: 'pending',
      submittedAt: 'Just now',
    }

    setActiveRequest(newReq)
    setIsRequestModalOpen(false)
    showToast(`Association request dispatched to ${targetBusiness.name}! Status: Pending Review`)
  }

  // Handle Business Decision (Approve)
  const handleApproveRequest = () => {
    if (!activeRequest) return

    const updated: AssociationRequest = {
      ...activeRequest,
      status: 'approved',
      reviewedAt: 'Just now',
    }
    setActiveRequest(updated)

    // 1. Generate In-App Cryptographic Notification
    addNotification({
      type: 'milestone',
      actorName: activeRequest.businessName,
      actorAvatar: APPROVED_BUSINESSES[0].logo,
      title: 'Business Association Approved',
      description: `Your association request with ${activeRequest.businessName} as ${activeRequest.role} has been officially approved.`,
      targetUrl: '/association',
    })

    // 2. Trigger Confirmation Email Modal
    setIsEmailModalOpen(true)
    showToast(`Approved! Confirmation email generated and sent to ${activeRequest.applicantEmail}.`)
  }

  // Handle Business Decision (Decline)
  const handleDeclineRequest = () => {
    if (!activeRequest) return
    setActiveRequest({
      ...activeRequest,
      status: 'rejected',
      reviewedAt: 'Just now',
    })
    showToast('Association request rejected.')
  }

  const TABS: TabOption[] = [
    {
      id: 'creator',
      label: 'Associate My Profile (Creator View)',
      icon: <Users className="h-4 w-4" />,
      badge: activeRequest?.status === 'pending' ? '1 Pending' : undefined,
    },
    {
      id: 'business',
      label: 'Business Profile Hub (Admin View)',
      icon: <Building2 className="h-4 w-4" />,
      badge: activeRequest?.status === 'pending' ? 'New Request' : undefined,
    },
  ]

  // Recent Association Activities
  const ASSOCIATION_ACTIVITIES: ActivityEntry[] = [
    {
      id: 1,
      icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Accreditation Granted',
      desc: 'Elena Rostova accredited as Senior Editorial Fellow',
      time: '18m ago',
      badge: 'Verified',
    },
    {
      id: 2,
      icon: <Send className="h-3.5 w-3.5 text-[var(--ink-primary)]" />,
      title: 'Association Dispatch',
      desc: `${activeRequest?.applicantName || 'Julian Montgomery'} requested role at ${activeRequest?.businessName}`,
      time: activeRequest?.submittedAt || '10:45 AM',
      badge: activeRequest?.status.toUpperCase() || 'PENDING',
    },
    {
      id: 3,
      icon: <Briefcase className="h-3.5 w-3.5 text-[var(--ink-muted)]" />,
      title: 'Annual Press Renewal',
      desc: 'Meridian Syndicate renewed Relay Enterprise Seal RLY-8841',
      time: '3d ago',
      badge: 'Enterprise',
    },
  ]

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">

      {/* Top Banner & Header */}
      <div className="border-b border-[var(--border-subtle)] pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Badge variant="outline" size="sm" className="font-mono text-[10px]">
              The Relay Verified Business Registry
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>ISO-27001 & Relay Enterprise Security Protocol</span>
          </div>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--ink-primary)]">
          Enterprise Business Association
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[var(--ink-muted)] max-w-3xl leading-relaxed">
          Connect your literary folio, pen name, or creator identity with an accredited publishing house, literary press, agency, or enterprise approved on <strong>The Relay</strong> ecosystem.
        </p>

        {/* Tab Switcher: Dual Perspective (Creator vs Business) */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
          <AnimatedTabs
            tabs={TABS}
            activeId={activeTab}
            onChange={(id) => setActiveTab(id as 'creator' | 'business')}
            variant="pill"
            size="md"
          />

          <div className="text-xs text-[var(--ink-muted)] font-mono">
            Mode:{' '}
            <span className="font-semibold text-[var(--ink-primary)]">
              {activeTab === 'creator' ? 'Author / Requester Portal' : 'Enterprise Admin / Approver Portal'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PERSPECTIVE 1: CREATOR VIEW (How to Associate & Send Request)
          ========================================================================= */}
      {activeTab === 'creator' && (
        <div className="space-y-10">

          {/* Persistent Real-Time Request Status Tracker (Pending / Approved) */}
          {activeRequest && (
            <div
              className={`rounded-2xl border p-6 shadow-xs transition-all ${
                activeRequest.status === 'pending'
                  ? 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/10'
                  : activeRequest.status === 'approved'
                  ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/10'
                  : 'border-rose-500/30 bg-rose-500/5'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      activeRequest.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        : activeRequest.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {activeRequest.status === 'pending' ? (
                      <Clock className="h-5 w-5 animate-spin" />
                    ) : activeRequest.status === 'approved' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--ink-primary)]">
                        Active Association Dispatch
                      </span>
                      <Badge
                        variant={
                          activeRequest.status === 'pending'
                            ? 'ongoing'
                            : activeRequest.status === 'approved'
                            ? 'completed'
                            : 'draft'
                        }
                        size="sm"
                      >
                        {activeRequest.status === 'pending'
                          ? 'Request Pending Review'
                          : activeRequest.status === 'approved'
                          ? 'Approved & Verified'
                          : 'Declined'}
                      </Badge>
                      <span className="text-xs text-[var(--ink-muted)] font-mono">
                        ID: {activeRequest.id}
                      </span>
                    </div>

                    <h3 className="mt-1 font-serif text-lg font-semibold text-[var(--ink-primary)]">
                      {activeRequest.businessName} — {activeRequest.role}
                    </h3>

                    <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)] max-w-2xl">
                      {activeRequest.status === 'pending' ? (
                        <>
                          <strong className="text-[var(--ink-primary)]">Tumhri request abhi pending hai:</strong> The enterprise admin is reviewing your credentials. An instant notification and an official confirmation email will be dispatched to <code className="font-mono text-[11px] bg-[var(--bg-subtle)] px-1 rounded">{activeRequest.applicantEmail}</code> the second approval is granted.
                        </>
                      ) : activeRequest.status === 'approved' ? (
                        <>
                          <strong className="text-emerald-600 dark:text-emerald-400">Affiliation Approved & Confirmed:</strong> Your author profile and manuscripts now bear the verified badge of {activeRequest.businessName}. Confirmation email has been sent.
                        </>
                      ) : (
                        'This association request was not approved by the organization administrator.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {activeRequest.status === 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveTab('business')
                        showToast('Switched to Business Admin View to test approval.')
                      }}
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    >
                      Test Approve as Business
                    </Button>
                  )}
                  {activeRequest.status === 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEmailModalOpen(true)}
                      leftIcon={<Mail className="h-3.5 w-3.5" />}
                    >
                      View Confirmation Email
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Simple 3-Step Process Explanation Card */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
            <div className="max-w-3xl">
              <Badge variant="subtle" size="sm" className="mb-2">
                Simplicity by Design
              </Badge>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
                Connect with Approved Businesses in 3 Simple Steps
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--ink-muted)]">
                Initial guidance for every writer, author, and creator on The Relay:
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-sm font-bold">
                  01
                </div>
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Search Approved Business
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Apne business ka name search karo. The Relay par verified aur registered publishing houses, presses aur studios listed hain.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-sm font-bold">
                  02
                </div>
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Send Association Request
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Apna role choose karo (Resident Author, Series Creator, etc.) aur &quot;Send Request&quot; par click karo. Request direct business admin ko dispatch hogi.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 p-5 space-y-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-mono text-sm font-bold">
                  03
                </div>
                <h3 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                  Pending Tracker & Instant Email
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Jab tak request approve nahi ho jaati, tab tak active &quot;Pending&quot; status dikhega. Approve hote hi instant in-app notification aur confirmation mail aayega!
                </p>
              </div>
            </div>
          </div>

          {/* Search & Directory of Approved Businesses */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-primary)]">
                  The Relay Approved Enterprise Directory
                </h2>
                <p className="text-xs text-[var(--ink-muted)]">
                  Accredited entities eligible for author association.
                </p>
              </div>

              {/* Filter by Category */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['All', 'Publishing', 'Fiction', 'Non-Fiction', 'Sci-Fi'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                      selectedCategory === cat
                        ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold'
                        : 'bg-[var(--bg-surface)] text-[var(--ink-muted)] border border-[var(--border-subtle)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* OmniSearch Bar */}
            <div className="w-full">
              <OmniSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search approved business by name, registry code (e.g. RLY-8841), or domain..."
                shortcut="/"
              />
            </div>

            {/* Business Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredBusinesses.map((biz) => {
                const isRequested = activeRequest?.businessId === biz.id

                return (
                  <div
                    key={biz.id}
                    className="flex flex-col justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-xs hover:border-[var(--border-strong)] transition-all"
                  >
                    <div>
                      {/* Business Card Top Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={biz.logo}
                            alt={biz.name}
                            className="h-12 w-12 rounded-xl object-cover border border-[var(--border-subtle)]"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-serif text-lg font-semibold text-[var(--ink-primary)]">
                                {biz.name}
                              </h3>
                              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)] mt-0.5">
                              <span>Code: {biz.registryCode}</span>
                              <span>•</span>
                              <span>{biz.location}</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant="subtle" size="sm">
                          {biz.category}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="mt-4 text-xs sm:text-sm text-[var(--ink-muted)] leading-relaxed line-clamp-3">
                        {biz.description}
                      </p>

                      {/* Metadata Metrics */}
                      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-b border-[var(--border-subtle)] py-3 text-center font-mono">
                        <div>
                          <div className="text-xs font-bold text-[var(--ink-primary)]">
                            {biz.activeAssociatesCount}
                          </div>
                          <div className="text-[10px] text-[var(--ink-muted)] uppercase">Associates</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--ink-primary)]">
                            {biz.publishedWorksCount}
                          </div>
                          <div className="text-[10px] text-[var(--ink-muted)] uppercase">Folios</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ★ {biz.rating}
                          </div>
                          <div className="text-[10px] text-[var(--ink-muted)] uppercase">Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-6 flex items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-[var(--ink-muted)] font-mono">
                        Admin: <span className="text-[var(--ink-primary)] font-medium">{biz.adminName}</span>
                      </div>

                      {isRequested ? (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={activeRequest.status === 'pending' ? 'ongoing' : 'completed'}
                            size="sm"
                          >
                            {activeRequest.status === 'pending' ? 'Request Pending' : 'Approved Partner'}
                          </Badge>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenRequest(biz)}
                          rightIcon={<Send className="h-3 w-3" />}
                        >
                          Send Request
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reusable CardAccordion: Association Legal & Benefits FAQ */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4">
            <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)]">
              Frequently Addressed Association Inquiries
            </h3>
            <CardAccordion
              items={[
                {
                  id: 'faq-1',
                  title: 'What does an Approved Association grant my author folio?',
                  content:
                    'Association provides cryptographic endorsement from an accredited press. Your manuscripts display the verified enterprise insignia, gain priority placement in the Relay Curated Shelf, and enable direct royalty distribution agreements.',
                },
                {
                  id: 'faq-2',
                  title: 'How long does business admin review take?',
                  content:
                    'Most accredited presses respond within 24 to 48 hours. While awaiting decision, your status stays visibly "Pending" on this dashboard. You will receive an email immediately upon approval or inquiry.',
                },
                {
                  id: 'faq-3',
                  title: 'Can I associate with multiple literary businesses simultaneously?',
                  content:
                    'Yes. Writers may associate with specialized presses for distinct serialized folios (e.g. speculative fiction with Kojima Archives, cultural monographs with Vance Holdings) without conflict.',
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          PERSPECTIVE 2: BUSINESS PROFILE & ADMIN VIEW (Approved Enterprise View)
          ========================================================================= */}
      {activeTab === 'business' && (
        <div className="space-y-10">

          {/* Business Profile Spotlight Header */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-5">
                <img
                  src={APPROVED_BUSINESSES[0].logo}
                  alt={APPROVED_BUSINESSES[0].name}
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border border-[var(--border-subtle)] shadow-xs"
                />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[var(--ink-primary)]">
                      {APPROVED_BUSINESSES[0].name}
                    </h2>
                    <Badge variant="completed" size="sm">
                      Relay Accredited #RLY-8841
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--ink-muted)] max-w-xl">
                    {APPROVED_BUSINESSES[0].description}
                  </p>
                  <div className="flex items-center gap-3 text-xs font-mono text-[var(--ink-muted)] pt-1">
                    <span>Admin: {APPROVED_BUSINESSES[0].adminName}</span>
                    <span>•</span>
                    <span>{APPROVED_BUSINESSES[0].location}</span>
                    <span>•</span>
                    <a
                      href={APPROVED_BUSINESSES[0].website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--ink-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex md:flex-col gap-2 shrink-0">
                <Badge variant="outline" size="md" className="text-center justify-center">
                  24 Active Fellows
                </Badge>
                <Badge variant="subtle" size="md" className="text-center justify-center">
                  142 Published Folios
                </Badge>
              </div>
            </div>
          </div>

          {/* CRITICAL FEATURE: Business Profile Banner for Incoming Requests */}
          {activeRequest && activeRequest.status === 'pending' && (
            <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/10 dark:bg-amber-950/20 p-6 shadow-md animate-in fade-in duration-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black font-bold">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        Incoming Associate Request Requiring Review
                      </span>
                      <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    </div>

                    <h3 className="font-serif text-xl font-bold text-[var(--ink-primary)] mt-1">
                      {activeRequest.applicantName} requested to associate as {activeRequest.role}
                    </h3>

                    <p className="text-xs sm:text-sm text-[var(--ink-secondary)] mt-1 max-w-2xl">
                      &quot;{activeRequest.message}&quot;
                    </p>

                    <div className="flex items-center gap-3 text-xs font-mono text-[var(--ink-muted)] mt-2">
                      <span>Handle: @{activeRequest.applicantHandle}</span>
                      <span>•</span>
                      <span>Email: {activeRequest.applicantEmail}</span>
                      <span>•</span>
                      <span>Submitted: {activeRequest.submittedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Approval Triggers */}
                <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeclineRequest}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleApproveRequest}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                  >
                    Approve & Dispatch Confirmation
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Approved Associates Suite: Cards & Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Associates Roster (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-primary)]">
                    Accredited Associates & Fellows
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)]">
                    Creators endorsed by {APPROVED_BUSINESSES[0].name}.
                  </p>
                </div>
                <Badge variant="subtle" size="sm">
                  Active Roster: {APPROVED_BUSINESSES[0].activeAssociatesCount}
                </Badge>
              </div>

              {/* Associate Cards */}
              <div className="space-y-4">
                {/* Dynamically display current applicant if approved */}
                {activeRequest && activeRequest.status === 'approved' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 transition-all">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={activeRequest.applicantAvatar}
                        alt={activeRequest.applicantName}
                        className="h-11 w-11 rounded-full object-cover border border-emerald-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                            {activeRequest.applicantName}
                          </h4>
                          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <Badge variant="completed" size="sm">
                            Newly Approved
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--ink-muted)] font-mono">
                          {activeRequest.role} • Associated Today
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEmailModalOpen(true)}
                      leftIcon={<Mail className="h-3 w-3" />}
                    >
                      Audit Email
                    </Button>
                  </div>
                )}

                {/* Established Fellows */}
                {[
                  {
                    name: 'Elena Rostova',
                    role: 'Senior Editorial Fellow',
                    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
                    worksCount: 4,
                    reads: '45.2K',
                    since: 'Jan 2024',
                  },
                  {
                    name: 'Julian Thorne',
                    role: 'Resident Essayist & Stylist',
                    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
                    worksCount: 2,
                    reads: '28.1K',
                    since: 'May 2024',
                  },
                  {
                    name: 'Claire Beaumont',
                    role: 'Consulting Poetry Curator',
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                    worksCount: 6,
                    reads: '62.0K',
                    since: 'Nov 2023',
                  },
                ].map((assoc, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 hover:border-[var(--border-strong)] transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={assoc.avatar}
                        alt={assoc.name}
                        className="h-11 w-11 rounded-full object-cover border border-[var(--border-subtle)]"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-serif text-base font-semibold text-[var(--ink-primary)]">
                            {assoc.name}
                          </h4>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-xs text-[var(--ink-muted)] font-mono">
                          {assoc.role} • Accredited since {assoc.since}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono text-[var(--ink-muted)]">
                      <span>{assoc.worksCount} Folios</span>
                      <span>•</span>
                      <span>{assoc.reads} Readers</span>
                      <Button variant="ghost" size="sm">
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Activity & Deployment Metrics (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Activities Card from Design System */}
              <ActivitiesCard
                title="Association Dispatches"
                subtitle="Live audit trail & incoming events"
                activities={ASSOCIATION_ACTIVITIES}
                displayMode="inline"
              />

              {/* Metric Progress Card from Design System */}
              <MetricProgressCard
                title="Enterprise Quota Allocation"
                subtitle="Approved author slots for Q4"
                usedPercent={75}
                currentLabel="24 / 32 Slots Used"
                limitLabel="Enterprise Tier Max"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: SEND ASSOCIATION REQUEST
          ========================================================================= */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title={`Request Association with ${targetBusiness?.name || 'Business'}`}
        description="Submit your creator credentials to request accredited partnership and display the Relay Enterprise Seal."
        size="md"
      >
        <div className="space-y-4 pt-2">
          {targetBusiness && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/50">
              <img
                src={targetBusiness.logo}
                alt={targetBusiness.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <div className="text-xs">
                <div className="font-semibold text-[var(--ink-primary)]">{targetBusiness.name}</div>
                <div className="text-[var(--ink-muted)] font-mono">Registry: {targetBusiness.registryCode}</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)] mb-1">
              Select Proposed Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)]"
            >
              <option value="Resident Author">Resident Author</option>
              <option value="Series Creator">Series Creator</option>
              <option value="Contributing Essayist">Contributing Essayist</option>
              <option value="Editorial Fellow">Editorial Fellow</option>
              <option value="Guest Columnist">Guest Columnist</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-[var(--ink-secondary)] mb-1">
              Message to Business Admin (Optional)
            </label>
            <textarea
              rows={3}
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Introduce your current folios, writing style, or publication goals..."
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--ink-primary)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--ink-primary)] resize-none"
            />
          </div>

          <div className="rounded-lg bg-[var(--bg-subtle)] p-3 text-[11px] text-[var(--ink-muted)] space-y-1">
            <div className="font-semibold text-[var(--ink-primary)]">What happens next?</div>
            <div>
              1. Your request enters <strong>Pending</strong> status visible on your dashboard.
            </div>
            <div>
              2. When approved by the enterprise admin, a confirmation email and in-app alert are dispatched instantly.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" size="sm" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmitRequest}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL 2: CONFIRMATION EMAIL PREVIEW
          ========================================================================= */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Official Confirmation Email Dispatched"
        description="A cryptographic verification confirmation email was transmitted to the requestor upon approval."
        size="lg"
      >
        <div className="space-y-4 pt-2">
          {/* Email Headers Mock */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 space-y-1 font-mono text-[11px] text-[var(--ink-muted)]">
            <div>
              <strong className="text-[var(--ink-primary)]">From:</strong> accreditation@relay.business (The Relay Official Registry)
            </div>
            <div>
              <strong className="text-[var(--ink-primary)]">To:</strong> {activeRequest?.applicantEmail || 'creator@tellnest.relay'}
            </div>
            <div>
              <strong className="text-[var(--ink-primary)]">Subject:</strong> [CONFIRMED] Affiliation Approved: {activeRequest?.businessName}
            </div>
            <div>
              <strong className="text-[var(--ink-primary)]">Security Seal:</strong> SHA-256 Verified Certificate #RLY-AFF-99120
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 space-y-4 text-xs text-[var(--ink-secondary)] leading-relaxed">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <span className="font-serif font-bold text-sm text-[var(--ink-primary)] tracking-wide">
                THE RELAY REGISTRY
              </span>
              <Badge variant="completed" size="sm">
                Accredited Dispatch
              </Badge>
            </div>

            <p>Dear {activeRequest?.applicantName},</p>

            <p>
              We are pleased to inform you that your request to associate with{' '}
              <strong>{activeRequest?.businessName}</strong> as a{' '}
              <strong>{activeRequest?.role}</strong> has been officially approved by enterprise administrators.
            </p>

            <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="font-semibold text-[var(--ink-primary)]">Granted Credentials:</div>
              <div>• <strong>Enterprise Partner:</strong> {activeRequest?.businessName}</div>
              <div>• <strong>Registry Seal:</strong> Accredited Partner Tier</div>
              <div>• <strong>Profile Insignia:</strong> Active on all published manuscripts</div>
            </div>

            <p className="text-[11px] text-[var(--ink-muted)]">
              This digital dispatch serves as formal confirmation under The Relay Business Protocol. No further action is required.
            </p>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setIsEmailModalOpen(false)}>
              Close Audit Preview
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
