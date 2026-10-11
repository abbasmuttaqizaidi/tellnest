Home page for private users(Users who are logged in).
When implementing, make sure you will use the design-system components only and wont copy the text-family and coloring. You are instructed to implement the layout only

<!DOCTYPE html><html lang="en" style=""><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1.0" name="viewport"><meta content="web_standard" name="shell-type"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"><link href="https://fonts.googleapis.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&amp;family=Plus+Jakarta+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet" class=""><style class="">.font-headline-lg, .font-headline-md, .font-headline-sm, .font-title-story, .font-display-hero, [class*='font-headline'], h1, h2, h3, h4, h5 { font-family: 'Outfit', sans-serif !important; } .font-body-ui, .font-body-reading, p, [class*='font-label'], button, a, span, input { font-family: 'Plus Jakarta Sans', Inter, sans-serif !important; } .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }</style><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:ital,wght@0,400..700;1,400..700&amp;family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&amp;family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"><style>@layer base{html,body{margin:0;padding:0;}body{overscroll-behavior:none;}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}</style><script src="https://cdn.tailwindcss.com"></script><script id="tailwind-config">tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      "colors": {
        "inverse-surface": "#2e312a",
        "surface-container-low": "#f3f5e9",
        "surface-variant": "#e1e4d9",
        "on-primary-fixed-variant": "#3c4b36",
        "outline": "#757870",
        "on-background": "#191d16",
        "on-surface-variant": "#444841",
        "surface-container-highest": "#e1e4d9",
        "on-primary-fixed": "#121f0e",
        "on-tertiary": "#ffffff",
        "secondary-fixed": "#d8e7cd",
        "error": "#ba1a1a",
        "inverse-primary": "#bbcbb1",
        "surface-container": "#edefe4",
        "inverse-on-surface": "#f0f2e7",
        "surface": "#f9faef",
        "on-secondary-container": "#596652",
        "outline-variant": "#c4c8be",
        "surface-dim": "#d9dbd0",
        "on-error-container": "#93000a",
        "background": "#f9faef",
        "on-primary-container": "#d7e8cc",
        "on-tertiary-fixed-variant": "#46464a",
        "surface-tint": "#54634d",
        "secondary-container": "#d6e4ca",
        "tertiary-fixed-dim": "#c7c6ca",
        "error-container": "#ffdad6",
        "surface-bright": "#f9faef",
        "primary-fixed": "#d7e8cc",
        "primary-fixed-dim": "#bbcbb1",
        "tertiary": "#4c4c50",
        "on-tertiary-fixed": "#1a1b1f",
        "surface-container-lowest": "#ffffff",
        "on-secondary-fixed-variant": "#3e4a37",
        "tertiary-fixed": "#e3e2e6",
        "on-secondary-fixed": "#131f0e",
        "secondary-fixed-dim": "#bccbb2",
        "tertiary-container": "#646468",
        "on-surface": "#191d16",
        "primary": "#42513c",
        "surface-container-high": "#e7e9de",
        "on-error": "#ffffff",
        "secondary": "#55624e",
        "on-secondary": "#ffffff",
        "primary-container": "#5a6953",
        "on-primary": "#ffffff",
        "on-tertiary-container": "#e3e1e6"
      },
      "borderRadius": {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      "spacing": {
        "space-2xl": "4rem",
        "margin-mobile": "1rem",
        "space-lg": "1.5rem",
        "space-xs": "0.25rem",
        "space-md": "1rem",
        "space-sm": "0.5rem",
        "gutter": "1.5rem",
        "space-xl": "2.5rem",
        "margin": "2rem",
        "gutter-mobile": "1rem"
      },
      "fontFamily": {
        "title-story": [
          "Newsreader"
        ],
        "body-ui": [
          "\"Source Serif 4\""
        ],
        "label-caps-dense": [
          "Archivo Narrow"
        ],
        "body-reading": [
          "\"Source Serif 4\""
        ],
        "body-reading-lg": [
          "\"Source Serif 4\""
        ],
        "headline-lg-mobile": [
          "Newsreader"
        ],
        "display-hero": [
          "Newsreader"
        ],
        "label-data": [
          "Archivo Narrow"
        ],
        "label-ui": [
          "Archivo Narrow"
        ],
        "headline-lg": [
          "Newsreader"
        ],
        "headline-sm": [
          "Newsreader"
        ],
        "headline-md": [
          "Newsreader"
        ],
        "display-hero-mobile": [
          "Newsreader"
        ]
      },
      "fontSize": {
        "title-story": [
          "19px",
          {
            "lineHeight": "24px",
            "fontWeight": "600"
          }
        ],
        "body-ui": [
          "15px",
          {
            "lineHeight": "22px",
            "fontWeight": "400"
          }
        ],
        "label-caps-dense": [
          "12px",
          {
            "lineHeight": "14px",
            "letterSpacing": "0.08em",
            "fontWeight": "700"
          }
        ],
        "body-reading": [
          "17px",
          {
            "lineHeight": "28px",
            "fontWeight": "400"
          }
        ],
        "body-reading-lg": [
          "20px",
          {
            "lineHeight": "32px",
            "fontWeight": "400"
          }
        ],
        "headline-lg-mobile": [
          "28px",
          {
            "lineHeight": "34px",
            "letterSpacing": "-0.01em",
            "fontWeight": "500"
          }
        ],
        "display-hero": [
          "56px",
          {
            "lineHeight": "64px",
            "letterSpacing": "-0.02em",
            "fontWeight": "400"
          }
        ],
        "label-data": [
          "13px",
          {
            "lineHeight": "16px",
            "letterSpacing": "0.01em",
            "fontWeight": "500"
          }
        ],
        "label-ui": [
          "14px",
          {
            "lineHeight": "18px",
            "letterSpacing": "0.02em",
            "fontWeight": "600"
          }
        ],
        "headline-lg": [
          "40px",
          {
            "lineHeight": "48px",
            "letterSpacing": "-0.015em",
            "fontWeight": "500"
          }
        ],
        "headline-sm": [
          "22px",
          {
            "lineHeight": "28px",
            "fontWeight": "600"
          }
        ],
        "headline-md": [
          "28px",
          {
            "lineHeight": "36px",
            "letterSpacing": "-0.01em",
            "fontWeight": "600"
          }
        ],
        "display-hero-mobile": [
          "36px",
          {
            "lineHeight": "42px",
            "letterSpacing": "-0.01em",
            "fontWeight": "400"
          }
        ]
      }
    }
  }
}</script></head><body class="bg-surface font-body-ui text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container" style="--font-outfit: 'Outfit', sans-serif; --font-body: 'Plus Jakarta Sans', Inter, sans-serif; font-family: var(--font-body);"><header class="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]"><div class="h-20 max-w-[1280px] mx-auto px-margin flex items-center justify-between gap-gutter"><div class="flex items-center gap-space-lg flex-shrink-0"><div class="flex items-center gap-space-sm"><img src="https://lh3.googleusercontent.com/aida/AEtjO1U0UeOso1pzbTVvZ7nglKB4eT8gU18FJttgF0lmNrPGROQ2XHP0DwnCt2Q3w4hl8eMObRyrccmjSnDLfUIfbGbErR7Agdnl2BrbmE-05gGPk5ORFj2eijLnWLpkgBmPZU5wS-MqWytLtp3tCguZQwjUDk3lJ87INDbu_yMhHzey87MLHwmu_kpIbGB0lXNcWGij3jY98WOprtd-90FOaj8nvoRD40JSA72_eqGDvp1NrG8Y8QXtPX-A-aQ" alt="Hatchpen" class="h-8 w-auto object-contain"></div><nav class="hidden lg:flex items-center gap-space-lg" data-active-classes="text-on-surface font-headline-sm underline decoration-primary decoration-2 underline-offset-8"><a aria-current="page" class="uppercase transition-colors text-on-surface font-headline-sm underline decoration-primary decoration-2 underline-offset-8" data-path="home" href="#">Home</a><a class="font-label-ui text-label-ui uppercase text-on-surface-variant hover:text-on-surface transition-colors" data-path="explore-and-trending" href="#">Explore &amp; Trending</a><a class="font-label-ui text-label-ui uppercase text-on-surface-variant hover:text-on-surface transition-colors" data-path="my-library-and-saved" href="#">My Library &amp; Saved</a><a class="font-label-ui text-label-ui uppercase text-on-surface-variant hover:text-on-surface transition-colors" data-path="rankings" href="#">Rankings</a></nav></div><div class="flex-1 max-w-md hidden md:block"><div class="relative flex items-center bg-surface-container rounded-lg px-space-md py-space-xs text-on-surface"><span class="material-symbols-outlined text-outline mr-space-sm text-[20px]">search</span><input class="w-full bg-transparent border-none outline-none font-body-ui text-body-ui placeholder:text-outline text-on-surface" placeholder="Search stories, tags, authors..." type="text" style="font-family: &quot;Plus Jakarta Sans&quot;, sans-serif !important;"></div></div><div class="flex items-center gap-space-md flex-shrink-0"><a class="inline-flex items-center justify-center bg-primary-container hover:bg-primary text-on-primary font-label-caps-dense text-label-caps-dense uppercase px-space-lg py-space-sm rounded-lg transition-all shadow-[0_2px_8px_rgba(90,105,83,0.2)]" data-path="write-and-publish" href="#"><span class="material-symbols-outlined mr-space-xs text-[18px]">edit_note</span>Write &amp; Publish</a><div class="flex items-center gap-space-sm pl-space-xs"><img alt="Profile" class="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAMIYySI-xrYhuxdm6EzVZhyWytDmfMrh8v9KWUcKLh47CGUknaJLOhawE0K-kQAcBmpXETBAzvs8Kwt0uUD-GvpXM-1Y5YJweuKx1jFiVnmHJQ2UhqovBhoSdSaauCN-vE8s5DOfPkOXze-EazdFY0UyvFLh321xuG4iHbuIGEhYtP1LsMA1ODFFHdsao1GI1S3xnwTIQc5QsHL9s96YGzMMArsuXEAdFyExcM47iLLKoZ2OGrbhFNg"><span class="hidden xl:block font-label-ui text-label-ui text-on-surface">E. Vance</span></div></div></div></header><main class="w-full pt-20 bg-surface min-h-screen pb-space-2xl"><div class="flex flex-col w-full">
<!-- Interactive Top Action & Orientation Bar -->
<section class="max-w-[1280px] w-full mx-auto px-margin pt-space-lg pb-space-md">
<div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl shadow-sm">
<!-- Quick Navigation Anchors -->
<div class="flex items-center gap-space-xs overflow-x-auto pb-1 md:pb-0 scrollbar-none">
<a class="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-all duration-200" href="#saved-shelf">
<span class="material-symbols-outlined text-[18px] text-primary">bookmark_manager</span>
<span class="font-label-ui text-label-ui whitespace-nowrap">Jump to Saved</span>
</a>
<a class="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-all duration-200" href="#trending-serials">
<span class="material-symbols-outlined text-[18px] text-error">local_fire_department</span>
<span class="font-label-ui text-label-ui whitespace-nowrap">Trending Serial Feeds</span>
</a>
<a class="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-all duration-200" href="#active-novel">
<span class="material-symbols-outlined text-[18px] text-primary">history</span>
<span class="font-label-ui text-label-ui whitespace-nowrap">Current Book</span>
</a>
<a class="inline-flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded-full shadow-sm transition-all duration-200" href="#author-atelier">
<span class="material-symbols-outlined text-[18px] text-secondary">edit_document</span>
<span class="font-label-ui text-label-ui whitespace-nowrap">Start Chapter</span>
</a>
</div>
<!-- Quick Exploration Autocomplete Tags -->
<div class="flex items-center gap-space-xs overflow-x-auto scrollbar-none text-on-surface-variant">
<span class="font-label-caps-dense text-label-caps-dense uppercase text-outline tracking-wider flex-shrink-0 mr-1">Trending Tags:</span>
<button class="font-label-data text-label-data px-2.5 py-1 bg-surface-container rounded hover:bg-surface-dim transition-colors text-on-surface" type="button">#DarkRomance</button>
<button class="font-label-data text-label-data px-2.5 py-1 bg-surface-container rounded hover:bg-surface-dim transition-colors text-on-surface" type="button">#SciFiThriller</button>
<button class="font-label-data text-label-data px-2.5 py-1 bg-surface-container rounded hover:bg-surface-dim transition-colors text-on-surface" type="button">#SlowBurn</button>
<button class="font-label-data text-label-data px-2.5 py-1 bg-surface-container rounded hover:bg-surface-dim transition-colors text-on-surface" type="button">#FolkloreNoir</button>
</div>
</div>
</section>
<!-- Pick Up Where You Left Off: Asymmetric Primary Hero Card -->
<section class="max-w-[1280px] w-full mx-auto px-margin py-space-md" id="active-novel">
<div class="flex items-center justify-between mb-space-sm">
<div class="flex items-center gap-space-sm">
<span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
<span class="font-label-caps-dense text-label-caps-dense uppercase text-primary tracking-widest">Active Novel in Session</span>
</div>
<div class="flex items-center gap-space-sm">
<span class="font-label-data text-label-data text-on-surface-variant">Synchronized 4m ago across Atelier Web &amp; Mobile</span>
</div>
</div>
<div class="rounded-xl shadow-md p-space-lg lg:p-space-xl relative overflow-hidden bg-surface-container-low">
<div class="absolute -top-24 -right-24 w-96 h-96 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none"></div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center relative z-10">
<!-- Story Book Jacket & Visual Anchor -->
<div class="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center gap-space-lg">
<div class="relative w-44 sm:w-52 h-64 sm:h-72 rounded-lg overflow-hidden shadow-xl flex-shrink-0 group">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="Editorial book cover jacket showing botanical silhouettes, a misty Victorian glasshouse at twilight with deep emerald sage tones and gold typography reading The Glass Greenhouse serial edition" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEg7UDf4YDIrxLoUGAtbr97N6TZmuOHgUDxE4ImzY_ZW_md2kS1x7MJolZfcJot3Tk60lyNBKuwySw9yud6edCGUC_QEWJRXe3PuNv1IN8QDOSsue_Rf4BIaVAcn39CQ0iIi80uPHFIXwSmbApBvVDC34hsFzRwOqVPLPQA53M9DvTi6HaR8VNAYI9VE38LVfB72RIeuVMNVMWlyzWtqOjTR_Ihvy_OyiU5D7a7AqecMecjjND-Lob7Q">
<div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent"></div>
<div class="absolute bottom-3 left-3 right-3 text-inverse-on-surface">
<span class="font-label-caps-dense text-[10px] tracking-wider uppercase bg-surface-container-highest/30 backdrop-blur-sm px-2 py-0.5 rounded">Part II: The Bloom</span>
</div>
</div>
<div class="w-full flex-1">
<div class="flex items-center justify-between font-label-data text-label-data text-on-surface-variant mb-1.5">
<span class="">Serial Progress</span>
<span class="font-label-ui text-on-surface">Chapter 14 of 32 (78%)</span>
</div>
<!-- Progress Bar -->
<div class="w-full h-2 bg-surface-container rounded-full overflow-hidden">
<div class="h-full bg-primary-container rounded-full w-[78%] transition-all duration-500"></div>
</div>
<div class="flex items-center justify-between mt-2 font-label-data text-[12px] text-outline">
<span class="">~12 min remaining</span>
<span class="">Updated yesterday</span>
</div>
</div>
</div>
<!-- Serial Narrative Center & Immediate Action -->
<div class="lg:col-span-8 flex flex-col justify-between h-full">
<div>
<div class="flex flex-wrap items-center gap-space-xs mb-space-sm">
<span class="bg-secondary-container text-on-secondary-container font-label-caps-dense text-label-caps-dense px-2 py-1 rounded">Dark Mystery</span>
<span class="bg-surface-container text-on-surface-variant font-label-caps-dense text-label-caps-dense px-2 py-1 rounded">Serialized Weekly</span>
<span class="font-label-data text-label-data text-on-surface-variant flex items-center gap-1 ml-2">
<span class="material-symbols-outlined text-[16px] text-secondary">verified</span>
                Staff Atelier Selection
              </span>
