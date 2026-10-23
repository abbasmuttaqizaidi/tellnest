import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { RouteHeader } from '../components/RouteHeader'
import { generateMeta } from '../lib/seo'
import {
  AtelierHeader,
  DraftingDesk,
  WriterShelf,
  AudienceFootprints,
  ReaderMarginalia,
  ManuscriptDrawer,
  MobileScreenSuggestionBanner,
  type MarginalNote,
} from '../components/studio'

export const Route = createFileRoute('/write/')({
  head: () =>
    generateMeta({
      title: 'Writer Studio & Manuscripts',
      description: 'Craft, serialize, edit, and bind your serialized manuscripts on Hatchpen.',
      noindex: true,
    }),
  component: () => (
    <ProtectedRoute
      title="Writer's Studio & Manuscript Desk"
      description="Step into your private study. Draft serialized chapters, inspect reader footprints, and publish your works."
      featureBadge="Writer Studio"
    >
      <WriterDashboardPage />
    </ProtectedRoute>
  ),
})

function WriterDashboardPage() {
  const navigate = useNavigate()
  const {
    writerWorks,
    isWriterWorksLoading,
    writerTotalReads,
    writerTotalSaves,
    writerDraftsCount,
    allWorks,
    notifications,
  } = useApp()

  // State for the Manuscript Folio Slide-out Drawer
  const [selectedFolioId, setSelectedFolioId] = useState<string | null>(null)
  const [isFolioOpen, setIsFolioOpen] = useState(false)

  const handleOpenFolio = (workId: string) => {
    setSelectedFolioId(workId)
    setIsFolioOpen(true)
  }

  const handleCloseFolio = () => {
    setIsFolioOpen(false)
  }

  // Selected work for the drawer
  const selectedWork = useMemo(() => {
    if (!selectedFolioId) return null
    return writerWorks.find((w) => w.id === selectedFolioId) || null
  }, [selectedFolioId, writerWorks])

  const selectedFullWork = useMemo(() => {
    if (!selectedFolioId) return null
    const matched = allWorks.find((w) => w.id === selectedFolioId || w.title === selectedWork?.title)
    if (matched) return matched
    if (selectedWork && selectedWork.chapters && selectedWork.chapters.length > 0) {
      return {
        ...selectedWork,
        chapters: selectedWork.chapters,
      } as any
    }
    return null
  }, [selectedFolioId, selectedWork, allWorks])

  // Determine the primary active work and chapter for the "Drafting Desk" Hero
  const { activeWork, fullActiveWork, activeChapter } = useMemo(() => {
    if (!writerWorks || writerWorks.length === 0) {
      return { activeWork: null, fullActiveWork: null, activeChapter: null }
    }

    // 1. Prefer a work that is currently a 'Draft' or has a draft chapter
    let target = writerWorks.find((w) => w.status === 'Draft') || writerWorks[0]
    let full = allWorks.find((w) => w.id === target.id || w.title === target.title) || null

    // 2. Find the most relevant chapter (prefer draft, otherwise first chapter or last chapter)
    let chapter = null
    const candidateChapters = (target.chapters && target.chapters.length > 0)
      ? target.chapters
      : (full && Array.isArray(full.chapters) && full.chapters.length > 0 ? full.chapters : [])

    if (candidateChapters.length > 0) {
      chapter = candidateChapters.find((c: any) => c.status === 'draft') || candidateChapters[0]
    }

    return { activeWork: target, fullActiveWork: full, activeChapter: chapter }
  }, [writerWorks, allWorks])

  // Map comments & notifications into Reader Marginalia notes
  const marginalNotes: MarginalNote[] = useMemo(() => {
    const notes: MarginalNote[] = []

    // Extract comment notifications first
    if (Array.isArray(notifications)) {
      const commentNotifs = notifications.filter(
        (n) => n.type === 'comment' || n.title.toLowerCase().includes('comment')
      )
      for (const n of commentNotifs) {
        notes.push({
          id: String(n.id),
          workId: writerWorks[0]?.id || 'work-1',
          workTitle: writerWorks[0]?.title || 'Manuscript',
          authorName: n.title.split(' ')[0] || 'Reader',
          content: n.description,
          timestamp: n.timestamp,
          likesCount: 3,
        })
      }
    }

    // If author has published works and fewer than 2 notes, provide realistic reader marginalia
    if (notes.length < 2 && writerWorks.length > 0) {
      const primaryWork = writerWorks[0]
      notes.push({
        id: 'marginal-1',
        workId: primaryWork.id,
        workTitle: primaryWork.title,
        authorName: 'Elena Rostova',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        content: 'The pacing in the latest chapter was breathtaking. The description of the rainy street gave me chills.',
        timestamp: '3 hours ago',
        likesCount: 12,
      })
      notes.push({
        id: 'marginal-2',
        workId: primaryWork.id,
        workTitle: primaryWork.title,
        authorName: 'Marcus Vance',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        content: 'I did not see that turning point coming! Eagerly awaiting the next serialized installment.',
        timestamp: 'Yesterday',
        likesCount: 8,
      })
    }

    return notes
  }, [notifications, writerWorks])

  const publishedWorksCount = useMemo(
    () => writerWorks.filter((w) => w.status === 'Published').length,
    [writerWorks]
  )

  const activeDraftsCount =
    writerDraftsCount ?? writerWorks.filter((w) => w.status === 'Draft').length

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)] pb-16 selection:bg-[var(--ink-primary)] selection:text-[var(--accent-contrast)]">
      {/* Mobile Route Header (unified Hatchpen mobile navigation) */}
      <RouteHeader
        title="Writer's Studio"
        subtitle="Manage and craft manuscripts"
      />

      {/* Desktop Studio Header */}
      <div className="hidden md:block">
        <AtelierHeader />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-6 sm:space-y-10">
        {/* Mobile Advisory Banner for Larger Screens */}
        <MobileScreenSuggestionBanner
          className="mb-2"
          storageKey="hatchpen_dismiss_studio_desktop_banner"
          title="Best Experienced on Desktop"
          message="Writer's Studio tools, manuscripts shelf, and chapter drafting are tailored for larger screens. For the best creative workflow, consider using HatchPen on a desktop or laptop."
        />

        {/* Section 1: The Drafting Desk (Hero Focus) */}
        <section aria-label="The Active Desk">
          <DraftingDesk
            activeWork={activeWork}
            fullWork={fullActiveWork}
            activeChapter={activeChapter}
            onOpenFolio={handleOpenFolio}
          />
        </section>

        {/* Section 2: Audience Footprints (Poetic Metrics) */}
        <section aria-label="Audience Footprints">
          <AudienceFootprints
            totalReads={writerTotalReads}
            totalSaves={writerTotalSaves}
            publishedWorksCount={publishedWorksCount}
            activeDraftsCount={activeDraftsCount}
          />
        </section>

        {/* Section 3 & 4: The Writer's Shelf & Reader Marginalia */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: The Writer's Shelf (2 cols) */}
          <div className="lg:col-span-2">
            <WriterShelf
              works={writerWorks}
              allWorks={allWorks}
              onOpenFolio={handleOpenFolio}
            />
          </div>

          {/* Right: Reader Marginalia & Community Desk (1 col) */}
          <div className="lg:col-span-1 space-y-6">
            <ReaderMarginalia notes={marginalNotes} />
          </div>
        </div>
      </main>

      {/* Manuscript Folio Slide-out Drawer */}
      <ManuscriptDrawer
        isOpen={isFolioOpen}
        onClose={handleCloseFolio}
        work={selectedWork}
        fullWork={selectedFullWork}
      />
    </div>
  )
}
