import React from 'react'
import { Link } from '@tanstack/react-router'

export interface MarginalNote {
  id: string
  workId: string
  workTitle: string
  chapterId?: string
  chapterTitle?: string
  authorName: string
  authorAvatar?: string
  content: string
  timestamp: string
  likesCount?: number
}

interface ReaderMarginaliaProps {
  notes: MarginalNote[]
}

export const ReaderMarginalia: React.FC<ReaderMarginaliaProps> = ({ notes }) => {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-3 shadow-2xs">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="font-serif text-sm font-semibold text-[var(--ink-primary)]">
            Reader Marginalia
          </h3>
          <p className="font-serif italic text-[11px] text-[var(--ink-muted)]">
            Notes and impressions left by your readers
          </p>
        </div>

        <span className="font-mono text-[10px] text-[var(--ink-faint)]">
          {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
        </span>
      </div>

      {/* List of Notes */}
      {notes.length === 0 ? (
        <div className="py-5 text-center">
          <p className="font-serif text-xs text-[var(--ink-muted)]">
            The margins are quiet. As readers uncover your chapters, their notes will gather here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {notes.slice(0, 4).map((note) => (
            <div key={note.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-[var(--ink-primary)] truncate">
                    {note.authorName}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-faint)] truncate">
                    on <span className="text-[var(--ink-secondary)] italic">{note.workTitle}</span>
                  </span>
                </div>

                <span className="font-mono text-[10px] text-[var(--ink-faint)] shrink-0">
                  {note.timestamp}
                </span>
              </div>

              {/* Note Content */}
              <p className="font-serif italic text-xs text-[var(--ink-secondary)] leading-relaxed pl-2 border-l border-[var(--border-strong)]">
                "{note.content}"
              </p>

              {/* Action */}
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink-muted)] pt-0.5">
                {note.likesCount !== undefined && note.likesCount > 0 ? (
                  <span className="text-[10px] text-[var(--ink-muted)]">
                    {note.likesCount} appreciation{note.likesCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span />
                )}

                <Link
                  to="/works/$workId"
                  params={{ workId: note.workId }}
                  className="text-[10px] text-[var(--ink-primary)] hover:underline no-underline"
                >
                  Open Story →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
