import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  WORKS,
  AUTHORS,
  USER_WRITER_WORKS,
  INITIAL_NOTIFICATIONS
} from '../data/mockData'
import type {
  Work,
  Author,
  WriterWorkSummary,
  NotificationItem,
  Chapter
} from '../data/mockData'

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
  getWorkById: (id: string) => Work | undefined
  getAuthorById: (id: string) => Author | undefined
  updateChapterContent: (workId: string, chapterId: string, title: string, content: string) => void
  addNewChapter: (workId: string, title: string) => Chapter

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
}

const defaultReaderSettings: ReaderSettings = {
  fontSize: 'lg',
  fontFamily: 'serif',
  lineHeight: 'relaxed',
  readingWidth: 'medium',
  theme: 'light'
}

const initialProgress: Record<string, ReadingProgress> = {
  'work-1': {
    workId: 'work-1',
    chapterId: 'ch-2',
    chapterNumber: 2,
    chapterTitle: 'Signal in the Static',
    progressPercent: 45,
    lastReadAt: 'Yesterday'
  },
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

  const [siteTheme, setSiteThemeState] = useState<'light' | 'dark' | 'auto'>('light')

  const [savedWorkIds, setSavedWorkIds] = useState<string[]>(['work-1', 'work-2', 'work-4'])
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[]>(['auth-1', 'auth-2'])
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>(initialProgress)
  const [writerWorks, setWriterWorks] = useState<WriterWorkSummary[]>(USER_WRITER_WORKS)
  const [allWorks, setAllWorks] = useState<Work[]>(WORKS)
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
    setSiteThemeState('light')
    if (typeof window !== 'undefined') {
      const root = document.documentElement
      root.classList.remove('dark', 'theme-sepia')
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
      localStorage.setItem('theme', 'light')
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
      genre: 'Literary',
      genreSlug: 'literary',
      tags: ['New Release', 'Contemporary'],
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
  const getAuthorById = (id: string) => AUTHORS.find(a => a.id === id)

  const updateChapterContent = (workId: string, chapterId: string, title: string, content: string) => {
    setAllWorks(prev => prev.map(work => {
      if (work.id !== workId) return work
      const words = content.trim().split(/\s+/).filter(Boolean).length
      return {
        ...work,
        updatedAt: 'Just now',
        chapters: work.chapters.map(ch => {
          if (ch.id !== chapterId) return ch
          return {
            ...ch,
            title,
            content,
            wordCount: words,
            readTimeMinutes: Math.max(1, Math.ceil(words / 220)),
            updatedAt: 'Just now'
          }
        })
      }
    }))
    showToast('Draft autosaved')
  }

  const addNewChapter = (workId: string, title: string): Chapter => {
    let createdChapter: Chapter | null = null
    setAllWorks(prev => prev.map(work => {
      if (work.id !== workId) return work
      const nextNum = work.chapters.length + 1
      const newCh: Chapter = {
        id: `ch-${work.id}-${nextNum}`,
        number: nextNum,
        title: title || `Chapter ${nextNum}`,
        status: 'draft',
        isNew: true,
        wordCount: 0,
        readTimeMinutes: 1,
        content: ''
      }
      createdChapter = newCh
      return {
        ...work,
        chaptersCount: work.chaptersCount + 1,
        chapters: [...work.chapters, newCh]
      }
    }))
    showToast(`Added Chapter to ${workId}`)
    return createdChapter!
  }

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
        getWorkById,
        getAuthorById,
        updateChapterContent,
        addNewChapter,
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
        authReturnUrl
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
