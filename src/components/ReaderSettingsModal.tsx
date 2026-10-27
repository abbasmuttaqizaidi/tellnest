import React, { useState, useEffect } from 'react'
import { useApp, type ReaderSettings } from '../context/AppContext'
import { Modal, Button, TactileSlider } from '../design-system'
import { Sun, Moon, Coffee } from 'lucide-react'

interface ReaderSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReaderSettingsModal({ isOpen, onClose }: ReaderSettingsModalProps) {
  const { readerSettings, updateReaderSettings } = useApp()
  const [draftSettings, setDraftSettings] = useState<ReaderSettings>(() => ({ ...readerSettings }))

  // Sync draft settings whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSettings({ ...readerSettings })
    }
  }, [isOpen, readerSettings])

  const updateDraft = (partial: Partial<ReaderSettings>) => {
    setDraftSettings((prev) => ({ ...prev, ...partial }))
  }

  const handleApply = () => {
    updateReaderSettings(draftSettings)
    onClose()
  }

  // Map scale string to number for slider
  const sizeToNum = { sm: 15, base: 17, lg: 19, xl: 22 }
  const numToSize = (n: number) => {
    if (n <= 15) return 'sm'
    if (n <= 17) return 'base'
    if (n <= 20) return 'lg'
    return 'xl'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reading Typography & Display"
      description="Calibrated controls for distraction-free literary reading."
      size="md"
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="flex-1 py-2 text-xs font-mono uppercase tracking-wider"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1 py-2 text-xs font-mono uppercase tracking-wider"
            onClick={handleApply}
          >
            Apply Changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-5 pt-0.5">
        {/* Reading Color Theme */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Environment Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateDraft({ theme: 'light' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                draftSettings.theme === 'light'
                  ? 'border-[var(--ink-primary)] bg-white text-black shadow-xs ring-1 ring-black font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => updateDraft({ theme: 'sepia' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                draftSettings.theme === 'sepia'
                  ? 'border-[#8C7A6B] bg-[#F6F1EA] text-[#2C2219] shadow-xs ring-1 ring-[#8C7A6B] font-semibold'
                  : 'border-[var(--border-subtle)] bg-[#EDE5DA]/50 text-[#6B5E52] hover:text-[#2C2219]'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Warm Sepia</span>
            </button>

            <button
              type="button"
              onClick={() => updateDraft({ theme: 'dark' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                draftSettings.theme === 'dark'
                  ? 'border-white bg-[#090D14] text-white shadow-xs ring-1 ring-white font-semibold'
                  : 'border-[var(--border-subtle)] bg-[#111722] text-[#94A3B8] hover:text-white'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Typeface Selection */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Typeface Family
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateDraft({ fontFamily: 'serif' })}
              className={`rounded-lg border py-2 text-center text-xs font-serif transition-all cursor-pointer ${
                draftSettings.fontFamily === 'serif'
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              Outfit Display
            </button>

            <button
              type="button"
              onClick={() => updateDraft({ fontFamily: 'sans' })}
              className={`rounded-lg border py-2 text-center text-xs font-sans transition-all cursor-pointer ${
                draftSettings.fontFamily === 'sans'
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              Inter Sans
            </button>

            <button
              type="button"
              onClick={() => updateDraft({ fontFamily: 'mono' })}
              className={`rounded-lg border py-2 text-center text-xs font-mono transition-all cursor-pointer ${
                draftSettings.fontFamily === 'mono'
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              JetBrains Mono
            </button>
          </div>
        </div>

        {/* Tactile Slider: Reading Font Size */}
        <div>
          <TactileSlider
            label="Typography Font Scale"
            min={14}
            max={28}
            step={2}
            unit="px"
            value={sizeToNum[draftSettings.fontSize]}
            onChange={(val) => updateDraft({ fontSize: numToSize(val) })}
          />
        </div>

        {/* Reading Line Spacing (Line Height) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)]">
              Line Spacing (Line Height)
            </label>
            <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
              {draftSettings.customLineHeight || (draftSettings.lineHeight === 'tight' ? 1.35 : draftSettings.lineHeight === 'normal' ? 1.5 : draftSettings.lineHeight === 'relaxed' ? 1.75 : 2.0)}x
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'tight', label: '1.35x Tight', val: 1.35 },
              { id: 'normal', label: '1.5x Normal', val: 1.5 },
              { id: 'relaxed', label: '1.75x Relaxed', val: 1.75 },
              { id: 'loose', label: '2.0x Spacious', val: 2.0 },
            ].map((item) => {
              const currentVal = draftSettings.customLineHeight || (draftSettings.lineHeight === 'tight' ? 1.35 : draftSettings.lineHeight === 'normal' ? 1.5 : draftSettings.lineHeight === 'relaxed' ? 1.75 : 2.0)
              const isSelected = Math.abs(currentVal - item.val) < 0.04
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    updateDraft({
                      lineHeight: item.id as any,
                      customLineHeight: item.val,
                    })
                  }
                  className={`py-1.5 px-1 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-bold shadow-xs'
                      : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <TactileSlider
            label="Fine-tune Line Height"
            min={1.2}
            max={2.4}
            step={0.05}
            unit="x"
            value={draftSettings.customLineHeight || (draftSettings.lineHeight === 'tight' ? 1.35 : draftSettings.lineHeight === 'normal' ? 1.5 : draftSettings.lineHeight === 'relaxed' ? 1.75 : 2.0)}
            onChange={(val) => {
              const rounded = Math.round(val * 100) / 100
              const named =
                rounded <= 1.35 ? 'tight' : rounded <= 1.55 ? 'normal' : rounded <= 1.85 ? 'relaxed' : 'loose'
              updateDraft({
                customLineHeight: rounded,
                lineHeight: named,
              })
            }}
          />
        </div>

        {/* Paragraph Gap Between Sections */}
        <div>
          <TactileSlider
            label="Paragraph Break Gap"
            min={8}
            max={32}
            step={2}
            unit="px"
            value={draftSettings.paragraphSpacing !== undefined ? draftSettings.paragraphSpacing : 16}
            onChange={(val) => updateDraft({ paragraphSpacing: val })}
          />
        </div>

        {/* Reading Page Width */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-1.5">
            Column Margin Width
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['narrow', 'medium', 'wide'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => updateDraft({ readingWidth: w })}
                className={`rounded-lg border py-2 text-center text-xs capitalize transition-all cursor-pointer ${
                  draftSettings.readingWidth === w
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                    : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
