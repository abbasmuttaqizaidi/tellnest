import { useApp } from '../context/AppContext'
import { Modal, Button, TactileSlider } from '../design-system'
import { Sun, Moon, Coffee, Type } from 'lucide-react'

interface ReaderSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReaderSettingsModal({ isOpen, onClose }: ReaderSettingsModalProps) {
  const { readerSettings, updateReaderSettings } = useApp()

  // Map scale string to number for slider
  const sizeToNum = { sm: 16, base: 18, lg: 22, xl: 26 }
  const numToSize = (n: number) => {
    if (n <= 17) return 'sm'
    if (n <= 20) return 'base'
    if (n <= 24) return 'lg'
    return 'xl'
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reading Typography & Display"
      description="Calibrated controls for distraction-free literary reading."
      size="md"
    >
      <div className="space-y-6 pt-1">
        {/* Reading Color Theme */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
            Environment Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateReaderSettings({ theme: 'light' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                readerSettings.theme === 'light'
                  ? 'border-[var(--ink-primary)] bg-white text-black shadow-xs ring-1 ring-black font-semibold'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => updateReaderSettings({ theme: 'sepia' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                readerSettings.theme === 'sepia'
                  ? 'border-[#8C7A6B] bg-[#F6F1EA] text-[#2C2219] shadow-xs ring-1 ring-[#8C7A6B] font-semibold'
                  : 'border-[var(--border-subtle)] bg-[#EDE5DA]/50 text-[#6B5E52] hover:text-[#2C2219]'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" />
              <span>Warm Sepia</span>
            </button>

            <button
              type="button"
              onClick={() => updateReaderSettings({ theme: 'dark' })}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all cursor-pointer ${
                readerSettings.theme === 'dark'
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
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
            Typeface Family
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => updateReaderSettings({ fontFamily: 'serif' })}
              className={`rounded-lg border py-2 text-center text-xs font-serif transition-all cursor-pointer ${
                readerSettings.fontFamily === 'serif'
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              Outfit Display
            </button>

            <button
              type="button"
              onClick={() => updateReaderSettings({ fontFamily: 'sans' })}
              className={`rounded-lg border py-2 text-center text-xs font-sans transition-all cursor-pointer ${
                readerSettings.fontFamily === 'sans'
                  ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                  : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              Inter Sans
            </button>

            <button
              type="button"
              onClick={() => updateReaderSettings({ fontFamily: 'mono' })}
              className={`rounded-lg border py-2 text-center text-xs font-mono transition-all cursor-pointer ${
                readerSettings.fontFamily === 'mono'
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
            value={sizeToNum[readerSettings.fontSize]}
            onChange={(val) => updateReaderSettings({ fontSize: numToSize(val) })}
          />
        </div>

        {/* Reading Line Spacing */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
            Line Spacing Cadence
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'tight', label: 'Tight' },
              { id: 'normal', label: 'Normal' },
              { id: 'relaxed', label: 'Relaxed' },
              { id: 'loose', label: 'Spacious' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => updateReaderSettings({ lineHeight: item.id as any })}
                className={`py-1.5 rounded-lg border text-center font-mono text-[11px] transition-all cursor-pointer ${
                  readerSettings.lineHeight === item.id
                    ? 'border-[var(--ink-primary)] bg-[var(--bg-subtle)] text-[var(--ink-primary)] font-bold'
                    : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reading Page Width */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-wider text-[var(--ink-muted)] mb-2">
            Column Margin Width
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['narrow', 'medium', 'wide'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => updateReaderSettings({ readingWidth: w })}
                className={`rounded-lg border py-2 text-center text-xs capitalize transition-all cursor-pointer ${
                  readerSettings.readingWidth === w
                    ? 'border-[var(--ink-primary)] bg-[var(--ink-primary)] text-[var(--accent-contrast)] font-semibold shadow-xs'
                    : 'border-[var(--border-subtle)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* CTA Apply */}
        <div className="pt-2">
          <Button variant="primary" className="w-full" onClick={onClose}>
            Apply & Return to Manuscript
          </Button>
        </div>
      </div>
    </Modal>
  )
}
