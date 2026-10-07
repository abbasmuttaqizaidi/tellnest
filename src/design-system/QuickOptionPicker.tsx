'use client';

import { useState, useRef, useEffect, type FC } from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
} from 'motion/react';
import { ChevronDown, Globe } from 'lucide-react';
import { TbLockFilled } from 'react-icons/tb';
import type { ComponentType } from 'react';
import { cn } from '../lib/utils';

export interface Option {
  id: string;
  label?: string;
  title?: string;
  icon?: ComponentType<{ size?: number | string; className?: string }> | null;
  count?: number;
}

export interface OptionPickerProps {
  options?: Option[];
  defaultSelected?: string;
  selectedId?: string;
  onSelect?: (option: Option) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const DEFAULT_OPTIONS: Option[] = [
  { id: 'private', label: 'Private', icon: TbLockFilled },
  { id: 'public', label: 'Public', icon: Globe },
];

export const OptionPicker: FC<OptionPickerProps> = ({
  options,
  defaultSelected,
  selectedId,
  onSelect,
  className = '',
  size = 'md',
}) => {
  const data = options || DEFAULT_OPTIONS;
  const initialOption =
    (selectedId ? data.find((o) => o.id === selectedId) : null) ||
    (defaultSelected ? data.find((o) => o.id === defaultSelected) : null) ||
    data[0] ||
    DEFAULT_OPTIONS[0];

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Option>(initialOption);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId) {
      const match = data.find((o) => o.id === selectedId);
      if (match) setSelected(match);
    }
  }, [selectedId, data]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const handleSelect = (option: Option) => {
    setSelected(option);
    setIsOpen(false);
    if (onSelect) {
      onSelect(option);
    }
  };

  const getOptionLabel = (option: Option) => option.label || option.title || option.id;

  const renderIcon = (option: Option, size = 22, className = '') => {
    if (!option.icon) {
      return <Globe size={size} className={className} />;
    }
    const IconComp = option.icon;
    return <IconComp size={size} className={className} />;
  };

  return (
    <div
      className="relative inline-block perspective-[1200px] transform-3d"
      ref={containerRef}
    >
      <MotionConfig
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{
                opacity: 0,
                y: 10,
                filter: 'blur(4px)',
                scale: 1.1,
                rotateX: -70,
              }}
              animate={{
                opacity: 1,
                y: -5,
                filter: 'blur(0px)',
                scale: 1,
                rotateX: 0,
              }}
              exit={{
                opacity: 0,
                y: 10,
                filter: 'blur(4px)',
                scale: 1.1,
                rotateX: -70,
              }}
              className="absolute bottom-full left-1/2 z-50 mb-2 origin-bottom -translate-x-1/2 transform-3d"
              role="menu"
              aria-label="Visibility options"
            >
              <div className="relative flex min-w-max gap-2 rounded-full border border-neutral-100 bg-[#F3F3F3] p-1.5 py-1 whitespace-nowrap dark:border-neutral-700 dark:bg-neutral-800">
                {data.map((option, index) => {
                  const isActive = selected.id === option.id;
                  const isFirst = index === 0;
                  const isLast = index === data.length - 1;
                  const label = getOptionLabel(option);

                  const roundedClasses = `
                    ${isFirst ? 'rounded-l-full rounded-r-2xl' : ''}
                    ${isLast ? 'rounded-r-full rounded-l-2xl' : ''}
                    ${!isFirst && !isLast ? 'rounded-none' : ''}
                  `;

                  return (
                    <motion.button
                      key={option.id}
                      onClick={() => handleSelect(option)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ y: -1 }}
                      title={`Set as ${label}`}
                      aria-label={`Select ${label}`}
                      className={`relative flex items-center gap-2 px-5 py-3 text-[15px] font-semibold transition-all duration-300 ${roundedClasses} bg-[#FEFEFE] dark:bg-neutral-700 ${isActive ? 'text-[#010101] dark:text-white' : 'text-[#6E6E6E] dark:text-neutral-400'}`}
                    >
                      <motion.span>
                        {renderIcon(option, 20)}
                      </motion.span>
                      <span className="text-bold relative z-10 text-lg">
                        {label}
                      </span>
                      {typeof option.count === 'number' && (
                        <span className="ml-1 text-xs opacity-60 font-mono">
                          ({option.count})
                        </span>
                      )}
                    </motion.button>
                  );
                })}

                <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-r border-b border-neutral-100 bg-[#F3F3F3] dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          layout="size"
          onClick={toggleOpen}
          whileTap={{ scale: 0.97 }}
          title="Change Selection"
          aria-label={`Selected is currently ${getOptionLabel(selected)}. Click to change.`}
          aria-expanded={isOpen}
          className={cn(
            'flex items-center justify-between gap-2 rounded-xl border transition-all duration-300 select-none cursor-pointer',
            size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-xs sm:text-sm',
            isOpen
              ? 'border-[var(--border-strong)] bg-[var(--bg-subtle)]'
              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]',
            className
          )}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
              className="flex items-center gap-2"
            >
              {renderIcon(
                selected,
                24,
                `transition-colors duration-300 ${isOpen ? 'text-[#AEAEAE] dark:text-neutral-500' : 'text-[#AFAFAF] dark:text-neutral-400'}`
              )}
            </motion.div>
          </AnimatePresence>
          <AnimatedText
            value={getOptionLabel(selected)}
            className="text-lg font-semibold text-neutral-700 dark:text-neutral-100"
          />

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            className="flex items-center"
          >
            <ChevronDown
              size={24}
              className={`transition-colors duration-300 ${isOpen ? 'text-[#AEAEAE] dark:text-neutral-500' : 'text-[#AFAFAF] dark:text-neutral-400'}`}
              strokeWidth={2.5}
            />
          </motion.div>
        </motion.button>
      </MotionConfig>
    </div>
  );
};

export default OptionPicker;

const AnimatedText = ({
  value,
  className,
}: {
  value: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex text-lg tracking-tight will-change-transform',
        className,
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {value.split('').map((char, index) => {
          const displayChar = char === ' ' ? '\u00A0' : char;

          return (
            <motion.span
              key={char + index}
              layout
              initial={{ opacity: 0, y: 5, scale: 0.7 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 200,
                  damping: 20,
                  delay: 0.03 * index,
                },
              }}
              exit={{ opacity: 0, y: -5, scale: 0.7 }}
            >
              {displayChar}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
