import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  WORKS,
  AUTHORS,
  USER_WRITER_WORKS,
  INITIAL_NOTIFICATIONS,
  CATEGORIES,
  GENRES,
  getWorkLatestActivityDate
} from '../data/mockData'
import type {
  Work,
  Author,
  WriterWorkSummary,
  NotificationItem,
  Chapter,
  Act,
  CategoryInfo,
  GenreInfo
} from '../data/mockData'
import { getTaxonomyServerFn } from '../server/taxonomy'
import { getPlatformWorksServerFn } from '../server/works'

export interface ReaderSettings {
  fontSize: 'sm' | 'base' | 'lg' | 'xl'
  fontFamily: 'serif' | 'sans' | 'mono'
  lineHeight: 'tight' | 'normal' | 'relaxed' | 'loose'
  readingWidth: 'narrow' | 'medium' | 'wide'
  theme: 'light' | 'sepia' | 'dark'
}

export interface ReadingProgress {
  workId: string
  chapterId: string
  chapterNumber: number
  chapterTitle: string
  progressPercent: number
  lastReadAt: string
}

interface AppContextType {
  // Theme & Reading Settings
  readerSettings: ReaderSettings
  updateReaderSettings: (partial: Partial<ReaderSettings>) => void
  siteTheme: 'light' | 'dark' | 'auto'
  setSiteTheme: (theme: 'light' | 'dark' | 'auto') => void

  // Library & Reading
  savedWorkIds: string[]
  toggleSaveWork: (workId: string) => void
  isWorkSaved: (workId: string) => boolean
  readingProgress: Record<string, ReadingProgress>
  updateReadingProgress: (workId: string, progress: Partial<ReadingProgress>) => void

  // Authors
  followedAuthorIds: string[]
  toggleFollowAuthor: (authorId: string) => void
  isAuthorFollowed: (authorId: string) => boolean

  // Writer Dashboard
  writerWorks: WriterWorkSummary[]
  addWriterWork: (work: Omit<WriterWorkSummary, 'id' | 'lastUpdated' | 'totalReads' | 'totalSaves'>) => string
  allWorks: Work[]
  recentWorks: Work[]
  getWorkById: (id: string) => Work | undefined
  getAuthorById: (id: string) => Author | undefined
  updateChapterContent: (workId: string, chapterId: string, title: string, content: string, status?: 'draft' | 'published') => void
  addNewChapter: (workId: string, title: string, actId?: string) => Chapter
  addActToWork: (workId: string, title: string, description?: string) => void
  updateActInWork: (workId: string, actId: string, title: string, description?: string) => void
  updateWork: (workId: string, updates: Partial<Work>) => void

  // Global Taxonomy (from DB API with canonical fallback)
  categories: CategoryInfo[]
  genres: GenreInfo[]
  isTaxonomyLoading: boolean
  getCategoryBySlug: (slug: string) => CategoryInfo | undefined
  getGenreBySlug: (slug: string) => GenreInfo | undefined

  // Notifications
  notifications: NotificationItem[]
  unreadNotificationCount: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  addNotification: (notif: Omit<NotificationItem, 'id' | 'isRead' | 'timestamp'>) => void

  // Toast
  toastMessage: string | null
  showToast: (msg: string) => void

  // Custom Avatar
  customAvatarUrl: string | null
  setCustomAvatarUrl: (url: string | null) => void

  // Auth Modal
  isAuthModalOpen: boolean
  openAuthModal: (returnUrl?: string) => void
  closeAuthModal: () => void
  authReturnUrl: string | null

  // Admin work injection & Database Sync
  addAdminPostedWork: (work: Work) => void
  addAdminPostedChapter: (workId: string, chapter: Chapter) => void
  reloadWorksFromDb: () => Promise<void>
}

const defaultReaderSettings: ReaderSettings = {
  fontSize: 'lg',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  readingWidth: 'medium',
  theme: 'light'
}

