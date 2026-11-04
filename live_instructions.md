Home route ko aur zyada super-fast banane ke liye hum 5 specific areas me optimize kar sakte hain:                           
  ──────                                                                                                                       
  ### 1. Server Loader Lean-Splitting (Public vs Logged-In) — [TTFB Speedup]                                                   
                                                                                                                               
  • Current Issue: Jab koi unauthenticated guest ya Google crawler Home route (/) open karta hai, toh loader server par        
  Trending aur Bingeable queries bhi parallel me chalata hai. Lekin PublicHome in dono ko use hi nahi karta (wo sirf Top Shelf 
  dikhata hai).                                                                                                                
  • Optimization: Loader me condition laga dein:                                                                               
      • Agar user Public / Guest hai: Server sirf TopShelf (1 lean query jo pehle se RAM cached hai) fetch kare.               
      • Agar user Logged-In hai: Tabhi Trending, Bingeable, aur New Voices fetch ho.                                           
  • Fayda: Public visitors aur SEO crawlers ke liye Home page ka Server TTFB (Time to First Byte) 50–60% fast ho jayega.       
  ──────                                                                                                                       
  ### 2. Hero Image Preload in <head> — [LCP (Largest Contentful Paint) Speedup]                                               
                                                                                                                               
  • Current Issue: Public Home par sabse bada visual element Hero background photograph (Cloudinary) hai. Abhi browser is image
  ko tab download karna shuru karta hai jab React components mount ho jate hain.                                               
  • Optimization: src/routes/index.tsx ke head() me Hero image ka responsive preload tag add karein:                           
    {                                                                                                                          
      rel: 'preload',                                                                                                          
      as: 'image',                                                                                                             
      href: heroSrc,                                                                                                           
      imageSrcSet: heroSrcSet,                                                                                                 
      imageSizes: '(min-width: 1024px) 58vw, 100vw',                                                                           
      fetchPriority: 'high',                                                                                                   
    }                                                                                                                          
                                                                                                                               
  • Fayda: Browser HTML parse karte waqt hi hero image download karna shuru kar dega. Isse LCP 300ms–600ms tezi se load hoga.  
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