</div>
<h2 class="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-tight mb-space-xs" style="font-family: Newsreader, Georgia, serif !important;">
              The Glass Greenhouse
            </h2>
<div class="flex items-center gap-space-sm mb-space-md text-on-surface-variant font-body-ui text-body-ui">
<span class="">By <span class="font-semibold text-on-surface">Cordelia Vance</span></span>
<span class="">•</span>
<span class="">184.2K Serial Reads</span>
<span class="">•</span>
<span class="flex items-center gap-1 text-on-surface font-label-data">
<span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">star</span> 4.96 rating
              </span>
</div>
<!-- Last Highlighted Passage / Quote Excerpt -->
<div class="bg-surface-container-low p-space-md rounded-lg mb-space-lg relative">
<div class="flex items-start gap-space-sm">
<span class="material-symbols-outlined text-outline text-[24px] flex-shrink-0">format_quote</span>
<div>
<p class="font-body-reading text-body-reading italic text-on-surface-variant leading-relaxed" style="font-family: Newsreader, &quot;Source Serif 4&quot;, Georgia, serif !important;">
                    “Under the condensation of the lower panes, the third specimen had finally uncoiled its rusted petals. What we assumed was dormant had simply been gathering an unhurried, ravenous momentum.”
                  </p>
<span class="block mt-2 font-label-data text-[12px] text-outline uppercase tracking-wider">Bookmarked from Ch. 13 • Par. 44</span>
</div>
</div>
</div>
</div>
<!-- Hero Action Controls -->
<div class="flex flex-wrap items-center gap-space-md pt-space-xs">
<a class="inline-flex items-center gap-space-sm bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui uppercase tracking-wider px-space-xl py-3.5 rounded-lg shadow-md transition-all duration-200" href="#">
<span class="">Resume Chapter 14</span>
<span class="material-symbols-outlined text-[20px]">arrow_forward</span>
</a>
<!-- Switch Book Dropdown Trigger -->
<div class="relative group">
<button class="inline-flex items-center gap-space-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui px-space-md py-3.5 rounded-lg transition-colors" type="button">
<span class="material-symbols-outlined text-[18px]">swap_horiz</span>
<span class="">Switch Active Reading</span>
<span class="material-symbols-outlined text-[16px]">expand_more</span>
</button>
</div>
<button class="inline-flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface font-label-data text-label-data px-space-sm py-2 transition-colors ml-auto" type="button">
<span class="material-symbols-outlined text-[18px]">toc</span>
<span class="">All 32 Chapters</span>
</button>
</div>
</div>
</div>
</div>
</section>
<!-- Trending & Community Rankings (Wattpad Reimagined for Connoisseurs) -->
<section class="max-w-[1280px] w-full mx-auto px-margin pt-space-xl pb-space-lg" id="trending-serials">
<div class="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-lg">
<div>
<div class="flex items-center gap-2 mb-1">
<span class="font-label-caps-dense text-label-caps-dense uppercase text-primary tracking-widest">Serial Leaderboards</span>
<span class="text-outline">•</span>
<span class="font-label-data text-[12px] text-on-surface-variant">Live Ranking by Velocity &amp; Upvotes</span>
</div>
<h3 class="font-headline-md text-headline-md text-on-surface" style="font-family: Newsreader, Georgia, serif !important;">Trending Serials Today</h3>
</div>
<div class="flex items-center gap-space-xs font-label-ui text-label-ui" style="font-family: Outfit, &quot;Plus Jakarta Sans&quot;, sans-serif !important;">
<button class="px-space-md py-1.5 rounded-full bg-inverse-surface text-inverse-on-surface" type="button">All Genres</button>
<button class="px-space-md py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high" type="button">Romance</button>
<button class="px-space-md py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high" type="button">Speculative</button>
<button class="px-space-md py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high" type="button">Historical Noir</button>
</div>
</div>
<!-- Leaderboard Bento Grid: 3 Rich Serials -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
<!-- Card #1 -->
<div class="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group bg-surface-container-low">
<div class="relative h-64 overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="Cinematic book cover art featuring an ornate antique clocktower breaking through ocean tides at dawn with moody sage green and charcoal palette" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKKqOigJsP0CV7DGBXSWmZ6CG6LVf272Ly09Cor2rr-VyWOomY9xuWtkxKOkjfC6aSAAuraJRzB3UbaHX8xuCUlkCuZvRlFEGkuaUyUafI9Ho-RdxmZ-AsJWmWJOWsYS29L92VGahbZtjn6rpoYvdsgWdpJ8a0dAuTuXUofAueyvPejlI1B9wcHbH1zuiax9HF_apivgJAvjXUZkI2b2aECBXI5CE24FxJGIFrlSglTMcGq49aosGBeQ">
<div class="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent"></div>
<!-- Rank Pill -->
<div class="absolute top-3 left-3 bg-inverse-surface text-inverse-on-surface px-2.5 py-1 rounded font-label-caps-dense text-label-caps-dense uppercase tracking-wider flex items-center gap-1 shadow-md">
<span class="text-secondary-fixed">#1</span>
<span class="">in Dark Fantasy</span>
</div>
<!-- Quick Action Bookmark Icon -->
<button class="absolute top-3 right-3 w-9 h-9 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface-container-lowest flex items-center justify-center hover:bg-inverse-surface transition-colors" onclick="this.classList.toggle('text-secondary-fixed'); this.classList.toggle('text-surface-container-lowest');" title="Save to Library" type="button">
<span class="material-symbols-outlined text-[20px]">bookmark_add</span>
</button>
<div class="absolute bottom-3 left-4 right-4 text-surface-container-lowest">
<span class="font-label-caps-dense text-[11px] tracking-wider uppercase text-secondary-fixed">Complete Season 1 • 48 Parts</span>
<h4 class="font-title-story text-title-story text-white leading-snug line-clamp-1 mt-0.5" style="font-family: Newsreader, Georgia, serif !important;">The Archival Tides of Vey</h4>
</div>
</div>
<div class="p-space-md flex-1 flex flex-col justify-between">
<p class="font-body-ui text-body-ui text-on-surface-variant line-clamp-2 mb-space-md">
            When the submerged cathedrals of the western shelf begin chiming their drowned bells, only a rogue cartographer knows what stirs beneath.
          </p>
