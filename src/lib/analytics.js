/**
 * Analytics Event Tracking
 * 
 * This module provides high-level functions for tracking custom events
 * throughout the Wuzzle Games application.
 * 
 * All events are pushed to GTM's dataLayer for centralized analytics management.
 */

import { pushToDataLayer } from './gtm';

// Debounce helper to prevent duplicate events
const eventDebounce = new Map();

/**
 * Debounced event tracking to prevent duplicate fires
 * @param {string} eventName - The event name
 * @param {Object} eventParams - Event parameters
 * @param {number} debounceMs - Debounce time in milliseconds
 */
function trackEventDebounced(eventName, eventParams, debounceMs = 1000) {
  const eventKey = `${eventName}_${JSON.stringify(eventParams)}`;
  
  // Check if this exact event was recently fired
  if (eventDebounce.has(eventKey)) {
    console.log('[Analytics] Event debounced:', eventName);
    return;
  }

  // Track the event
  pushToDataLayer(eventName, eventParams);

  // Set debounce timer
  eventDebounce.set(eventKey, true);
  setTimeout(() => {
    eventDebounce.delete(eventKey);
  }, debounceMs);
}

/**
 * Track when a game is started
 * @param {string} mode - Game mode (e.g., 'daily', 'marathon', 'speedrun', 'multiplayer')
 * @param {string} puzzleType - Type of puzzle (e.g., 'single', 'multi-board')
 * @param {number} boards - Number of boards (optional)
 */
export function trackGameStarted(mode, puzzleType, boards = 1) {
  trackEventDebounced('game_started', {
    mode,
    puzzle_type: puzzleType,
    boards: boards || 1
  });
}

/**
 * Track when a game is completed
 * @param {string} mode - Game mode
 * @param {number} attempts - Number of attempts/guesses used
 * @param {boolean} success - Whether the game was won
 * @param {number} timeSeconds - Time taken in seconds (optional)
 */
export function trackGameCompleted(mode, attempts, success, timeSeconds = null) {
  const params = {
    mode,
    attempts,
    success
  };
  
  if (timeSeconds !== null) {
    params.time_seconds = timeSeconds;
  }

  trackEventDebounced('game_completed', params, 2000);
}

/**
 * Track when a multiplayer game is started
 * @param {string} roomType - Type of room ('public', 'private', 'challenge')
 * @param {number} playerCount - Number of players (optional)
 */
export function trackMultiplayerStarted(roomType, playerCount = null) {
  const params = { room_type: roomType };
  
  if (playerCount !== null) {
    params.player_count = playerCount;
  }

  trackEventDebounced('multiplayer_started', params);
}

/**
 * Track when a user signs up for email notifications
 * @param {string} source - Where the signup occurred (e.g., 'modal', 'profile', 'game_end')
 */
export function trackEmailSignup(source) {
  trackEventDebounced('email_signup', {
    source
  }, 5000); // Longer debounce for signup events
}

/**
 * Track when a daily puzzle is played
 * @param {string} puzzleDate - The date of the puzzle (YYYY-MM-DD format)
 * @param {number} boards - Number of boards
 */
export function trackDailyPuzzlePlayed(puzzleDate, boards = 1) {
  trackEventDebounced('daily_puzzle_played', {
    puzzle_date: puzzleDate,
    boards
  });
}

/**
 * Track when a user views the leaderboard
 * @param {string} leaderboardType - Type of leaderboard ('global', 'friends', 'mode-specific')
 */
export function trackLeaderboardView(leaderboardType) {
  trackEventDebounced('leaderboard_view', {
    leaderboard_type: leaderboardType
  });
}

/**
 * Track when a user shares their results
 * @param {string} shareMethod - How they shared ('copy', 'twitter', 'facebook', etc.)
 * @param {string} gameMode - The game mode being shared
 */
export function trackShare(shareMethod, gameMode) {
  trackEventDebounced('share', {
    method: shareMethod,
    game_mode: gameMode
  });
}

/**
 * Track when a user creates an account
 * @param {string} method - Authentication method ('google', 'email', etc.)
 */
export function trackSignUp(method) {
  trackEventDebounced('sign_up', {
    method
  }, 5000);
}

/**
 * Track when a user signs in
 * @param {string} method - Authentication method
 */
export function trackSignIn(method) {
  trackEventDebounced('sign_in', {
    method
  }, 5000);
}

/**
 * Track subscription-related events
 * @param {string} action - Action taken ('view_modal', 'start_checkout', 'complete')
 * @param {string} tier - Subscription tier (optional)
 */
export function trackSubscription(action, tier = null) {
  const params = { action };
  
  if (tier) {
    params.tier = tier;
  }

  trackEventDebounced('subscription', params, 2000);
}

/**
 * Track when a user views the FAQ
 */
export function trackFaqView() {
  trackEventDebounced('faq_view', {});
}

/**
 * Track when a user views the How to Play guide
 */
export function trackHowToPlayView() {
  trackEventDebounced('how_to_play_view', {});
}

/**
 * Track errors for debugging
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {string} location - Where the error occurred
 */
export function trackError(errorType, errorMessage, location) {
  pushToDataLayer('error', {
    error_type: errorType,
    error_message: errorMessage,
    location
  });
}
