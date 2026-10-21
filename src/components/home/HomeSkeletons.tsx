/* ==========================================================================
   HOME SKELETONS — Zero-dependency layout skeletons for 0ms CLS fallbacks
   ========================================================================== */

export function LoggedInHomeSkeleton() {
  return (
    <div className="logged-in-home-container min-h-screen py-3 sm:py-7 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3 sm:space-y-5 animate-pulse">
      {/* 1. WELCOME BANNER SKELETON */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3 sm:pb-4 border-b border-[var(--border-subtle)]">
        <div className="space-y-2">
          <div className="h-7 sm:h-9 w-64 bg-[var(--bg-subtle)] rounded-md" />
          <div className="h-3.5 w-40 bg-[var(--bg-subtle)]/70 rounded-md" />
        </div>
        <div className="h-8 w-28 bg-[var(--bg-subtle)] rounded-md" />
      </header>

      {/* 2. READING DESK SKELETON */}
      <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col md:flex-row gap-3.5 lg:gap-5 items-stretch">
          <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 space-y-3 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] pb-2.5 md:pb-0 md:pr-3.5 lg:pr-4">
            <div className="h-3 w-28 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3">
              <div className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-[var(--bg-subtle)] rounded" />
                <div className="h-3 w-1/2 bg-[var(--bg-subtle)] rounded" />
                <div className="h-2 w-full bg-[var(--bg-subtle)] rounded" />
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-[var(--bg-subtle)] rounded" />
            <div className="flex items-center gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-14 bg-[var(--bg-subtle)] rounded shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. FRESH DROPS SKELETON */}
      <section className="space-y-3 pt-1">
        <div className="h-6 w-48 bg-[var(--bg-subtle)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[3/4] bg-[var(--bg-subtle)] rounded-xl" />
          ))}
        </div>
      </section>
    </div>
  )
}

export function CurrentlyReadingSkeleton() {
  return (
    <section id="active-novel" className="w-full">
      <div className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:p-3.5 shadow-2xs animate-pulse">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-24 sm:w-24 aspect-[2/3] rounded-lg bg-[var(--bg-subtle)] shrink-0 border border-[var(--border-subtle)]" />

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-14 bg-[var(--bg-subtle)] rounded-md" />
                <div className="h-3 w-24 bg-[var(--bg-subtle)]/70 rounded" />
              </div>

              <div className="h-4 sm:h-5 w-44 sm:w-56 bg-[var(--bg-subtle)] rounded-md" />

              <div className="space-y-1 max-w-md pt-0.5">
                <div className="flex items-center justify-between">
                  <div className="h-2.5 w-24 bg-[var(--bg-subtle)] rounded" />
                  <div className="h-2.5 w-10 bg-[var(--bg-subtle)] rounded" />
                </div>
                <div className="w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-subtle)]" />
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <div className="flex-1 sm:flex-initial sm:w-32 h-8 bg-[var(--bg-subtle)] rounded-lg" />
              <div className="h-8 w-8 bg-[var(--bg-subtle)] rounded-lg shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function PublicHomeSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#121316] animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <div className="h-6 w-32 bg-[#EAE4D8] dark:bg-neutral-800 rounded-full" />
            <div className="space-y-3">
              <div className="h-12 w-3/4 bg-[#EAE4D8] dark:bg-neutral-800 rounded-lg" />
              <div className="h-12 w-2/3 bg-[#EAE4D8] dark:bg-neutral-800 rounded-lg" />
            </div>
            <div className="h-4 w-5/6 bg-[#EAE4D8] dark:bg-neutral-800 rounded" />
            <div className="flex gap-4 pt-4">
              <div className="h-12 w-36 bg-[#EAE4D8] dark:bg-neutral-800 rounded-full" />
              <div className="h-12 w-36 bg-[#EAE4D8] dark:bg-neutral-800 rounded-full" />
            </div>
          </div>
          <div className="lg:col-span-7 aspect-[16/10] bg-[#EAE4D8] dark:bg-neutral-800 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
