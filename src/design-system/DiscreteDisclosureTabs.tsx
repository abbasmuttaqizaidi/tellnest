'use client';

import { useState, useRef, useEffect, type FC, type ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { SPRINGS } from './tokens';

export interface DiscreteDisclosureOption {
  id: string;
  label: string;
  badge?: string | number;
  icon?: ReactNode;
}

export interface DiscreteDisclosureTab {
  id: string;
  label: string;
  icon?: ReactNode;
  activeColor?: string;
  items: DiscreteDisclosureOption[];
  activeItemId?: string;
  onItemChange?: (itemId: string) => void;
  menuTitle?: string;
}

export interface DiscreteDisclosureTabsProps {
  tabs: DiscreteDisclosureTab[];
  activeTabId?: string;
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const DiscreteDisclosureTabs: FC<DiscreteDisclosureTabsProps> = ({
  tabs,
  activeTabId: controlledTabId,
  defaultTabId,
  onTabChange,
  className,
  size = 'sm',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    defaultTabId || tabs[0]?.id || ''
  );
  const activeTabId = controlledTabId !== undefined ? controlledTabId : internalActiveTab;

  const [openTabId, setOpenTabId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>('left');

  // Outside click & Escape listener
  useEffect(() => {
    if (!openTabId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpenTabId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpenTabId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openTabId]);

  // Viewport boundary detection when dropdown opens
  useEffect(() => {
    if (openTabId && containerRef.current) {
      const activeEl = containerRef.current.querySelector(`[data-tab-id="${openTabId}"]`);
      if (activeEl) {
        const rect = activeEl.getBoundingClientRect();
        const popupWidth = 272; // ~17rem
        const spaceOnRight = window.innerWidth - rect.left;
        if (spaceOnRight >= popupWidth) {
          setEffectiveAlign('left');
        } else {
          setEffectiveAlign('right');
        }
      }
    }
  }, [openTabId]);

  const handleTabClick = (tab: DiscreteDisclosureTab) => {
    const isAlreadyActive = activeTabId === tab.id;
    const isAlreadyOpen = openTabId === tab.id;

    if (!isAlreadyActive) {
      if (controlledTabId === undefined) {
        setInternalActiveTab(tab.id);
      }
      onTabChange?.(tab.id);
    }

    // Toggle dropdown for this tab
    setOpenTabId(isAlreadyOpen ? null : tab.id);
  };

  const handleSelectItem = (tab: DiscreteDisclosureTab, itemId: string) => {
    tab.onItemChange?.(itemId);
    setTimeout(() => {
      setOpenTabId(null);
    }, 150);
  };

  const sizeClasses = {
    sm: {
      pillH: 'h-8 px-3 text-xs',
      gap: 'gap-1.5',
      iconSize: 'h-3.5 w-3.5',
      fontSize: 'text-xs',
    },
    md: {
      pillH: 'h-9 px-3.5 text-xs sm:text-sm',
      gap: 'gap-2',
      iconSize: 'h-4 w-4',
      fontSize: 'text-xs sm:text-sm',
    },
  }[size];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center flex-wrap select-none font-sans',
        sizeClasses.gap,
        className
      )}
    >
      <MotionConfig transition={SPRINGS.smooth}>
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const isOpen = openTabId === tab.id;
          const currentSelectedItem = tab.items.find((i) => i.id === tab.activeItemId) || tab.items[0];
          const displayLabel = currentSelectedItem ? `${tab.label}: ${currentSelectedItem.label}` : tab.label;

          return (
            <div key={tab.id} className="relative inline-flex items-center" data-tab-id={tab.id}>
              {/* Discrete Tab Pill Button: Expands with spring physics */}
              <button
                type="button"
                onClick={() => handleTabClick(tab)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                className={cn(
                  'group flex items-center justify-center rounded-full border transition-all cursor-pointer select-none',
                  sizeClasses.pillH,
                  isOpen || isActive
                    ? 'border-[var(--ink-primary)] bg-[var(--bg-surface)] text-[var(--ink-primary)] shadow-xs font-medium ring-1 ring-[var(--ink-primary)]/20'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--border-strong)]'
                )}
              >
                {tab.icon && (
                  <span
                    className={cn(
                      'flex items-center justify-center transition-colors',
                      isOpen || isActive
                        ? tab.activeColor || 'text-[var(--ink-primary)]'
                        : 'text-[var(--ink-muted)] group-hover:text-[var(--ink-primary)]'
                    )}
                  >
                    {tab.icon}
                  </span>
                )}

                {/* Animated Expanding Label Pill */}
                <motion.span
                  initial={false}
                  animate={{
                    width: isActive || isOpen ? 'auto' : 0,
                    opacity: isActive || isOpen ? 1 : 0,
                    marginLeft: (isActive || isOpen) && tab.icon ? 6 : 0,
                  }}
                  transition={SPRINGS.smooth}
                  className={cn(
                    'overflow-hidden whitespace-nowrap font-medium transition-colors',
                    sizeClasses.fontSize,
                    isOpen || isActive
                      ? 'text-[var(--ink-primary)]'
                      : 'text-[var(--ink-secondary)]'
                  )}
                >
                  {displayLabel}
                </motion.span>
              </button>

              {/* Floating Dropdown Popup anchored directly below expanding tab */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96, transition: { duration: 0.12 } }}
                    role="listbox"
                    aria-label={tab.menuTitle || tab.label}
                    className={cn(
                      'absolute top-full mt-2 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-2 shadow-2xl',
                      effectiveAlign === 'left' ? 'left-0' : 'right-0'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] text-xs">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                        {tab.menuTitle || tab.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenTabId(null)}
                        className="font-mono text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-0.5 inline-flex items-center gap-1 cursor-pointer"
                        aria-label="Close"
                      >
                        <X className="h-3 w-3" />
                        <span>Esc</span>
                      </button>
                    </div>

                    {/* Items List: Clean & Non-jumping */}
                    <div
                      className={cn(
                        'space-y-0.5 max-h-64 overflow-x-hidden',
                        tab.items.length > 5 ? 'overflow-y-auto scrollbar-thin' : 'overflow-y-hidden'
                      )}
                    >
                      {tab.items.length === 0 ? (
                        <div className="p-4 text-center text-xs font-mono text-[var(--ink-muted)]">
                          No options available
                        </div>
                      ) : (
                        tab.items.map((item) => {
                          const isSelected = item.id === tab.activeItemId;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => handleSelectItem(tab, item.id)}
                              className={cn(
                                'flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition-colors text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink-primary)]',
                                isSelected
                                  ? 'bg-[var(--ink-primary)] text-[var(--accent-contrast)]'
                                  : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.icon && (
                                  <span
                                    className={cn(
                                      'flex-shrink-0',
                                      isSelected ? 'text-[var(--accent-contrast)]' : 'text-[var(--ink-muted)]'
                                    )}
                                  >
                                    {item.icon}
                                  </span>
                                )}
                                <span className="font-medium truncate">{item.label}</span>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {item.badge !== undefined && (
                                  <span
                                    className={cn(
                                      'font-mono text-[10px] px-1.5 py-0.2 rounded-full',
                                      isSelected
                                        ? 'bg-[var(--accent-contrast)]/20 text-[var(--accent-contrast)]'
                                        : 'bg-[var(--bg-subtle)] text-[var(--ink-faint)]'
                                    )}
                                  >
                                    {item.badge}
                                  </span>
                                )}

                                <div
                                  className={cn(
                                    'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all',
                                    isSelected
                                      ? 'border-transparent bg-[var(--accent-contrast)] text-[var(--ink-primary)]'
                                      : 'border-[var(--border-strong)]'
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </MotionConfig>
    </div>
  );
};
