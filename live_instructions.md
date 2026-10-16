<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>HatchPen Onboarding - 05/05</title>
<!-- Tailwind CSS CDN with forms and container-queries -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Tailwind Configuration for Custom Colors & Fonts -->
<script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'terracotta': '#D35427',
            'terracotta-hover': '#BE481E',
            'warm-cream': '#F5F2EC',
            'warm-muted': '#BDB6AC',
            'phone-bg': '#07090C'
          },
          fontFamily: {
            serif: ['"Playfair Display"', 'Georgia', 'serif'],
            sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif']
          }
        }
      }
    }
  </script>
<!-- Google Fonts for Editorial Serif -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&amp;family=Plus+Jakarta+Sans:wght@300;400;500;600&amp;display=swap" rel="stylesheet"/>
<style data-purpose="base-layout">
    body {
      background-color: #1a1c1e;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      padding: 32px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    /* Seamless gradient overlay to fade artwork naturally to deep charcoal */
    .art-gradient-overlay {
      background: linear-gradient(
        180deg,
        rgba(7, 9, 12, 0.2) 0%,
        rgba(7, 9, 12, 0.0) 25%,
        rgba(7, 9, 12, 0.45) 45%,
        rgba(7, 9, 12, 0.92) 58%,
        #07090C 72%,
        #07090C 100%
      );
    }
  </style>
</head>
<body class="bg-neutral-900 flex items-center justify-center min-h-screen p-4 sm:p-8" style="background-color: #ece7df;">
<!-- Clean, Frameless Mobile Artboard (No Phone Bezel, No Notch, Pure Screen Canvas) -->
<div class="relative w-full max-w-[400px] h-[844px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col bg-[#07090C] select-none" data-purpose="artboard-canvas" style="background-color: #f8f6f0; box-shadow: 0 25px 60px -15px rgba(50, 40, 30, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04);">
<!-- BEGIN: ArtworkBackground -->
<div class="absolute inset-0 z-0 pointer-events-none" data-purpose="background-artwork-wrapper">
<img alt="Luminous warm stone archway with ascending mossy steps, floating origami paper cranes and golden morning light" class="w-full h-[62%] object-cover object-top" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlpng-KXV8GmEMYKEe4TXw-e0UzzSLEQxmt1c69PqnD7KXiJCyuYK2TksE0HoF8S98Fz-jo2DZRQ354TOeqTyE9bKxy2FQkpP3L8IvGBSS04a5HHMqdBdDvZ6J9e9futwfz5RPzkjaQMMBmnwQQve2AxkI3uub9TO19Wqg2sAqns-THw7wvzcuoWomtMEBhGNNPtwB8JRRiYg5Z47rBBLbfK5mBYj1nxaP-i1O5ih_1ss5T7YikHMiMw"/>
<!-- Atmospheric shadow & gradient overlays -->
<div class="absolute inset-0 art-gradient-overlay" style="background: linear-gradient(180deg, rgba(248, 246, 240, 0) 0%, rgba(248, 246, 240, 0.05) 30%, rgba(248, 246, 240, 0.6) 48%, rgba(248, 246, 240, 0.95) 60%, #f8f6f0 70%, #f8f6f0 100%);"></div>
</div>
<!-- END: ArtworkBackground -->
<!-- BEGIN: NavigationHeader -->
<nav class="relative z-20 flex justify-between items-start px-6 pt-7 pb-4" data-purpose="screen-navigation"><!-- Back Arrow Button with subtle frosted backdrop -->
<button aria-label="Go back" class="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 focus:outline-none" style="background: rgba(248, 246, 240, 0.78); backdrop-filter: blur(10px); color: #1a1d1a; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid rgba(255, 255, 255, 0.6);" type="button">
<svg class="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewbox="0 0 24 24">
<path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
</button>
<!-- Slide Counter: "05 / 05" in subtle frosted backdrop -->
<div class="flex flex-col items-center px-3 py-2 rounded-full" data-purpose="slide-counter" style="background: rgba(248, 246, 240, 0.78); backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid rgba(255, 255, 255, 0.6);">
<span class="text-[12px] font-semibold tracking-widest leading-none font-sans" style="color: #1a1d1a;">05</span>
<div class="w-3 h-[1px] my-1" style="background-color: rgba(26, 29, 26, 0.25);"></div>
<span class="text-[12px] font-semibold tracking-widest leading-none font-sans" style="color: #6e7269;">05</span>
<!-- Step Dot Indicators -->
<div aria-hidden="true" class="flex flex-col items-center space-y-1 mt-2">
<span class="w-1.5 h-1.5 rounded-full" style="background-color: #d35427;"></span>
<span class="w-1 h-1 rounded-full" style="background-color: rgba(26, 29, 26, 0.2);"></span>
</div>
</div></nav>
<!-- END: NavigationHeader -->
<!-- BEGIN: MainContent -->
<section class="relative z-20 flex-1 flex flex-col justify-end px-7 pb-10" data-purpose="copy-and-actions">
<!-- Headline & Subtitle Container -->
<div class="mb-8" data-purpose="editorial-text"><!-- Main Headline -->
<h1 class="font-serif text-[44px] leading-[1.08] tracking-tight font-normal" style="color: #1a1d1a;">
  Have a<br/>
<span class="italic font-serif" style="color: #d35427;">story</span> to tell?
</h1>
<!-- Subheading Paragraph -->
<p class="mt-4 text-[16.5px] leading-relaxed font-normal tracking-normal max-w-[320px]" style="color: #3d453b;">
  Whether you're here to read or to write, there's a place for you at HatchPen.
</p></div>
<!-- BEGIN: ActionButtons -->
<div class="flex flex-col space-y-3.5" data-purpose="onboarding-ctas"><!-- Primary Action Button -->
<button class="w-full h-[58px] active:scale-[0.99] transition-all rounded-full flex items-center justify-center text-white font-medium text-[16.5px] focus:outline-none group" data-purpose="primary-account-create" style="background-color: #d35427; box-shadow: 0 8px 24px rgba(211, 84, 39, 0.32);" type="button">
<span class="mr-2 tracking-normal">Create your account</span>
<!-- Right Arrow Icon -->
<svg class="w-5 h-5 transition-transform group-hover:translate-x-0.5 stroke-[2]" fill="none" stroke="currentColor" viewbox="0 0 24 24">
<path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>
</button>
<!-- Secondary Action Button -->
<button class="w-full h-[58px] rounded-full active:scale-[0.99] transition-all flex items-center justify-center text-[16px] font-medium focus:outline-none" data-purpose="secondary-learn-more" style="background-color: #f0ece2; border: 1px solid #dfd9cb; color: #2d332a;" type="button">
  Learn more
</button></div>
<!-- END: ActionButtons -->
</section>
<!-- END: MainContent -->
</div>
</body></html>