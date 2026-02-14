import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(() => {
  const disablePwa = process.env.VITE_PWA_DISABLE === 'true'

  return {
  base: '/dcda-advising-wizard/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: disablePwa,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png'],
      manifest: false, // Use our manual manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': [
            '@radix-ui/react-checkbox', 
            '@radix-ui/react-dialog', 
            '@radix-ui/react-radio-group', 
            '@radix-ui/react-select', 
            '@radix-ui/react-slot', 
            'lucide-react', 
            'class-variance-authority', 
            'clsx', 
            'tailwind-merge'
          ],
          'vendor-pdf': ['jspdf'],
        }
      }
    }
  }
  }
})