const initialProgress: Record<string, ReadingProgress> = {
  'work-2': {
    workId: 'work-2',
    chapterId: 'ch-201',
    chapterNumber: 1,
    chapterTitle: 'The Hankyu Line at Midnight',
    progressPercent: 100,
    lastReadAt: '3 days ago'
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('relay_stories_reader_settings')
        if (saved) return JSON.parse(saved)
      } catch (e) {}
    }
    return defaultReaderSettings
  })

  const [siteTheme, setSiteThemeState] = useState<'light' | 'dark' | 'auto'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
        if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) return saved
      } catch (e) {}
    }
    return 'light'
  })

  const [savedWorkIds, setSavedWorkIds] = useState<string[]>(['work-2', 'work-4'])
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[]>(['auth-1', 'auth-2'])
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>(initialProgress)
  const [writerWorks, setWriterWorks] = useState<WriterWorkSummary[]>(USER_WRITER_WORKS)
  const [allWorks, setAllWorks] = useState<Work[]>([...WORKS])
  const [isWorksLoading, setIsWorksLoading] = useState(false)

  // Fetch works from Database (works_with_collections view) and sync into allWorks
  const reloadWorksFromDb = React.useCallback(async () => {
    try {
      setIsWorksLoading(true)
      const dbWorks = await getPlatformWorksServerFn()
      if (Array.isArray(dbWorks) && dbWorks.length > 0) {
        setAllWorks((prev) => {
          let updated = [...prev]
          for (const dbW of dbWorks) {
            const idx = updated.findIndex((w) => w.id === dbW.id)
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], ...dbW }
            } else {
              updated.unshift(dbW as any)
            }
          }
          return updated
        })
      }
    } catch (err) {
      console.warn('[AppContext] Failed to load DB works:', err)
    } finally {
      setIsWorksLoading(false)
    }
  }, [])

  useEffect(() => {
    reloadWorksFromDb()
  }, [reloadWorksFromDb])
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [customAvatarUrl, setCustomAvatarUrlState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tellnest_custom_avatar')
      } catch (e) {}
    }
    return null
  })

  // ── Global Taxonomy from Database (with instant fallback) ───────────
  const [categories, setCategories] = useState<CategoryInfo[]>(CATEGORIES)
  const [genres, setGenres] = useState<GenreInfo[]>(GENRES)
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchTaxonomy = async () => {
      try {
        setIsTaxonomyLoading(true)
        const res = await getTaxonomyServerFn()
        if (isMounted && res) {
          if (res.categories && res.categories.length > 0) {
            setCategories(
              res.categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description || '',
                worksCount: CATEGORIES.find((m) => m.slug === c.slug)?.worksCount || 0,
                accentLetter: c.accentLetter || c.name.charAt(0),
              }))
            )
          }
          if (res.genres && res.genres.length > 0) {
            setGenres(
              res.genres.map((g) => ({
                id: g.id,
                name: g.name,
                slug: g.slug,
                group: g.group,
                description: g.description || '',
                worksCount: GENRES.find((m) => m.slug === g.slug)?.worksCount || 0,
              }))
            )
          }
        }
      } catch (err) {
        console.warn('[AppContext] Failed to fetch live taxonomy from DB, using cache/mock:', err)
      } finally {
        if (isMounted) setIsTaxonomyLoading(false)
      }
    }

    fetchTaxonomy()
    return () => {
      isMounted = false
    }
  }, [])

  const getCategoryBySlug = (slug: string) => categories.find((c) => c.slug === slug)
  const getGenreBySlug = (slug: string) => genres.find((g) => g.slug === slug)


  const setCustomAvatarUrl = (url: string | null) => {
    setCustomAvatarUrlState(url)
    if (typeof window !== 'undefined') {
      try {
        if (url) {
          localStorage.setItem('tellnest_custom_avatar', url)
        } else {
          localStorage.removeItem('tellnest_custom_avatar')
        }
      } catch (e) {}
    }
  }

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authReturnUrl, setAuthReturnUrl] = useState<string | null>(null)

  const openAuthModal = (returnUrl?: string) => {
    if (returnUrl) setAuthReturnUrl(returnUrl)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('relay_stories_reader_settings', JSON.stringify(readerSettings))
      } catch (e) {}
    }
  }, [readerSettings])

  const setSiteTheme = (mode: 'light' | 'dark' | 'auto') => {
    setSiteThemeState(mode)
    if (typeof window !== 'undefined') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
      const root = document.documentElement
      root.classList.remove('light', 'dark', 'theme-sepia')
      root.classList.add(resolved)
      root.setAttribute('data-theme', resolved)
      root.style.colorScheme = resolved
      localStorage.setItem('theme', mode)
    }
  }

  const updateReaderSettings = (partial: Partial<ReaderSettings>) => {
    setReaderSettings(prev => {
      const next = { ...prev, ...partial }
      // If reader theme changes, update document root data-theme if in reading mode
      if (partial.theme && typeof window !== 'undefined') {
        const root = document.documentElement
        root.classList.remove('light', 'dark', 'theme-sepia')
        if (partial.theme === 'sepia') {
          root.classList.add('theme-sepia')
          root.setAttribute('data-theme', 'sepia')
        } else {
          root.classList.add(partial.theme)
          root.setAttribute('data-theme', partial.theme)
        }
      }
      return next
    })
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(current => (current === msg ? null : current))
    }, 2800)
  }

  const toggleSaveWork = (workId: string) => {
    setSavedWorkIds(prev => {
      const exists = prev.includes(workId)
      if (exists) {
        showToast('Removed from Library')
        return prev.filter(id => id !== workId)
      } else {
        showToast('Saved to your Library')
        return [...prev, workId]
      }
    })
  }

  const isWorkSaved = (workId: string) => savedWorkIds.includes(workId)

  const toggleFollowAuthor = (authorId: string) => {
    setFollowedAuthorIds(prev => {
      const exists = prev.includes(authorId)
      const author = AUTHORS.find(a => a.id === authorId)
      const name = author ? author.name : 'Author'
      if (exists) {
        showToast(`Unfollowed ${name}`)
        return prev.filter(id => id !== authorId)
      } else {
        showToast(`Now following ${name}`)
        return [...prev, authorId]
      }
    })
  }

  const isAuthorFollowed = (authorId: string) => followedAuthorIds.includes(authorId)

  const updateReadingProgress = (workId: string, progress: Partial<ReadingProgress>) => {
    setReadingProgress(prev => ({
      ...prev,
      [workId]: {
        ...(prev[workId] || {
          workId,
          chapterId: 'ch-1',
          chapterNumber: 1,
          chapterTitle: 'Chapter 1',
          progressPercent: 0,
          lastReadAt: 'Just now'
        }),
        ...progress,
        lastReadAt: 'Just now'
      }
    }))
  }

  const addWriterWork = (workData: Omit<WriterWorkSummary, 'id' | 'lastUpdated' | 'totalReads' | 'totalSaves'>) => {
    const newId = `writer-work-${Date.now()}`
    const newSummary: WriterWorkSummary = {
      ...workData,
      id: newId,
      totalReads: '0',
      totalSaves: 0,
      lastUpdated: 'Just now'
    }
    setWriterWorks(prev => [newSummary, ...prev])

    // Also register as a full work
    const fullNewWork: Work = {
      id: newId,
      title: workData.title,
      author: {
        id: 'auth-user',
        name: 'Syed Abbas',
        handle: 'syedabbas',
        avatar: '/unisex-avatar.svg',
        bio: 'Writer and editor. Exploring quiet prose and narrative architecture.',
        worksCount: writerWorks.length + 1,
        followersCount: 140,
        totalReads: '124K',
        verified: true
      },
      cover: workData.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      category: workData.category,
      categorySlug: workData.category.toLowerCase().replace(/\s+/g, '-'),
      genre: workData.genre || 'Literary Fiction',
      genreSlug: (workData.genre || 'Literary Fiction').toLowerCase().replace(/\s+/g, '-'),
      tags: workData.tags && workData.tags.length > 0 ? workData.tags : [],
      language: 'English',
      status: 'Ongoing',
      visibility: 'Public',
      isMature: false,
      synopsis: 'A newly created manuscript exploring memory, form, and modern human connection.',
      fullDescription: 'An unfolding manuscript written on Hatchpen. Published directly by the author with file-based serialized chapters.',
      chaptersCount: workData.chaptersCount || 1,
      publishedChaptersCount: workData.status === 'Published' ? 1 : 0,
      totalReads: '0',
      totalSaves: 0,
      ratingScore: 5.0,
      ratingCount: 1,
      createdAt: 'Today',
      updatedAt: 'Just now',
      chapters: [
        {
          id: `ch-${Date.now()}-1`,
          number: 1,
          title: 'Chapter One',
          subtitle: 'The Beginning',
          status: workData.status === 'Published' ? 'published' : 'draft',
          wordCount: 1250,
          readTimeMinutes: 5,
          publishedAt: 'Today',
          content: 'The morning arrived without sound, wrapping the city in a cold silver fog that swallowed the tops of the towers...'
        }
      ]
    }
    setAllWorks(prev => [fullNewWork, ...prev])
    showToast('Work created successfully!')
    return newId
  }

  const getWorkById = (id: string) => allWorks.find(w => w.id === id)
  const getAuthorById = (id: string): Author | undefined => {
    if (!id) return undefined
    // 1. Direct match in static AUTHORS collection
    const fromMock = AUTHORS.find(
      (a) => a.id === id || a.handle.toLowerCase() === id.toLowerCase()
    )
    if (fromMock) return fromMock

    // 2. Direct match across all current works (including admin posted works)
    const fromWorks = allWorks.find(
      (w) => w.author.id === id || w.author.handle.toLowerCase() === id.toLowerCase()
    )
    if (fromWorks) return fromWorks.author

    // 3. Fallback to localStorage admin works
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hatchpen_admin_posted_works')
        if (stored) {
          const list: Work[] = JSON.parse(stored)
          const matched = list.find(
            (w) => w.author.id === id || w.author.handle.toLowerCase() === id.toLowerCase()
          )
          if (matched) return matched.author
        }
      } catch (e) {}
    }

    return undefined
  }

  const updateChapterContent = (
    workId: string, 
    chapterId: string, 
    title: string, 
    content: string,
    status?: 'draft' | 'published'
  ) => {
    setAllWorks(prev => prev.map(work => {
      if (work.id !== workId) return work
      const words = content.trim().split(/\s+/).filter(Boolean).length
      const nowIso = new Date().toISOString()
      
      let targetChapterNumber = 1
      let targetActNumber: number | undefined = undefined
      let targetActTitle: string | undefined = undefined

      const updatedChapters = work.chapters.map(ch => {
        if (ch.id !== chapterId) return ch
        targetChapterNumber = ch.number
        if (ch.actNumber) targetActNumber = ch.actNumber
        if (ch.actTitle) targetActTitle = ch.actTitle
        return {
          ...ch,
          title,
          content,
          status: status || ch.status,
          wordCount: words,
          readTimeMinutes: Math.max(1, Math.ceil(words / 220)),
          updatedAt: nowIso
        }
      })

      // If chapter was in acts, also sync inside acts array
      const updatedActs = work.acts?.map(act => {
        if (!act.chapters?.some(c => c.id === chapterId)) return act
        return {
          ...act,
          updatedAt: nowIso,
          chapters: act.chapters.map(c => {
            if (c.id !== chapterId) return c
            targetActNumber = act.number
            targetActTitle = act.title
            return {
              ...c,
              title,
              content,
              status: status || c.status,
              wordCount: words,
              readTimeMinutes: Math.max(1, Math.ceil(words / 220)),
              updatedAt: nowIso
            }
          })
        }
      })

      const actSummary = targetActNumber ? `Act ${targetActNumber}` : ''
      const chSummary = `Ch ${targetChapterNumber}`
      const fullSummary = actSummary ? `${actSummary}, ${chSummary}` : chSummary

      return {
        ...work,
        updatedAt: nowIso,
        lastActivityAt: nowIso,
        lastActivityType: status === 'published' ? 'chapter_published' : 'chapter_updated',
        lastActivityDetail: {
          chapterId,
          chapterNumber: targetChapterNumber,
          chapterTitle: title,
          chapterStatus: status || 'draft',
          actNumber: targetActNumber,
          actTitle: targetActTitle,
          updatedAt: nowIso,
          summaryText: fullSummary
        },
        acts: updatedActs,
        chapters: updatedChapters
      }
    }))
    showToast('Draft autosaved')
  }

  const addNewChapter = (workId: string, title: string, actId?: string): Chapter => {
    let createdChapter: Chapter | null = null
    const nowIso = new Date().toISOString()

    setAllWorks(prev => prev.map(work => {
      if (work.id !== workId) return work
      const nextNum = work.chapters.length + 1
      
      let matchedAct: Act | undefined
      if (actId && work.acts) {
        matchedAct = work.acts.find(a => a.id === actId)
      } else if (work.acts && work.acts.length > 0) {
        matchedAct = work.acts[work.acts.length - 1]
      }

      const newCh: Chapter = {
        id: `ch-${work.id}-${nextNum}`,
        number: nextNum,
        title: title || `Chapter ${nextNum}`,
        status: 'draft',
        actId: matchedAct?.id,
        actNumber: matchedAct?.number,
        actTitle: matchedAct?.title,
        isNew: true,
        wordCount: 0,
        readTimeMinutes: 1,
        content: '',
        publishedAt: nowIso,
        updatedAt: nowIso
      }
      createdChapter = newCh

      // Bubble up to Acts
      const updatedActs = work.acts?.map(act => {
        if (act.id !== matchedAct?.id) return act
        return {
          ...act,
          updatedAt: nowIso,
          chapters: [...(act.chapters || []), newCh]
        }
      })

      const actSummary = matchedAct ? `Act ${matchedAct.number}` : ''
      const summaryText = actSummary ? `${actSummary}, Ch ${nextNum}` : `Chapter ${nextNum}`

      return {
        ...work,
        chaptersCount: work.chaptersCount + 1,
        updatedAt: nowIso,
        lastActivityAt: nowIso,
        lastActivityType: 'chapter_drafted',
        lastActivityDetail: {
          chapterId: newCh.id,
          chapterNumber: nextNum,
          chapterTitle: newCh.title,
          chapterStatus: 'draft',
          actId: matchedAct?.id,
          actNumber: matchedAct?.number,
          actTitle: matchedAct?.title,
          updatedAt: nowIso,
          summaryText
        },
        acts: updatedActs,
        chapters: [...work.chapters, newCh]
      }
    }))
    showToast(`Added Chapter to ${workId}`)
    return createdChapter!
  }

  const addActToWork = (workId: string, title: string, description?: string) => {
    const nowIso = new Date().toISOString()
    setAllWorks(prev => prev.map(work => {
      if (work.id !== workId) return work
      const nextActNum = (work.acts?.length || 0) + 1
      const newAct: Act = {
        id: `act-${work.id}-${nextActNum}`,
        workId: work.id,
        number: nextActNum,
        title: title || `Act ${nextActNum}`,
        slug: `act-${nextActNum}`,
        description: description || `Narrative cycle ${nextActNum}`,
        status: 'published',
        chapters: []
      }

      return {
        ...work,
        updatedAt: nowIso,
        lastActivityAt: nowIso,
        lastActivityType: 'act_created',
        lastActivityDetail: {
          actId: newAct.id,
          actNumber: nextActNum,
          actTitle: newAct.title,
          actStatus: 'published',
          updatedAt: nowIso,
          summaryText: `Act ${nextActNum} added`
        },
        acts: [...(work.acts || []), newAct]
      }
    }))
    showToast(`Added Act to manuscript`)
  }

  const updateActInWork = (workId: string, actId: string, title: string, description?: string) => {
    const nowIso = new Date().toISOString()
    setAllWorks(prev => {
      const next = prev.map(work => {
        if (work.id !== workId) return work
        const updatedActs = (work.acts || []).map(act => {
          if (act.id !== actId) return act
          return {
            ...act,
            title: title.trim() || act.title,
            description: description !== undefined ? description.trim() : act.description,
            updatedAt: nowIso
          }
        })

        return {
          ...work,
          updatedAt: nowIso,
          lastActivityAt: nowIso,
          lastActivityType: 'act_updated',
          lastActivityDetail: {
            actId,
            actTitle: title.trim(),
            updatedAt: nowIso,
            summaryText: `Act updated: ${title.trim()}`
          },
          acts: updatedActs
        }
      })

      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('hatchpen_admin_posted_works')
          if (stored) {
            const list: Work[] = JSON.parse(stored)
            const updated = list.map(w => {
              if (w.id !== workId) return w
              return next.find(nw => nw.id === workId) || w
            })
            localStorage.setItem('hatchpen_admin_posted_works', JSON.stringify(updated))
          }
        } catch (e) {}
      }

      return next
    })
    showToast(`Act updated successfully`)
  }

  const updateWork = (workId: string, updates: Partial<Work>) => {
    const nowIso = new Date().toISOString()
    setAllWorks(prev => {
      const next = prev.map(work => {
        if (work.id !== workId) return work

        const merged: Work = {
          ...work,
          ...updates,
          author: updates.author ? { ...work.author, ...updates.author } : work.author,
          updatedAt: nowIso,
          lastActivityAt: nowIso,
          lastActivityType: 'work_metadata_updated',
          lastActivityDetail: {
            updatedAt: nowIso,
            summaryText: `Work details updated`
          }
        }
        return merged
      })

      // Sync localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('hatchpen_admin_posted_works')
          if (stored) {
            const list: Work[] = JSON.parse(stored)
            const updated = list.map(w => {
              if (w.id !== workId) return w
              return next.find(nw => nw.id === workId) || w
            })
            localStorage.setItem('hatchpen_admin_posted_works', JSON.stringify(updated))
          }
        } catch (e) {}
      }

      return next
    })
    showToast(`Manuscript updated successfully`)
  }

  // Real-time Recent Works sorted by latest narrative activity (acts or chapters)
  const recentWorks = React.useMemo(() => {
    return [...allWorks].sort((a, b) => {
      const timeA = getWorkLatestActivityDate(a).getTime()
      const timeB = getWorkLatestActivityDate(b).getTime()
      return timeB - timeA
    })
  }, [allWorks])

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    showToast('All notifications marked as read')
  }

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'isRead' | 'timestamp'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      timestamp: 'Just now'
    }
    setNotifications(prev => [newNotif, ...prev])
  }

  const addAdminPostedWork = (work: Work) => {
    setAllWorks(prev => {
      if (prev.some(w => w.id === work.id)) return prev
      const next = [work, ...prev]
      // Persist admin works to localStorage
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('hatchpen_admin_posted_works')
          const existing: Work[] = stored ? JSON.parse(stored) : []
          if (!existing.some(w => w.id === work.id)) {
            existing.unshift(work)
          }
          localStorage.setItem('hatchpen_admin_posted_works', JSON.stringify(existing))
        } catch (e) {}
      }
      return next
    })
  }

  const addAdminPostedChapter = (workId: string, chapter: Chapter) => {
    const nowIso = new Date().toISOString()
    const actSummary = chapter.actNumber ? `Act ${chapter.actNumber}` : ''
    const chSummary = `Ch ${chapter.number}`
    const fullSummary = actSummary ? `${actSummary}, ${chSummary}` : chSummary

    setAllWorks(prev => {
      const next = prev.map(w => {
        if (w.id !== workId) return w
        const existingChapters = w.chapters || []
        // Avoid duplicate chapter IDs
        if (existingChapters.some(c => c.id === chapter.id)) return w
        const updatedChapters = [...existingChapters, chapter].sort((a, b) => a.number - b.number)
        
        // Also sync inside Acts if Act exists
        const updatedActs = w.acts?.map(act => {
          if (chapter.actNumber && act.number !== chapter.actNumber) return act
          return {
            ...act,
            updatedAt: nowIso,
            chapters: [...(act.chapters || []), chapter]
          }
        })

        return {
          ...w,
          chaptersCount: updatedChapters.length,
          publishedChaptersCount: updatedChapters.filter(c => c.status === 'published').length,
          updatedAt: nowIso,
          lastActivityAt: nowIso,
          lastActivityType: chapter.status === 'published' ? 'chapter_published' : 'chapter_drafted',
          lastActivityDetail: {
            chapterId: chapter.id,
            chapterNumber: chapter.number,
            chapterTitle: chapter.title,
            chapterStatus: chapter.status,
            actNumber: chapter.actNumber,
            actTitle: chapter.actTitle,
            updatedAt: nowIso,
            summaryText: fullSummary
          },
          acts: updatedActs || w.acts,
          chapters: updatedChapters
        }
      })

      // Also persist updated work into localStorage (admin works + updated baseline works)
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('hatchpen_admin_posted_works')
          const adminWorks: Work[] = stored ? JSON.parse(stored) : []
          const updatedWork = next.find(w => w.id === workId)
          if (updatedWork) {
            const exists = adminWorks.some(aw => aw.id === workId)
            const nextAdminWorks = exists
              ? adminWorks.map(aw => aw.id === workId ? updatedWork : aw)
              : [updatedWork, ...adminWorks]
            localStorage.setItem('hatchpen_admin_posted_works', JSON.stringify(nextAdminWorks))
          }
        } catch (e) {}
      }

      return next
    })
  }

  return (
    <AppContext.Provider
      value={{
        readerSettings,
        updateReaderSettings,
        siteTheme,
        setSiteTheme,
        savedWorkIds,
        toggleSaveWork,
        isWorkSaved,
        readingProgress,
        updateReadingProgress,
        followedAuthorIds,
        toggleFollowAuthor,
        isAuthorFollowed,
        writerWorks,
        addWriterWork,
        allWorks,
        recentWorks,
        getWorkById,
        getAuthorById,
        updateChapterContent,
        addNewChapter,
        addActToWork,
        categories,
        genres,
        isTaxonomyLoading,
        getCategoryBySlug,
        getGenreBySlug,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        addNotification,
        toastMessage,
        showToast,
        customAvatarUrl,
        setCustomAvatarUrl,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authReturnUrl,
        addAdminPostedWork,
        addAdminPostedChapter,
        reloadWorksFromDb
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
