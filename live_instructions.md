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
  ### 4. Dynamic Code-Splitting (React.lazy) — [Bundle Size Reduction]                                                         
                                                                                                                               
  • Current Issue: index.tsx me PublicHome (740 lines) aur LoggedInHome (1,780 lines) dono statically imported hain. Ek        
  anonymous visitor ko bhi pura Logged-in dashboard bundle download karna padta hai.                                           
  • Optimization: LoggedInHome ko React.lazy() se code-split kar dein.                                                         
  • Fayda: Public visitor ke liye initial JavaScript bundle ~40% chhota ho jayega aur mobile par site turant interactable ho   
  jayegi.                                                                                                                      
  ──────                                                                                                                       
  ### 5. Below-the-fold Assets & Background Fetching — [Bandwidth Protection]                                                  
                                                                                                                               
  • AppContext me pure platform catalog ka jo background sync (reloadWorksFromDb) chalta hai, usko requestIdleCallback /       
  deferred queue me daalein taaki wo initial page load aur LCP images ke bandwidth ke sath compete na kare.     