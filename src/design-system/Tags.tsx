'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { X } from 'lucide-react';

export type Tag = {
  id: string;
  label?: string;
  name?: string;
  count?: number;
};

export type TagsProps = {
  tags?: Tag[];
  initialTags?: Tag[];
  selectedTags?: Tag[];
  onChange?: (tags: Tag[]) => void;
  title?: string;
  className?: string;
};

const DEFAULT_TAGS: Tag[] = [
  { id: 'fiction', label: 'Fiction' },
  { id: 'romance', label: 'Romance' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'mystery', label: 'Mystery' },
  { id: 'scifi', label: 'Sci-Fi' },
  { id: 'poetry', label: 'Poetry' },
  { id: 'essays', label: 'Essays' },
  { id: 'thriller', label: 'Thriller' },
];

export function Tags({
  tags,
  initialTags,
  selectedTags: controlledSelected,
  onChange,
  title,
  className = '',
}: TagsProps) {
  const availableTags = tags || initialTags || DEFAULT_TAGS;
  const [internalSelecteds, setInternalSelecteds] = useState<Tag[]>([]);
  const selecteds = controlledSelected !== undefined ? controlledSelected : internalSelecteds;

  const selectedsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedsContainerRef.current) {
      selectedsContainerRef.current.scrollTo({
        left: selectedsContainerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [selecteds]);

  const removeSelectedTag = (id: string) => {
    const next = selecteds.filter((tag) => tag.id !== id);
    if (controlledSelected === undefined) {
      setInternalSelecteds(next);
    }
    if (onChange) onChange(next);
  };

  const addSelectedTag = (tag: Tag) => {
    const next = [...selecteds, tag];
    if (controlledSelected === undefined) {
      setInternalSelecteds(next);
    }
    if (onChange) onChange(next);
  };

  const getTagLabel = (t: Tag) => t.label || t.name || t.id;

  return (
    <MotionConfig transition={{ type: 'spring', stiffness: 300, damping: 40 }}>
      <div className={`relative flex w-full flex-col p-4 sm:p-5 ${className}`}>
        {title && (
          <motion.h2
            layout
            className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1"
          >
            {title}
          </motion.h2>
        )}
        <motion.div
          ref={selectedsContainerRef}
          layout
          className="mt-2 mb-3 flex min-h-14 w-full flex-wrap gap-1.5 rounded-2xl border-[1.6px] border-[#E5E5E5] bg-[#fefefe] p-1.5 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {selecteds.map((tag) => (
            <motion.div
              key={tag.id}
              layoutId={`tag-${tag.id}`}
              className="flex w-fit items-center gap-1 border-[1.6px] border-[#E5E5E5] bg-white py-1 pr-1 pl-3 dark:border-neutral-700 dark:bg-neutral-800"
              style={{ borderRadius: 10, zIndex: 20 }}
            >
              <motion.span
                layoutId={`tag-${tag.id}-label`}
                className="truncate font-medium text-xs text-gray-700 dark:text-neutral-200"
              >
                {getTagLabel(tag)}
              </motion.span>

              <button
                type="button"
                title="Remove"
                onClick={() => removeSelectedTag(tag.id)}
                className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="size-3.5 text-gray-400 dark:text-neutral-400" />
              </button>
            </motion.div>
          ))}
        </motion.div>
        {availableTags.length > selecteds.length && (
          <motion.div
            layout
            className="w-full rounded-2xl border-[1.6px] border-[#E5E5E5] bg-white p-2.5 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <motion.div className="flex flex-wrap gap-1.5">
              {availableTags
                .filter(
                  (tag) =>
                    !selecteds.some((selected) => selected.id === tag.id),
                )
                .map((tag) => (
                  <motion.button
                    type="button"
                    key={tag.id}
                    layoutId={`tag-${tag.id}`}
                    onClick={() => addSelectedTag(tag)}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[#F4F4FB] px-3.5 py-1.5 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
                    style={{ borderRadius: 10, zIndex: 10 }}
                  >
                    <motion.span
                      layoutId={`tag-${tag.id}-label`}
                      className="font-medium text-gray-700 dark:text-neutral-200"
                    >
                      {getTagLabel(tag)}
                    </motion.span>
                  </motion.button>
                ))}
            </motion.div>
          </motion.div>
        )}
      </div>
    </MotionConfig>
  );
}

export default Tags;