<div>
<!-- Metrics Row -->
<div class="flex items-center justify-between text-on-surface-variant font-label-data text-label-data pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-outline">visibility</span> 1.8M Reads
              </span>
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-error">favorite</span> 112K Votes
              </span>
<span class="flex items-center gap-1 text-on-surface">
<span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">star</span> 4.94
              </span>
</div>
<!-- Author & Fast CTA -->
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<img class="w-7 h-7 rounded-full object-cover" data-alt="Author portrait headshot of a thoughtful woman with wire glasses in soft window light and dark attire" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFQ8xyC3gCY7gXzy5EUQ3UjieBL3zEFV_gIFzX0WgyAW4ye8ZiKmbEuksRi4QB_-G2MHqklISk2uJ8B9gqGqEwc6G4eAPvWw4j-CZ0H1LZ42Def-nLaJB0_wyMmxeNKC4bMlbBHivx_0c5aHplW7mjziAPxz7vyyLmmDFQ8Vtq356LVAbkJg0n4uZpaMqzj1Jb43zfO7vkhffp9Tg9JLVrtCbh8RoCzvLs3VQdk8JclCn0ZvRswiCSWg">
<span class="font-label-ui text-label-ui text-on-surface">Mara Solin</span>
</div>
<a class="inline-flex items-center gap-1 font-label-caps-dense text-label-caps-dense uppercase text-primary hover:text-primary-container transition-colors py-1 px-2 rounded hover:bg-surface-container" href="#">
                Read Part 1 →
              </a>
