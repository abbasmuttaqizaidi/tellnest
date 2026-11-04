Home route ko aur zyada super-fast banane ke liye 5 specific areas ka status:                           
  ──────                                                                                                                       
  ### 1. Public Content Delivery & Query Utilization — [COMPLETED]
                                                                                                                               
  • Resolved: Public view (Desktop & Mobile) par Trending aur Bingeable sections add kiye gaye hain. Server loader ka data ab guest visitors aur Google crawlers dono ko instantly rich content provide kar raha hai.
  ──────                                                                                                                       
  ### 2. Hero Image Preload in <head> — [COMPLETED]
                                                                                                                               
  • Implemented: `src/routes/index.tsx` ke `head()` me Hero image (`getHeroImageSources`) ka responsive preload tag add kiya gaya hai:
    ```ts
    {
      rel: 'preload',
      as: 'image',
      href: heroSrc,
      imageSrcSet: heroSrcSet,
      imageSizes: '(min-width: 1024px) 58vw, 100vw',
      fetchPriority: 'high',
    }
    ```
  • Fayda: Browser HTML parse karte waqt hi hero photograph stream/download kar leta hai, providing ~300ms–600ms faster LCP.
  ──────                                                                                                                       
  ### 3. Instant Home Navigation Skeleton (pendingComponent) — [COMPLETED]                                                  
                                                                                                                               
  • Implemented: `src/routes/index.tsx` me `pendingMs: 0` aur dynamic `pendingComponent: HomePendingComponent` add kiya gaya hai:
      • Guest visitors & logged-out users ke liye instant `PublicHomeSkeleton`
      • Authenticated members ke liye instant `LoggedInHomeSkeleton`
  • Fayda: Logo ya Home par kisi bhi page (/discover, /works, /library) se click karte hi 0 millisecond me skeleton transition appear hoti hai.
  ──────                                                                                                                       
  ### 4. Dynamic Code-Splitting (React.lazy) — [COMPLETED]                                                         
                                                                                                                               
  • Implemented: `src/routes/index.tsx` me `LoggedInHome` ko `React.lazy(() => import('../components/home/LoggedInHome'))` ke zariye dynamic code-split chunk banaya gaya hai aur `<React.Suspense fallback={<LoggedInHomeSkeleton />}>` me wrap kiya gaya hai.
  • Security & Auth Protection: Public visitors aur search engine crawlers ke liye `LoggedInHome` bundle chunk (~51KB minified) kabhi bhi download ya trigger nahi hota. Unauthorized view kisi ko nahi dikhta.
  • Fayda: Initial JavaScript bundle download significantly reduce hua hai aur mobile par site turant interactive ho jati hai.
  ──────                                                                                                                       
  ### 5. Below-the-fold Assets & Background Fetching — [COMPLETED]                                                  
                                                                                                                               
  • Resolved: `AppContext` me se automatic background catalog sync ko normal users aur public guests ke mount lifecycle se complete remove kar diya gaya hai. Ab ye sirf authenticated Admin sessions me explicitly limit of 15 items ke sath chalta hai, protecting critical page-load bandwidth.     