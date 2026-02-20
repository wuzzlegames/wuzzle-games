import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import './index.css'

// Get base URL from Vite.
// React Router basename should not have trailing slash.
const rawBaseUrl = import.meta.env.BASE_URL || '/';
const baseUrl = rawBaseUrl === '/' ? '' : (rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl);

// Handle 404 redirects from GitHub Pages
// When 404.html redirects to index.html, it stores the original path in sessionStorage
// We need to restore the URL before React Router initializes so it routes correctly
if (typeof window !== 'undefined') {
  const redirectPath = sessionStorage.getItem('_404_redirect')?.trim();
  if (redirectPath) {
    sessionStorage.removeItem('_404_redirect');
    // Update the URL to the original path before React Router initializes
    // This ensures BrowserRouter sees the correct path when it mounts
    // Ensure redirectPath starts with / to avoid double slashes
    const normalizedPath = redirectPath.startsWith('/') ? redirectPath : '/' + redirectPath;
    window.history.replaceState(null, '', baseUrl + normalizedPath);
  }
  
  // Normalize URL to handle both with/without trailing slash for root path
  // Vite dev server expects /wuzzle-games/ but React Router might create /wuzzle-games
  const currentPath = window.location.pathname;
  const isRootPath = currentPath === baseUrl || currentPath === baseUrl + '/';
  if (isRootPath) {
    // Always use trailing slash for root to match Vite's expected base URL
    window.history.replaceState(null, '', baseUrl + '/');
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter
        basename={baseUrl}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)