</div>
</div>
</div>
</div>
<!-- Card #2 -->
<div class="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group bg-surface-container-low">
<div class="relative h-64 overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="Atmospheric book cover featuring two silhouettes facing away in a grand marble lecture hall drenched in dusty late afternoon golden sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3TxJ5_hvfPu7wlnoUG6ooA0XY5QXgrwKMJSwY_NlhzpxEODBj3XGdMRA8TiZqLiubfQZ7iItAuBOzHf6hwB0WwaIMmIzxIu14yVyCqSI1dFPrtZj5Ykmd1sXC-7CSRkH8eyzSJttqIcxf_nsTosSiAAjptE2G0HMJa3wi9wOofms7bViaUQDYyalDV_1jPzwYJvJ3XbdRBtF4FgkUT3Z7wbCOjqJQoJNPtWlSQymyj1K0ODLbLYU2Qg">
<div class="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent"></div>
<div class="absolute top-3 left-3 bg-inverse-surface text-inverse-on-surface px-2.5 py-1 rounded font-label-caps-dense text-label-caps-dense uppercase tracking-wider flex items-center gap-1 shadow-md">
<span class="text-secondary-fixed">#2</span>
<span class="">in Academic Romance</span>
</div>
<button class="absolute top-3 right-3 w-9 h-9 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface-container-lowest flex items-center justify-center hover:bg-inverse-surface transition-colors" onclick="this.classList.toggle('text-secondary-fixed'); this.classList.toggle('text-surface-container-lowest');" title="Save to Library" type="button">
<span class="material-symbols-outlined text-[20px]">bookmark_add</span>
</button>
<div class="absolute bottom-3 left-4 right-4 text-surface-container-lowest">
<span class="font-label-caps-dense text-[11px] tracking-wider uppercase text-secondary-fixed">Ongoing • 62 Parts</span>
<h4 class="font-title-story text-title-story text-white leading-snug line-clamp-1 mt-0.5" style="font-family: Newsreader, Georgia, serif !important;">Quiet Proofs Between Us</h4>
</div>
</div>
<div class="p-space-md flex-1 flex flex-col justify-between">
<p class="font-body-ui text-body-ui text-on-surface-variant line-clamp-2 mb-space-md">
            Two rival mathematics fellows at Cambridge share a single desk and an unyielding grudge until a shared coded manuscript turns competition into obsession.
          </p>
