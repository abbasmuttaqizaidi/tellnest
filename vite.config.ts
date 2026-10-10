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
