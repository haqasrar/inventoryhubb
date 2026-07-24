import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new deploy replaces the cached app on the next open, so the shop never
      // has to reinstall anything to get a fix.
      registerType: 'autoUpdate',
      // We register the service worker ourselves in main.jsx so we can also check
      // for updates while the app is open — not just once at page load.
      injectRegister: false,
      // logo.png and signature.png are the first shop's own artwork, still pointed at
      // by its shop document; the app-* files are InventoryHub's own branding.
      includeAssets: [
        'apple-touch-icon.png',
        'app-logo.png',
        'app-mark.png',
        'logo.png',
        'logo-mark.png',
        'signature.png',
      ],
      manifest: {
        // Named for the app, not for any one shop: the same installation now serves
        // every shop that signs up, and each one sets its own name inside the app.
        name: 'InventoryHub — Stock & Billing',
        short_name: 'InventoryHub',
        description: 'Stock, sales and billing for your shop.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1f5f9',
        theme_color: '#4f46e5',
        lang: 'en-IN',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Any route falls back to the app shell, matching the Netlify redirect.
        navigateFallback: '/index.html',
        // Firestore and Auth must always hit the network — a cached reply could
        // show stale stock or a stale login. Firestore has its own offline layer.
        navigateFallbackDenylist: [/^\/__/, /firestore\.googleapis\.com/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' ||
              url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // The Firebase SDK is large; keep it precacheable.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