<div>
<div class="flex items-center justify-between text-on-surface-variant font-label-data text-label-data pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-outline">visibility</span> 2.4M Reads
              </span>
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-error">favorite</span> 168K Votes
              </span>
<span class="flex items-center gap-1 text-on-surface">
<span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">star</span> 4.98
              </span>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<img class="w-7 h-7 rounded-full object-cover" data-alt="Author portrait headshot of a young male author writing in a notebook in a library setting with warm sepia tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZ6_1gG0PRXpGe0E78IMVO_Hw9uEfAMrth6Mv3XMneBIJkz8_0Ly4T_hu0Jy4kj_gLEeoIaTI0BeRajr7xAx2Rk6NWswdBbMIUfIZZaTIoDDyMlsW7G-IgKzBBMrsEaNI-j_l8eiAJ7CeWDUKXRlMfR8EFgXGuObcVdcuzpwvrzgw1rl044pcfbLonFnGwOBUOLdUQsEMCtu24IbW75QDhB6OptpyNeXwE_Nk451dOxE1XT3eq4Z1w6w">
<span class="font-label-ui text-label-ui text-on-surface">Julian Thorne</span>
</div>
<a class="inline-flex items-center gap-1 font-label-caps-dense text-label-caps-dense uppercase text-primary hover:text-primary-container transition-colors py-1 px-2 rounded hover:bg-surface-container" href="#">
                Read Part 1 →
              </a>
