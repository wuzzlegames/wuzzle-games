/**
 * Google Tag Manager (GTM) Integration
 * 
 * This module handles GTM initialization and provides utilities for tracking events.
 * All analytics should go through GTM's dataLayer, not direct gtag calls.
 */

/**
 * Initialize Google Tag Manager
 * Should be called once when the app loads
 */
export function initGTM() {
  const gtmId = import.meta.env.VITE_GTM_ID;
  const appEnv = import.meta.env.VITE_APP_ENV;
  
  // Only initialize in production or if explicitly enabled
  if (appEnv !== 'production' || !gtmId || gtmId === 'GTM-XXXXXXX') {
    console.log('[GTM] Analytics disabled in development or GTM ID not configured');
    return false;
  }

  // Check if GTM is already initialized
  if (window.dataLayer && window.google_tag_manager) {
    console.log('[GTM] Already initialized');
    return true;
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // GTM initialization
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  });

  console.log('[GTM] Initialized with ID:', gtmId);
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
