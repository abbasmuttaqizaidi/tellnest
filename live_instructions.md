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
  ### 3. Instant Home Navigation Skeleton (pendingComponent) — [0ms Feedback]                                                  
                                                                                                                               
  • Current Issue: User jab kisi doosre page (jaise /discover, /works/..., /library) se Logo ya "Home" button par click karta  
  hai, toh Home route me koi pendingComponent na hone ki wajah se transition tab tak nahi dikhti jab tak loader khatam na ho.  
  • Optimization: createFileRoute('/') me pendingMs: 0 aur pendingComponent add karein:                                        
      • Guest ke liye PublicHomeSkeleton                                                                                       
      • Logged-in ke liye LoggedInHomeSkeleton                                                                                 
  • Fayda: Logo ya Home par click karte hi 0 millisecond me transition hogi.                                                   
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