/**
 * Google Tag Manager (GTM) Integration
 * 
 * This module handles GTM initialization and provides utilities for tracking events.
 * All analytics should go through GTM's dataLayer, not direct gtag calls.
 */

/**
 * Initialize Google Tag Manager
 * Should be called once when the app loads.
 * GTM script and gtm.start are loaded/pushed only from index.html in production.
 * Here we only ensure dataLayer exists so app code can push events safely.
 */
export function initGTM() {
  const gtmId = import.meta.env.VITE_GTM_ID;
  const appEnv = import.meta.env.VITE_APP_ENV;

  // Ensure dataLayer exists (index.html creates it in production; app may push events before/without it)
  window.dataLayer = window.dataLayer || [];

  if (appEnv !== 'production' || !gtmId || gtmId === 'GTM-XXXXXXX') {
    console.log('[GTM] Analytics disabled in development or GTM ID not configured');
    return false;
  }

  // index.html is the single source that loads the GTM script and pushes gtm.start/gtm.js
  console.log('[GTM] dataLayer ready (container loaded from index.html)');
  return true;
}

/**
 * Check if GTM is enabled and ready
 */
export function isGTMEnabled() {
  const gtmId = import.meta.env.VITE_GTM_ID;
  const appEnv = import.meta.env.VITE_APP_ENV;
  
  return (
    appEnv === 'production' &&
    gtmId &&
    gtmId !== 'GTM-XXXXXXX' &&
    typeof window !== 'undefined' &&
    window.dataLayer
  );
}

/**
 * Push an event to the dataLayer
 * @param {string} eventName - The name of the event
 * @param {Object} eventParams - Additional parameters for the event
 */
export function pushToDataLayer(eventName, eventParams = {}) {
  if (!isGTMEnabled()) {
    console.log('[GTM] Event not tracked (disabled):', eventName, eventParams);
    return;
  }

  try {
    window.dataLayer.push({
      event: eventName,
      ...eventParams
    });
    console.log('[GTM] Event tracked:', eventName, eventParams);
  } catch (error) {
    console.error('[GTM] Error pushing to dataLayer:', error);
  }
}

/**
 * Track a page view
 * @param {string} path - The page path
 * @param {string} title - The page title
 */
export function trackPageView(path, title) {
  pushToDataLayer('page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href
  });
}
