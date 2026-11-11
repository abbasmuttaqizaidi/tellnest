import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ['@tanstack/react-start'],
    include: [
      '@clerk/tanstack-react-start',
      '@clerk/react',
      '@clerk/react/internal',
      '@clerk/shared/error',
      '@clerk/shared/getEnvVariable',
      '@clerk/shared/getToken',
      '@clerk/shared/htmlSafeJson',
      '@clerk/shared/underscore',
      'lucide-react',
      'framer-motion',
      'motion/react',
      '@supabase/supabase-js',
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro({
      preset: 'vercel',
      routeRules: {
        '/': {
          headers: {
            'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        },
        '/works/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
          },
        },
        '/discover': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/author/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/browse/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/genre/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/category/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/tag/**': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
          },
        },
        '/writing-contests': {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=120, stale-while-revalidate=86400',
          },
        },
      },
      handlers: [
        {
          route: '/sitemap.xml',
          handler: './src/server/sitemap-handler.ts',
        },
        {
          route: '/rss.xml',
          handler: './src/server/rss-handler.ts',
        },
        {
          route: '/feed.xml',
          handler: './src/server/rss-handler.ts',
        },
        {
          route: '/rss/:workId',
          handler: './src/server/story-rss-handler.ts',
        },
        {
          route: '/api/cron/trending-weekly',
          handler: './src/server/cron-trending-handler.ts',
        },
        {
          route: '/api/tts',
          handler: './src/server/tts-handler.ts',
        },
        {
          route: '/api/og',
          handler: './src/server/og-handler.ts',
        },
        {
          route: '/api/indexing/ping',
          handler: './src/server/indexing-handler.ts',
        },
      ],
      errorHandler: './src/error.ts',
      vercel: {
        entryFormat: 'node',
      },
    }),
    viteReact(),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@clerk')) {
            return 'vendor-clerk'
          }
          if (id.includes('node_modules/motion')) {
            return 'vendor-motion'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
        },
      },
    },
  },
})

export default config