</div>
</div>
</div>
</div>
<!-- Card #3 -->
<div class="rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden group bg-surface-container-low">
<div class="relative h-64 overflow-hidden">
<img class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" data-alt="Moody book jacket depicting a brutalist concrete lighthouse in a storm over dark green waves with stark typography" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbuOC7iCSXMaINL0fZdHiCVBtRj4ml4zuaKrr_nlOnGmnqZUU4NAfV39JZOikhVm8E-Y1pPC75Byul82GpyQEEunytQJ0uyagAOJ8FXhIvwK8_X0gEsXEQKmEPb2XGsuqAUTqeafZkLNZlPv0-RnjFBx1wRhml5Ljrb6jj3VR7hTqz2V9xviLTpeXmG5DNEunw8DpqkCPyd8AsQFyDxC4fq61jVKcmDYOQGlS8FbBHHpGJ2nCYvyqQdw">
<div class="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent"></div>
<div class="absolute top-3 left-3 bg-inverse-surface text-inverse-on-surface px-2.5 py-1 rounded font-label-caps-dense text-label-caps-dense uppercase tracking-wider flex items-center gap-1 shadow-md">
<span class="text-secondary-fixed">#3</span>
<span class="">in Coastal Noir</span>
</div>
<button class="absolute top-3 right-3 w-9 h-9 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface-container-lowest flex items-center justify-center hover:bg-inverse-surface transition-colors" onclick="this.classList.toggle('text-secondary-fixed'); this.classList.toggle('text-surface-container-lowest');" title="Save to Library" type="button">
<span class="material-symbols-outlined text-[20px]">bookmark_add</span>
</button>
<div class="absolute bottom-3 left-4 right-4 text-surface-container-lowest">
<span class="font-label-caps-dense text-[11px] tracking-wider uppercase text-secondary-fixed">New Releases • 21 Parts</span>
<h4 class="font-title-story text-title-story text-white leading-snug line-clamp-1 mt-0.5" style="font-family: Newsreader, Georgia, serif !important;">The Last Salt Warden</h4>
</div>
</div>
<div class="p-space-md flex-1 flex flex-col justify-between">
<p class="font-body-ui text-body-ui text-on-surface-variant line-clamp-2 mb-space-md">
            An isolated beacon keeper receives morse dispatches from a vessel that disappeared eighty years ago in the bay of Blackspire.
          </p>
<div>
<div class="flex items-center justify-between text-on-surface-variant font-label-data text-label-data pb-space-sm mb-space-sm bg-surface-container-low px-space-sm py-1.5 rounded">
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-outline">visibility</span> 920K Reads
              </span>
<span class="flex items-center gap-1">
<span class="material-symbols-outlined text-[16px] text-error">favorite</span> 74K Votes
              </span>
<span class="flex items-center gap-1 text-on-surface">
<span class="material-symbols-outlined text-[16px] text-primary" style="font-variation-settings: 'FILL' 1;">star</span> 4.89
              </span>
</div>
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<img class="w-7 h-7 rounded-full object-cover" data-alt="Portrait headshot of a seasoned novelist with graying hair sitting near a typewriter in a cozy study" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvkjohuzx15n-dlv4n-D2VpFPAdadfrVQfFfEDkwcPJoWrXSdwC3DkDZ96KEe5eyEAB325Eo2dMJLu3TjM7lOP7BRaNXj43FOMsIkvHYdOrG5jnc7mzlvnlycNngrikBqHYcNXxmNGeTUdcTYIgoc3QnUa4b-kFwee1Wh_DRdUKMjlW7wvOXIxWJQPEm8PNVHep4N9knEJKD8zzwf9V-54YRVmcC81Qait6RRH1KFEpEWMkVPZKZDzhg">
<span class="font-label-ui text-label-ui text-on-surface">E. K. Brauer</span>
</div>
<a class="inline-flex items-center gap-1 font-label-caps-dense text-label-caps-dense uppercase text-primary hover:text-primary-container transition-colors py-1 px-2 rounded hover:bg-surface-container" href="#">
                Read Part 1 →
              </a>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- My Reading Shelf & Saved Stories Section -->
