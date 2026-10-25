import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  Quote,
  Minus,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Columns,
  Undo,
  Redo,
  Save,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  Type,
  GitCompare,
} from 'lucide-react'
import { ChapterDiffViewer } from './ChapterDiffViewer'

export interface StoryRichEditorProps {
  title: string
  setTitle: (val: string) => void
  subtitle: string
  setSubtitle: (val: string) => void
  content: string
  onChange: (val: string) => void
  autosaveStatus: 'saved' | 'saving' | 'dirty'
  onManualSave: () => void
  onPublish?: () => void
  workTitle?: string
  workId?: string
  chapterNumber?: number
  actName?: string
  onExit?: () => void
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
  className?: string
  savedSnapshot?: {
    title: string
    subtitle: string
    content: string
  }
}

// Markdown parser helpers for Live Reader Preview
function formatInlineMarkdown(text: string): React.ReactNode {
  // Strip any trailing backslashes before newlines or end of line (markdown hard-break artifacts)
  const cleanText = text.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|(?<!_)_[^_]+_(?!_)|~~[^~]+~~|`[^`]+`)/g
  const parts = cleanText.split(regex)
  if (parts.length === 1) return cleanText

  return parts.map((part, index) => {
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-bold text-[var(--ink-primary)]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic text-[var(--ink-primary)]">
          {part.slice(1, -1)}
        </em>
      )
    }
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through text-[var(--ink-faint)]">
          {part.slice(2, -2)}
        </del>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="font-mono text-[0.88em] bg-[var(--bg-subtle)] text-[var(--ink-primary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function renderChapterParagraph(text: string): React.ReactNode {
  const cleanText = text.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
  const trimmed = cleanText.trim()
  if (!trimmed) {
    return <div className="h-4" />
  }

  // Ornamental Scene Break (--- or ***)
  if (/^(\*{3,}|-{3,})$/.test(trimmed)) {
    return (
      <div className="py-6 flex items-center justify-center gap-3 text-[var(--ink-faint)] select-none">
        <span className="w-8 border-t border-[var(--border-subtle)]" />
        <span className="text-xs tracking-widest font-mono text-amber-600 dark:text-amber-400">✦ ✦ ✦</span>
        <span className="w-8 border-t border-[var(--border-subtle)]" />
      </div>
    )
  }

  // Headings (# / ## / ###)
  if (/^#{1,3}\s+/.test(trimmed)) {
    const level = trimmed.match(/^#{1,3}/)?.[0].length || 1
    const headingText = trimmed.replace(/^#{1,3}\s+/, '')
    if (level === 1) {
      return (
        <h2 className="font-serif text-2xl font-bold text-[var(--ink-primary)] mt-8 mb-4 tracking-tight">
          {formatInlineMarkdown(headingText)}
        </h2>
      )
    }
    if (level === 2) {
      return (
        <h3 className="font-serif text-xl font-semibold text-[var(--ink-primary)] mt-6 mb-3 tracking-tight">
          {formatInlineMarkdown(headingText)}
        </h3>
      )
    }
    return (
      <h4 className="font-serif text-lg font-medium text-[var(--ink-primary)] mt-5 mb-2">
        {formatInlineMarkdown(headingText)}
      </h4>
    )
  }

  // Blockquote (> text)
  if (trimmed.startsWith('>')) {
    const rawQuote = trimmed.replace(/^>\s*/, '')
    return (
      <blockquote className="border-l-2 border-[var(--ink-primary)] pl-4 py-1.5 italic text-[var(--ink-muted)] my-3 bg-[var(--bg-subtle)]/40 rounded-r-sm">
        {formatInlineMarkdown(rawQuote)}
      </blockquote>
    )
  }

  // Bullet list (- item)
  if (trimmed.startsWith('- ')) {
    return (
      <li className="list-disc ml-6 my-1 text-[var(--ink-secondary)]">
        {formatInlineMarkdown(trimmed.slice(2))}
      </li>
    )
  }

  // Numbered list (1. item)
  if (/^\d+\.\s+/.test(trimmed)) {
    const listText = trimmed.replace(/^\d+\.\s+/, '')
    return (
      <li className="list-decimal ml-6 my-1 text-[var(--ink-secondary)]">
        {formatInlineMarkdown(listText)}
      </li>
    )
  }

  return (
    <p className="font-serif leading-relaxed text-[var(--ink-secondary)] mb-4">
      {formatInlineMarkdown(cleanText)}
    </p>
  )
}

export function StoryRichEditor({
  title,
  setTitle,
  subtitle,
  setSubtitle,
  content,
  onChange,
  autosaveStatus,
  onManualSave,
  onPublish,
  workTitle,
  workId,
  chapterNumber,
  actName,
  onExit,
  sidebarOpen,
  onToggleSidebar,
  className = '',
  savedSnapshot,
}: StoryRichEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write')
  const [diffOpen, setDiffOpen] = useState(false)
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans' | 'mono'>('serif')
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('lg')
  const [showTypographyMenu, setShowTypographyMenu] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)

  const editorContainerRef = useRef<HTMLDivElement | null>(null)

  // Typography class calculations
  const fontClass =
    fontFamily === 'serif'
      ? 'font-serif'
      : fontFamily === 'sans'
      ? 'font-sans'
      : 'font-mono'

  const fontSizeClass =
    fontSize === 'sm'
      ? 'text-base leading-relaxed'
      : fontSize === 'base'
      ? 'text-lg leading-loose'
      : fontSize === 'lg'
      ? 'text-xl leading-loose'
      : 'text-2xl leading-loose'

  // TipTap WYSIWYG instance setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        horizontalRule: {},
        blockquote: {},
        bulletList: {},
        orderedList: {},
      }),
      Placeholder.configure({
        placeholder: 'Begin crafting your narrative here. Words flow naturally without distraction...',
      }),
      Markdown.configure({
        html: true,
        transformPastedText: false,
        transformCopiedText: false,
      }),
    ],
    content: content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `tiptap focus:outline-none min-h-[500px] w-full ${fontClass} ${fontSizeClass} text-[var(--ink-secondary)] select-text`,
      },
      transformPastedText: (pastedText: string) => {
        // Strip any accidental markdown hard-break trailing backslashes
        let clean = pastedText.replace(/\\+[ \t]*(?=\r?\n|$)/g, '')
        // If pasted prose contains single newlines without double newlines,
        // convert single newlines to double newlines so ProseMirror creates separate paragraphs
        const lines = clean.split(/\r?\n/)
        const nonEmptyLines = lines.filter((l) => l.trim().length > 0)
        const hasDoubleNewlines = /\r?\n\s*\r?\n/.test(clean)
        if (!hasDoubleNewlines && nonEmptyLines.length > 1) {
          clean = lines.join('\n\n')
        }
        return clean
      },
    },
    onUpdate: ({ editor }) => {
      // Serialize to clean markdown using tiptap-markdown
      const rawMd = (editor.storage as any)?.markdown?.getMarkdown?.() || editor.getHTML()
      // Robust sanitize: NEVER allow trailing backslashes before newlines in stored prose
      const cleanMd = typeof rawMd === 'string' ? rawMd.replace(/\\+[ \t]*(?=\r?\n|$)/g, '') : rawMd
      onChange(cleanMd)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      setHasSelection(from !== to)
    },
  })

  // Synchronize content if chapter changes externally (e.g. navigation)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentMd = (editor.storage as any)?.markdown?.getMarkdown?.()
      if (currentMd !== undefined && currentMd !== content) {
        editor.commands.setContent(content || '', { emitUpdate: false })
      }
    }
  }, [content, editor])

  // Real-time word count & read time calculation
  const wordCount = useMemo(() => {
    if (!editor) {
      return content.trim().split(/\s+/).filter(Boolean).length
    }
    const text = editor.getText()
    return text.trim().split(/\s+/).filter(Boolean).length
  }, [editor, content])

  const charCount = useMemo(() => {
    if (!editor) return content.length
    return editor.getText().length
  }, [editor, content])

  const readTimeMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 220))
  }, [wordCount])

  // Fullscreen toggle handler (with browser Native Fullscreen API sync)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev
      if (next) {
        if (editorContainerRef.current?.requestFullscreen) {
          editorContainerRef.current.requestFullscreen().catch(() => {})
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {})
        }
      }
      return next
    })
  }, [])

  // Listen to native fullscreen changes (e.g. user presses Esc in native fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFullscreen])

  // Global keybinding listener for shortcuts (Cmd+S, Cmd+Shift+F, Esc)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault()
        toggleFullscreen()
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? e.metaKey : e.ctrlKey

      if (modifier) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault()
          onManualSave()
          return
        }

        if (e.shiftKey && e.key.toLowerCase() === 'f') {
          e.preventDefault()
          toggleFullscreen()
          return
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isFullscreen, onManualSave, toggleFullscreen])

  // Formatter actions
  const toggleBold = () => editor?.chain().focus().toggleBold().run()
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run()
  const toggleStrike = () => editor?.chain().focus().toggleStrike().run()
  const toggleH2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
  const toggleH3 = () => editor?.chain().focus().toggleHeading({ level: 3 }).run()
  const toggleQuote = () => editor?.chain().focus().toggleBlockquote().run()
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run()
  const insertSceneBreak = () => editor?.chain().focus().setHorizontalRule().run()
  const insertEmDash = () => editor?.chain().focus().insertContent('—').run()
  const undo = () => editor?.chain().focus().undo().run()
  const redo = () => editor?.chain().focus().redo().run()

  return (
    <div
      ref={editorContainerRef}
      className={`relative flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[var(--bg-canvas)] overflow-hidden animate-in fade-in duration-200'
          : 'w-full'
      } ${className}`}
    >
      {/* ======================================================== */}
      {/* 1. TOP WYSIWYG TOOLBAR                                   */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 gap-2 shadow-2xs">
        {/* Left: Exit/Back + Chapter Title */}
        <div className="flex items-center gap-2">
          {onToggleSidebar && !sidebarOpen && !isFullscreen && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="h-7 w-7 rounded-full flex items-center justify-center border border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] shadow-2xs transition-all cursor-pointer shrink-0"
              title="Expand Manuscript Chapters"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {isFullscreen ? (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--ink-muted)] hover:text-[var(--ink-primary)] px-2 py-1 rounded hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              title="Exit Zen Fullscreen (Esc)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </button>
          ) : (
            onExit && (
              <button
                type="button"
                onClick={onExit}
                className="p-1 rounded text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
                title="Back to Manage"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )
          )}

          <span className="font-serif font-semibold text-sm text-[var(--ink-primary)] truncate max-w-[180px] sm:max-w-xs md:max-w-md">
            {title.trim() || `Chapter ${chapterNumber || 1}`}
          </span>
        </div>

        {/* Center: Live WYSIWYG Formatting Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {/* Headings */}
          <div className="flex items-center rounded-lg bg-[var(--bg-canvas)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={toggleH2}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('heading', { level: 2 })
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Section Heading (H2)"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleH3}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('heading', { level: 3 })
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Sub-heading (H3)"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Inline Styles: Bold, Italic, Strikethrough */}
          <div className="flex items-center rounded-lg bg-[var(--bg-canvas)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={toggleBold}
              className={`p-1.5 rounded transition-colors font-bold ${
                editor?.isActive('bold')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Bold (Cmd+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleItalic}
              className={`p-1.5 rounded transition-colors italic ${
                editor?.isActive('italic')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Italic (Cmd+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleStrike}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('strike')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Fiction Elements: Ornamental Scene Break, Quote, Em Dash */}
          <div className="flex items-center rounded-lg bg-[var(--bg-canvas)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={insertSceneBreak}
              className="px-2 py-1 rounded hover:bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors flex items-center gap-1 font-mono text-[11px] cursor-pointer"
              title="Insert Ornamental Scene Break (✦ ✦ ✦)"
            >
              <span>Break</span>
            </button>
            <button
              type="button"
              onClick={toggleQuote}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('blockquote')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Blockquote / Monologue"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={insertEmDash}
              className="px-1.5 py-1 rounded hover:bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors font-mono text-xs font-bold"
              title="Insert Em-Dash (—)"
            >
              —
            </button>
            <button
              type="button"
              onClick={toggleBulletList}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('bulletList')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleOrderedList}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('orderedList')
                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]'
              }`}
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center rounded-lg bg-[var(--bg-canvas)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={undo}
              disabled={!editor?.can().undo()}
              className="p-1.5 rounded hover:bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] disabled:opacity-30 transition-colors"
              title="Undo (Cmd+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!editor?.can().redo()}
              className="p-1.5 rounded hover:bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] disabled:opacity-30 transition-colors"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Typography Customization Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypographyMenu(!showTypographyMenu)}
              className={`p-1.5 rounded hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors ${
                showTypographyMenu ? 'bg-[var(--bg-subtle)] text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'
              }`}
              title="Parchment & Typography Settings"
            >
              <Type className="h-3.5 w-3.5" />
            </button>

            {showTypographyMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 shadow-xl z-50 space-y-3 font-mono text-xs animate-in fade-in zoom-in-95">
                <div>
                  <span className="text-[10px] uppercase text-[var(--ink-muted)] tracking-wider block mb-1.5">
                    Typeface
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setFontFamily('serif')}
                      className={`px-2 py-1 rounded font-serif text-sm transition-colors ${
                        fontFamily === 'serif'
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Book
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontFamily('sans')}
                      className={`px-2 py-1 rounded font-sans text-xs transition-colors ${
                        fontFamily === 'sans'
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Modern
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontFamily('mono')}
                      className={`px-2 py-1 rounded font-mono text-xs transition-colors ${
                        fontFamily === 'mono'
                          ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                          : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      Draft
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase text-[var(--ink-muted)] tracking-wider block mb-1.5">
                    Font Size
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-[11px] text-center">
                    {(['sm', 'base', 'lg', 'xl'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFontSize(s)}
                        className={`py-1 rounded uppercase transition-colors ${
                          fontSize === s
                            ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold'
                            : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: View Mode, Fullscreen, Save */}
        <div className="flex items-center gap-2">
          {/* Preview Toggle Button (No Eye Icon, Fully Toggleable) */}
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'write' ? 'split' : 'write'))}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border cursor-pointer ${
              viewMode !== 'write'
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] border-[var(--ink-primary)] font-semibold shadow-2xs'
                : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
            title={viewMode !== 'write' ? 'Close Reader Preview' : 'Toggle Reader Preview'}
          >
            <Columns className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>

          {/* Review Changes Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setDiffOpen(!diffOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border cursor-pointer ${
              diffOpen
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)] border-[var(--ink-primary)] font-semibold shadow-2xs'
                : 'bg-[var(--bg-canvas)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
            }`}
            title={diffOpen ? 'Close Changes Panel' : 'Review Unsaved Changes'}
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>Changes</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 rounded border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-colors ${
              isFullscreen
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                : 'bg-[var(--bg-canvas)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Zen Fullscreen Writing Canvas (Cmd+Shift+F)'}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          {/* Manual Save Button - Single Source of Truth for Persisting Draft */}
          <button
            type="button"
            onClick={onManualSave}
            disabled={autosaveStatus === 'saving'}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-mono font-medium transition-all shadow-2xs ${
              autosaveStatus === 'dirty'
                ? 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-600 font-semibold cursor-pointer animate-in fade-in duration-150'
                : autosaveStatus === 'saving'
                ? 'bg-[var(--bg-subtle)] text-[var(--ink-muted)] border border-[var(--border-subtle)] cursor-wait opacity-80'
                : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)] cursor-pointer'
            }`}
            title="Save Chapter (Cmd+S / Ctrl+S)"
          >
            {autosaveStatus === 'saving' ? (
              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
            ) : autosaveStatus === 'dirty' ? (
              <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
            ) : (
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span>
              {autosaveStatus === 'saving'
                ? 'Saving...'
                : autosaveStatus === 'dirty'
                ? 'Save Changes'
                : 'Saved'}
            </span>
          </button>

          {/* Publish Button */}
          {onPublish && (
            <button
              type="button"
              onClick={onPublish}
              className="rounded bg-[var(--ink-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-contrast)] hover:opacity-90 shadow-xs"
            >
              Publish
            </button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. FLOATING SELECTION BUBBLE TOOLBAR                     */}
      {/* ======================================================== */}
      {hasSelection && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-md">
          <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase tracking-wider pr-1 border-r border-[var(--border-subtle)]">
            Format:
          </span>
          <button
            type="button"
            onClick={toggleBold}
            className={`p-1 rounded text-xs font-bold transition-colors ${
              editor?.isActive('bold')
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                : 'text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Bold (Cmd+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={toggleItalic}
            className={`p-1 rounded text-xs italic transition-colors ${
              editor?.isActive('italic')
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                : 'text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Italic (Cmd+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={toggleH2}
            className={`p-1 rounded text-xs font-semibold transition-colors ${
              editor?.isActive('heading', { level: 2 })
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                : 'text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={toggleQuote}
            className={`p-1 rounded text-xs transition-colors ${
              editor?.isActive('blockquote')
                ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                : 'text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Quote"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={insertSceneBreak}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:bg-[var(--bg-subtle)]"
            title="✦ ✦ ✦ Scene Break"
          >
            ✦ Break
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN WRITING & PREVIEW WORKSPACE                      */}
      {/* ======================================================== */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">
          <div
            className={`min-h-[calc(100vh-80px)] py-10 px-4 sm:px-8 ${
              viewMode === 'split' ? 'grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto' : 'flex justify-center'
            }`}
          >
          {/* Live WYSIWYG Drafting Column */}
          {(viewMode === 'write' || viewMode === 'split') && (
            <div className={`w-full ${viewMode === 'split' ? '' : 'max-w-3xl'} space-y-6`}>
              {/* Chapter Header Elements */}
              <div className="space-y-3 pb-6 border-b border-[var(--border-subtle)]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Chapter Title..."
                  className="w-full font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--ink-primary)] bg-transparent border-none focus:outline-none placeholder-[var(--ink-faint)] leading-tight"
                />

                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional chapter subtitle or epigraph..."
                  className="w-full font-serif text-base italic text-[var(--ink-muted)] bg-transparent border-none focus:outline-none placeholder-[var(--ink-faint)]"
                />
              </div>

              {/* Live WYSIWYG TipTap Editor Area */}
              <div className="min-h-[500px]">
                <EditorContent editor={editor} />
              </div>

              <div className="pt-8 text-center text-xs font-mono text-[var(--ink-faint)] border-t border-[var(--border-subtle)]">
                End of Chapter Canvas • Saved securely
              </div>
            </div>
          )}

          {/* Live Reading Preview Column */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div
              className={`w-full ${
                viewMode === 'split'
                  ? 'border-l border-[var(--border-subtle)] pl-8'
                  : 'max-w-3xl'
              } space-y-6`}
            >
              {viewMode === 'split' && (
                <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-subtle)] font-mono text-xs text-[var(--ink-muted)]">
                  <Columns className="h-3.5 w-3.5" />
                  <span>Live Reader Output</span>
                </div>
              )}

              {/* Preview Chapter Header */}
              <div className="space-y-3 pb-6 border-b border-[var(--border-subtle)]">
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[var(--ink-primary)] leading-tight">
                  {title || 'Untitled Chapter'}
                </h1>
                {subtitle && (
                  <p className="font-serif text-base italic text-[var(--ink-muted)]">
                    {subtitle}
                  </p>
                )}
                <div className="flex items-center gap-3 font-mono text-xs text-[var(--ink-faint)] pt-2">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span>~{readTimeMinutes} min read</span>
                </div>
              </div>

              {/* Preview Body */}
              <div className={`space-y-4 ${fontClass} text-lg leading-relaxed`}>
                {content.trim() ? (
                  content
                    .split(/\n\s*\n/)
                    .map((paragraph, idx) => (
                      <React.Fragment key={idx}>
                        {renderChapterParagraph(paragraph)}
                      </React.Fragment>
                    ))
                ) : (
                  <p className="text-[var(--ink-faint)] italic font-serif py-12 text-center">
                    (Chapter body preview will render here as you type...)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right-Side Unified Changes Diff Drawer */}
      {diffOpen && (
        <aside className="w-80 sm:w-96 lg:w-[420px] xl:w-[460px] border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col h-full shrink-0 animate-in slide-in-from-right duration-200 z-30 shadow-lg">
          <ChapterDiffViewer
            savedTitle={savedSnapshot?.title ?? title}
            currentTitle={title}
            savedSubtitle={savedSnapshot?.subtitle ?? subtitle}
            currentSubtitle={subtitle}
            savedContent={savedSnapshot?.content ?? content}
            currentContent={content}
            autosaveStatus={autosaveStatus}
            onManualSave={onManualSave}
            onClose={() => setDiffOpen(false)}
          />
        </aside>
      )}
    </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM STATUS BAR                                     */}
      {/* ======================================================== */}
      <footer className="h-9 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 flex items-center justify-between font-mono text-xs text-[var(--ink-muted)] select-none">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span>{charCount.toLocaleString()} chars</span>
          <span>•</span>
          <span>~{readTimeMinutes} min read</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px]">
            {autosaveStatus === 'saving' && (
              <span className="animate-pulse text-amber-600 dark:text-amber-400">Saving...</span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> All changes saved
              </span>
            )}
            {autosaveStatus === 'dirty' && (
              <span className="text-[var(--ink-faint)]">Unsaved changes</span>
            )}
          </span>

          <span className="text-[var(--border-subtle)]">|</span>

          <span className="hidden sm:inline text-[11px] text-[var(--ink-faint)]">
            {isFullscreen ? 'Zen Fullscreen (Esc to exit)' : 'Press Cmd+Shift+F for Fullscreen'}
          </span>
        </div>
      </footer>
    </div>
  )
}
