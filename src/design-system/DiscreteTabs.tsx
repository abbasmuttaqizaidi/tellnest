'use client';

import { useEffect, useState, type FC, type ReactNode } from 'react';

import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';

import { BookOpen, Sparkles, User, FileText } from 'lucide-react';

export interface TabItem {
  id: string;
  icon?: ReactNode;
  label?: string;
  title?: string;
  activeColor?: string;
}

export interface DiscreteTabsProps {
  tabs?: TabItem[];
  onTabChange?: (tabId: string) => void;
  defaultTab?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
}

const DEFAULT_DISCRETE_TABS: TabItem[] = [
  {
    id: 'works',
    icon: <BookOpen className="h-4 w-4" />,
    label: 'Works',
    activeColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'drafts',
    icon: <FileText className="h-4 w-4" />,
    label: 'Drafts',
    activeColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'profile',
    icon: <User className="h-4 w-4" />,
    label: 'Profile',
    activeColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'metrics',
    icon: <Sparkles className="h-4 w-4" />,
    label: 'Metrics',
    activeColor: 'text-amber-600 dark:text-amber-400',
  },
];

export const DiscreteTabs: FC<DiscreteTabsProps> = ({
  tabs,
  onTabChange,
  defaultTab,
  className,
  size = 'md',
}) => {
  const tabList = (tabs && tabs.length > 0) ? tabs : DEFAULT_DISCRETE_TABS;
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || tabList[0]?.id || 'works'
  );
  const [shine, setShine] = useState<boolean>(false);

  // Sync state if defaultTab prop changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShine(true), 600);
    return () => {
      clearTimeout(timer);
      setShine(false);
    };
  }, [activeTab]);

  const sizeConfig = {
    xs: {
      containerPy: 'py-0',
      motionH: 'h-8',
      pillH: 'h-7 px-2.5 text-[11px]',
      gap: 'gap-1',
      iconMargin: 5,
      fontSize: 'text-[11px] font-medium',
    },
    sm: {
      containerPy: 'py-0.5',
      motionH: 'h-8 sm:h-9',
      pillH: 'h-7 sm:h-8 px-3 text-xs',
      gap: 'gap-1.5',
      iconMargin: 6,
      fontSize: 'text-xs font-medium',
    },
    md: {
      containerPy: 'py-2',
      motionH: 'h-12',
      pillH: 'h-10 px-4 text-xs sm:text-sm',
      gap: 'gap-2',
      iconMargin: 8,
      fontSize: 'text-sm font-semibold',
    },
  }[size] || {
    containerPy: 'py-0.5',
    motionH: 'h-8 sm:h-9',
    pillH: 'h-7 sm:h-8 px-3 text-xs',
    gap: 'gap-1.5',
    iconMargin: 6,
    fontSize: 'text-xs font-medium',
  };

  return (
    <motion.div
      layout
      className={cn(
        'mx-auto flex w-fit items-center justify-center overflow-hidden rounded-full',
        sizeConfig.gap,
        sizeConfig.containerPy,
        className
      )}
    >
      {tabList.map((tab) => {
        const isActive = tab.id === activeTab;
        const label = tab.label || tab.title || tab.id;
        const colorClass = tab.activeColor || 'text-[var(--ink-primary)]';

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(tab.id);
              }
            }}
            className="relative focus:outline-none"
          >
            <motion.div
              layout="position"
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 24,
                mass: 0.8,
              }}
              className={cn(
                'flex w-full items-center justify-center',
                sizeConfig.motionH
              )}
            >
              <div
                className={cn(
                  'flex cursor-pointer items-center justify-center rounded-full border transition-all duration-200 select-none',
                  sizeConfig.pillH,
                  isActive
                    ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] shadow-xs font-medium'
                    : 'bg-[var(--bg-subtle)] border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:border-[var(--border-subtle)]'
                )}
                tabIndex={0}
              >
                {tab.icon && (
                  <motion.div
                    className={cn(
                      'flex items-center justify-center transition-colors duration-300',
                      isActive
                        ? colorClass
                        : 'text-neutral-800 dark:text-white',
                    )}
                  >
                    {tab.icon}
                  </motion.div>
                )}

                <motion.span
                  animate={{
                    width: isActive ? 'auto' : 0,
                    opacity: isActive ? 1 : 0,
                    marginLeft: isActive && tab.icon ? sizeConfig.iconMargin : 0,
                  }}
                  className={cn(
                    'relative overflow-hidden whitespace-nowrap transition-colors duration-300',
                    sizeConfig.fontSize,
                    isActive ? colorClass : 'text-black dark:text-white',
                  )}
                >
                  {label}

                  <AnimatePresence>
                    {isActive && shine && (
                      <motion.span
                        initial={{ left: '-120%' }}
                        animate={{ left: '120%' }}
                        transition={{
                          duration: 0.5,
                          ease: 'linear',
                        }}
                        className="absolute top-0 bottom-0 w-16 bg-linear-to-r from-transparent via-white/80 to-transparent dark:from-transparent dark:via-neutral-900/80 dark:to-transparent"
                      />
                    )}
                  </AnimatePresence>
                </motion.span>
              </div>
            </motion.div>
          </button>
        );
      })}
    </motion.div>
  );
};

export default DiscreteTabs;
