import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { vitePrerenderPlugin } from 'vite-prerender-plugin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      vitePrerenderPlugin({
        routes: [
          '/',
          '/game',
          '/leaderboard',
          '/profile',
          '/faq',
          '/how-to-play',
          '/stats',
          '/multiplayer-wuzzle',
          '/multi-board-wuzzle',
          '/wuzzle-speedrun',
          '/wuzzle-marathon',
        ],
        postProcess(renderedRoute) {
          // Replace environment variable placeholders in HTML
          // This ensures GTM ID is properly injected during build
          renderedRoute.html = renderedRoute.html
            .replace(/%VITE_GTM_ID%/g, env.VITE_GTM_ID || 'GTM-XXXXXXX')
            .replace(/%VITE_APP_ENV%/g, env.VITE_APP_ENV || 'development');
          return renderedRoute;
        },
      }),
    ],
    base: '/',
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  };
});