<section class="max-w-[1280px] w-full mx-auto px-margin py-space-lg" id="saved-shelf">
<div class="bg-surface-container-low rounded-xl p-space-lg shadow-sm">
<div class="flex items-center justify-between mb-space-md">
<div class="flex items-center gap-space-sm">
<span class="material-symbols-outlined text-primary text-[24px]">collections_bookmark</span>
<h3 class="font-headline-sm text-headline-sm text-on-surface" style="font-family: Newsreader, Georgia, serif !important;">Your Reading Shelf</h3>
<span class="bg-surface-container-highest text-on-surface-variant font-label-caps-dense text-[11px] px-2 py-0.5 rounded-full ml-1">12 Books</span>
</div>
<a class="font-label-ui text-label-ui text-primary hover:text-on-surface transition-colors flex items-center gap-1" href="#">
<span class="">Open Full Atelier Library</span>
<span class="material-symbols-outlined text-[16px]">chevron_right</span>
</a>
</div>
<!-- Horizontal Serial Shelf -->
<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-space-md">
<!-- Shelf Item 1 -->
<div class="group cursor-pointer">
<div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 mb-2">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Book jacket design with dark botanical foliage and golden foil moth illustration on matte off-white background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiTc6sU0UXsOAMalFOB167R4W2dXIUnZX3UBljsI7mt6jt213HVqjyEWRWNLzTV4p6z8r7PkRs-mSiAQyxo9tb2gitYRb3MLvxvXMfjdgiDGFcI3REWJZ1CIkE1FdEyBi01p6WuWsKR31uL5M62-gT9n2vBgVJ86dcdOtB6SVTuECHnIfsO2Q1GWx4JpGjpHgRqruMVbl6YYoj8evAVeiyWLpTi8Oe9Q4iZIPFu1UZmYvj6hN4tPoT9A">
<div class="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface font-label-caps-dense text-[10px] px-1.5 py-0.5 rounded">Ch. 8/24</div>
</div>
<h5 class="font-title-story text-[15px] leading-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors" style="font-family: Newsreader, Georgia, serif !important;">Night Moth Nocturnes</h5>
<span class="font-label-data text-[12px] text-on-surface-variant block mt-0.5">S. Delacroix</span>
</div>
<!-- Shelf Item 2 -->
<div class="group cursor-pointer">
<div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 mb-2">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Minimalist book cover featuring a lonely lighthouse in dense fog with dark olive green gradient" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBg3z_n1Ir0qOY3Tyt03k8-LN-iaWdhQuMXq2AxrrIqRv3A7_RkpAz6h_TaYu5YmljyPI6Lm8vSVfNFsZOQGkppD6TBzYFzoIjfG5LAnGh2bz4zEazl2g-awFGCpSIuFyJvAuAHGZas4xJo5Hdg0vZZDaGTlFJakNnkgM6dAv0bZiBlNCl1olq-U4iAZ7FIK0uPHt6MbsIWjZ42UPfUalqz4MX0HhgxySXwOR0iWGec25go3-bZ4nPrYw">
<div class="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface font-label-caps-dense text-[10px] px-1.5 py-0.5 rounded">Ch. 20/20</div>
</div>
<h5 class="font-title-story text-[15px] leading-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors" style="font-family: Newsreader, Georgia, serif !important;">The Iron Bell Tolls</h5>
<span class="font-label-data text-[12px] text-on-surface-variant block mt-0.5">K. Lindqvist</span>
</div>
<!-- Shelf Item 3 -->
<div class="group cursor-pointer">
<div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 mb-2">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Vintage book cover design showing classical statues in a shadowy stone corridor with muted earth tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3M78NY7hKzzJhsHinrCae7go26ysw4PrufGIZnIakLA9kM6LhCtpxSzr0Ja8nQPDDvlWmYqRIfhelgZnxDeSJnKWE88YJ2qiervEAsS_5LuX2vgV8zE_RsrCRC_4h_TPiS1vxVQmUEooxRG_Y4OYyzNgzhcT9UnkP5TCaJ9ki7u45eDmWep2gcgHvp511_k7TSrHALmBjxslnr-J3770CtoVy6vS44kGO1V0kUycdR2k1sZiHWL2nNg">
<div class="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface font-label-caps-dense text-[10px] px-1.5 py-0.5 rounded">Ch. 3/16</div>
</div>
<h5 class="font-title-story text-[15px] leading-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors" style="font-family: Newsreader, Georgia, serif !important;">Letters to an Archaeologist</h5>
<span class="font-label-data text-[12px] text-on-surface-variant block mt-0.5">R. C. Holloway</span>
</div>
<!-- Shelf Item 4 -->
<div class="group cursor-pointer">
<div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 mb-2">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Graphic book cover with subtle hand-drawn labyrinth patterns in deep forest ink over off-white paper texture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD00kQDYVLKOaAKvR97aWWz0pva-CT2nxqiJ61-371IS4RsW0vPyijT8OD_crqhKEf3UG9whrE8Aca5q8SNtbY7oGMr77fs-KoZtyClmHQcKr8adPaq_d9UkGsnD5yaiYS1_YBTGyNhmTtbqRogzDdbzRLWtHZT5GfHKZvQC4VBynnrETnQ8Inx7PtM-IIUA6GZJrXDoNEy0NOA-SxrzvWieL4ywCqXA5aZCniM1w4pUXRkqbYat--j6w">
<div class="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface font-label-caps-dense text-[10px] px-1.5 py-0.5 rounded">Ch. 11/35</div>
</div>
<h5 class="font-title-story text-[15px] leading-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors" style="font-family: Newsreader, Georgia, serif !important;">The Minotaur Equation</h5>
<span class="font-label-data text-[12px] text-on-surface-variant block mt-0.5">D. K. Chen</span>
</div>
<!-- Shelf Item 5 -->
<div class="group cursor-pointer">
<div class="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-200 mb-2">
<img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" data-alt="Book jacket of an autumn orchard in heavy twilight mist with silhouettes of two riders in deep emerald green" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB35SVv7ZG3nJl11HvlqnPmyPrmjfUs3a3tw71LRWPncxxt66DY7Sb8odrbBhta8Z0N9JMSN4LDquESwsAuMWjPOD2717QHIWejsyQjEp58EhfhMOFFDt7W5nDtTxHh9U9FlGzUZMarl22QPjFWE3SKHeo0fN9NEBuH5QQ6_E6ivvvc8ysf4e3dcGDUsEGHVxKsHNvxlYaPENZngn3MI0AjDUr07hXoWQ0G-Iuet6LzVt7RN-KdHgYCgw">
<div class="absolute top-2 left-2 bg-inverse-surface/80 text-inverse-on-surface font-label-caps-dense text-[10px] px-1.5 py-0.5 rounded">Ch. 2/50</div>
</div>
<h5 class="font-title-story text-[15px] leading-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors" style="font-family: Newsreader, Georgia, serif !important;">A Winter Orchard</h5>
<span class="font-label-data text-[12px] text-on-surface-variant block mt-0.5">F. W. Miller</span>
</div>
<!-- Shelf Item 6: Add Story Action Card -->
<div class="aspect-[2/3] rounded-lg bg-surface-container flex flex-col items-center justify-center text-center p-3 hover:bg-surface-container-high transition-colors cursor-pointer group">
<div class="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface mb-2 shadow-sm group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-[20px]">add</span>
</div>
<span class="font-label-ui text-label-ui text-on-surface">Browse Catalog</span>
<span class="font-label-data text-[11px] text-outline mt-1">Discover 14K Serials</span>
</div>
</div>
</div>
</section>
<!-- Writer's Atelier / Publish Your Novel Spotlight -->
<section class="max-w-[1280px] w-full mx-auto px-margin pt-space-md pb-space-2xl" id="author-atelier">
<div class="bg-inverse-surface text-inverse-on-surface rounded-xl p-space-lg lg:p-space-xl shadow-lg relative overflow-hidden">
<!-- Ambient Graphic Ink Texture -->
<div class="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
<svg fill="currentColor" height="420" viewBox="0 0 200 200" width="420">
<path d="M100 0 L125 75 L200 100 L125 125 L100 200 L75 125 L0 100 L75 75 Z"></path>
</svg>
</div>
<div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center relative z-10">
<div class="lg:col-span-8">
<div class="inline-flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-highest/20 rounded font-label-caps-dense text-label-caps-dense uppercase tracking-wider text-secondary-fixed mb-space-sm">
<span class="material-symbols-outlined text-[16px]">file_png</span>
<span class="">Writer's Atelier • Serial Serialization Platform</span>
</div>
<h3 class="font-headline-lg text-headline-lg text-inverse-on-surface tracking-tight mb-space-xs" style="font-family: Newsreader, Georgia, serif !important;">
            Have a world to craft? Over 3.2M readers are looking for fresh chapters.
          </h3>
