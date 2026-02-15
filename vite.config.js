import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vitePrerenderPlugin } from 'vite-prerender-plugin'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Pre-render key routes into real HTML files so Google sees 200 + content.
    // This does NOT change runtime routing for users.
    vitePrerenderPlugin({
      renderTarget: '#root',
      additionalPrerenderRoutes: [
        '/',
        '/game',
        '/leaderboard',
        '/faq',
        '/profile',
        '/how-to-play',
        '/notifications',
        '/stats',
        // Long-tail SEO landing pages (match current features; multiplayer landing)
        '/multiplayer-wuzzle',
        '/multi-board-wuzzle',
        '/wuzzle-speedrun',
        '/wuzzle-marathon'
      ],
    }),
  ],
  base: '/better-wordle/',
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    // Increase the limit at which Vite shows "chunk too large" warnings (in kB).
    // This only affects warnings, not the actual bundle or runtime behavior.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress warning about Firebase database being both dynamically and statically imported.
        // This is intentional: dynamic imports in singlePlayerStore.js enable code splitting
        // (only load Firebase for signed-in users), while static imports elsewhere are needed
        // for components that always require Firebase.
        if (
          warning.message && 
          warning.message.includes('dynamically imported') && 
          warning.message.includes('firebase/database')
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        // Put large libraries into a separate "vendor" chunk so that your app code
        // and third‑party code are split. This does not change your React code;
        // it only affects how the final JS files are grouped.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        },
        assetFileNames: (assetInfo) => {
          return assetInfo.name || 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
})
