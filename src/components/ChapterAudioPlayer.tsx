import React, { useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  VolumeX,
  User,
  Gauge,
  Headphones,
} from 'lucide-react'
import type { VoiceGender } from '../lib/tts/speechSynthesis.ts'

export interface ChapterAudioPlayerProps {
  isPlaying: boolean
  isPaused: boolean
  currentParagraphIndex: number
  totalParagraphs: number
  voiceGender: VoiceGender
  playbackRate: number
  activeVoiceName?: string
  speechError?: string | null
  onTogglePlay: () => void
  onNextParagraph: () => void
  onPrevParagraph: () => void
  onSetVoiceGender: (gender: VoiceGender) => void
  onSetPlaybackRate: (rate: number) => void
  onClose: () => void
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2]

export function ChapterAudioPlayer({
  isPlaying,
  isPaused,
  currentParagraphIndex,
  totalParagraphs,
  voiceGender,
  playbackRate,
  activeVoiceName,
  speechError,
  onTogglePlay,
  onNextParagraph,
  onPrevParagraph,
  onSetVoiceGender,
  onSetPlaybackRate,
  onClose,
}: ChapterAudioPlayerProps) {
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false)

  const progressPercent = totalParagraphs > 0
    ? Math.round(((currentParagraphIndex + 1) / totalParagraphs) * 100)
    : 0

  return (
    <div
      role="region"
      aria-label="Audio Reader Controls"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-xl animate-in slide-in-from-bottom-4 duration-200"
    >
      <div className="relative rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)]/95 shadow-2xl backdrop-blur-xl p-3 sm:px-4 sm:py-3 text-[var(--ink-primary)]">
        {/* Paragraph Progress Micro-bar */}
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-[var(--bg-subtle)] overflow-hidden rounded-full">
          <div
            className="h-full bg-[var(--ink-primary)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 pt-1">
          {/* Left: Indicator & Para Count */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--ink-primary)]">
              {isPlaying && !isPaused ? (
                <Volume2 className="h-4 w-4 animate-pulse text-emerald-500" />
              ) : (
                <Headphones className="h-4 w-4 text-[var(--ink-muted)]" />
              )}
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5 text-xs font-semibold font-mono">
                <span>Audio Reader</span>
                {isPlaying && !isPaused && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
                {speechError && (
                  <span className="text-[10px] text-red-500 font-normal">({speechError})</span>
                )}
              </div>
              <div className="text-[10px] text-[var(--ink-muted)] font-mono truncate max-w-[160px] sm:max-w-[220px]">
                {activeVoiceName ? (
                  <span title={activeVoiceName}>
                    {activeVoiceName.slice(0, 22)} • P{totalParagraphs > 0 ? currentParagraphIndex + 1 : 0}/{totalParagraphs}
                  </span>
                ) : (
                  <span>Para {totalParagraphs > 0 ? currentParagraphIndex + 1 : 0} of {totalParagraphs} ({progressPercent}%)</span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onPrevParagraph}
              disabled={currentParagraphIndex <= 0}
              title="Previous Paragraph"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying && !isPaused ? 'Pause' : 'Play'}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ink-primary)] text-[var(--bg-canvas)] shadow-md hover:opacity-90 transition-all hover:scale-105 cursor-pointer"
            >
              {isPlaying && !isPaused ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextParagraph}
              disabled={currentParagraphIndex >= totalParagraphs - 1}
              title="Next Paragraph"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          {/* Right: Male / Female Voice Switcher & Speed */}
          <div className="flex items-center gap-2">
            {/* Gender Switcher Pill */}
            <div className="flex items-center p-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-medium font-sans">
              <button
                type="button"
                onClick={() => onSetVoiceGender('female')}
                title="Switch to Female Voice"
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  voiceGender === 'female'
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] shadow-xs font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                Female
              </button>
              <button
                type="button"
                onClick={() => onSetVoiceGender('male')}
                title="Switch to Male Voice"
                className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                  voiceGender === 'male'
                    ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] shadow-xs font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                Male
              </button>
            </div>

            {/* Playback Speed Pill / Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedDropdownOpen(!speedDropdownOpen)}
                className="flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-mono text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                title="Playback Speed"
              >
                <span>{playbackRate}x</span>
              </button>

              {speedDropdownOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-20 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1 shadow-xl z-50">
                  {SPEED_OPTIONS.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        onSetPlaybackRate(rate)
                        setSpeedDropdownOpen(false)
                      }}
                      className={`w-full text-left px-2 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-[var(--ink-primary)] text-[var(--bg-canvas)] font-bold'
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close / Dismiss Audio Dock Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close Audio Reader"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