<p class="font-body-reading text-body-reading text-inverse-on-surface/80 max-w-2xl" style="font-family: Newsreader, &quot;Source Serif 4&quot;, Georgia, serif !important;">
            Publish serialized chapters on your schedule, build loyal subscriber circles, and access granular reader retention graphs chapter by chapter.
          </p>
<div class="flex flex-wrap items-center gap-space-lg mt-space-md">
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-secondary-fixed text-[20px]">draft</span>
<span class="font-label-data text-label-data">Draft in Progress: <strong class="text-inverse-on-surface font-semibold">“The Pale Cartography”</strong></span>
</div>
<div class="flex items-center gap-2">
<span class="material-symbols-outlined text-secondary-fixed text-[20px]">group</span>
<span class="font-label-data text-label-data">Active Atelier Audience: <strong class="text-inverse-on-surface font-semibold">14,240 Followers</strong></span>
</div>
</div>
</div>
<div class="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-space-sm">
<a class="inline-flex items-center justify-center gap-space-sm bg-primary-container hover:bg-primary text-on-primary font-label-ui text-label-ui uppercase tracking-wider px-space-lg py-3.5 rounded-lg shadow-md transition-all text-center" href="#">
<span class="material-symbols-outlined text-[20px]">stylus_note</span>
<span class="">Open Writing Studio</span>
</a>
<a class="inline-flex items-center justify-center gap-space-xs text-secondary-fixed hover:text-surface-bright font-label-data text-label-data py-2 transition-colors" href="#">
<span class="material-symbols-outlined text-[16px]">analytics</span>
<span class="">View Author Retention Analytics</span>
</a>
</div>
</div>
</div>
</section>
<!-- Interactive Script for Micro-Interactions -->
<script>
    document.addEventListener('DOMContentLoaded', () => {
      // Smooth scroll for page anchors
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
          e.preventDefault();
          const target = document.querySelector(this.getAttribute('href'));
          if (target) {
            target.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });
    });
  </script>
</div></main><div class="fixed bottom-space-lg left-1/2 -translate-x-1/2 z-40"><div class="flex items-center gap-space-md bg-inverse-surface text-inverse-on-surface px-space-lg py-space-sm rounded-full shadow-[0_12px_32px_-4px_rgba(8,9,9,0.28)]"><button class="flex items-center gap-space-xs text-inverse-on-surface hover:text-secondary-fixed transition-colors font-label-data text-label-data" type="button"><span class="material-symbols-outlined text-[18px]">bookmarks</span><span class="hidden sm:inline">Bookmarks</span></button><div class="w-px h-4 bg-outline/40"></div><button class="flex items-center gap-space-xs text-inverse-on-surface hover:text-secondary-fixed transition-colors font-label-data text-label-data" type="button"><span class="material-symbols-outlined text-[18px]">dark_mode</span><span class="hidden sm:inline">Night Mode</span></button><div class="w-px h-4 bg-outline/40"></div><button class="flex items-center gap-space-xs text-inverse-on-surface hover:text-secondary-fixed transition-colors font-label-data text-label-data" type="button"><span class="material-symbols-outlined text-[18px]">queue_music</span><span class="hidden sm:inline">Reading Queue</span></button></div></div><footer class="w-full bg-surface-container-low py-space-xl"><div class="max-w-[1280px] mx-auto px-margin flex flex-col md:flex-row items-center justify-between gap-space-md"><div class="flex items-center gap-space-sm"><span class="font-headline-sm text-headline-sm text-on-surface">SAGA</span><span class="font-body-ui text-body-ui text-on-surface-variant">— Serialized literature &amp; authorial atelier.</span></div><div class="flex items-center gap-space-lg font-label-ui text-label-ui text-on-surface-variant"><a class="hover:text-on-surface transition-colors" href="#">Editorial Standards</a><a class="hover:text-on-surface transition-colors" href="#">Authors Guild</a><a class="hover:text-on-surface transition-colors" href="#">Privacy &amp; Terms</a></div><div class="font-label-caps-dense text-label-caps-dense text-outline">© 2025 SAGA PUBLISHING INC.</div></div></footer>

</body></html>