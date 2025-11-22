import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SnapifY - Event Sharing',
        short_name: 'SnapifY',
        description: 'Seamlessly capture, share, and manage event memories.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 1. Precache standard assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        // 2. Runtime Caching Strategies
        runtimeCaching: [
          {
            // Cache Media (Images/Videos) - Offline Gallery Support
            urlPattern: ({ url }) => url.pathname.includes('/api/proxy-media') || url.pathname.includes('/api/media'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'snapify-media-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache API Data - Offline Dashboard Support
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst', // Try network, fall back to cache if offline
            options: {
              cacheName: 'snapify-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 Day
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              // Basic background sync attempt for failed POST requests (Uploads)
              backgroundSync: {
                name: 'snapify-upload-queue',
                options: {
                  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
                }
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
        output: {
            manualChunks: {
                vendor: ['react', 'react-dom', 'socket.io-client', 'lucide-react', 'recharts']
            }
        }
    }
  },
  define: {
    'process.env': {} 
  }
});