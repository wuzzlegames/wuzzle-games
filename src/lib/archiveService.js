import { ref, get, set, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { logError } from './errorUtils';
import { getCurrentDateString } from './dailyWords';

/**
 * Archive service for storing and retrieving past game solutions and states
 * Archives are maintained for 14 days and are premium-only content.
 * Archive entries are created when a user completes a game (saveArchiveSolution on win),
 * or on first load for a date when the game seeds on demand (compute + saveArchiveSolution).
 */

const ARCHIVE_DAYS = 14;

/**
 * Get archive key for a mode/variant
 * @param {string} mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} speedrunEnabled - Whether speedrun is enabled
 * @returns {string} Archive key (e.g., 'daily_standard', 'marathon_speedrun', 'solutionhunt_speedrun')
 */
function getArchiveKey(mode, speedrunEnabled) {
  const modeKey = mode === 'daily' ? 'daily' : mode === 'marathon' ? 'marathon' : 'solutionhunt';
  const variantKey = speedrunEnabled ? 'speedrun' : 'standard';
  return `${modeKey}_${variantKey}`;
}

/**
 * Save solution words to archive for a specific date
 * This should be called when a game is completed (for streak-tracked modes)
 * @param {Object} params
 * @param {string} params.mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {string} params.dateString - Date string (YYYY-MM-DD)
 * @param {string[]} params.solutions - Array of solution words
 * @param {number} params.numBoards - Number of boards (for daily, should be 1)
 */
export async function saveArchiveSolution({ mode, speedrunEnabled, dateString, solutions, numBoards }) {
  try {
    // Only save for streak-tracked modes: daily 1-board, marathon (any), solutionhunt (any)
    const shouldSave = (mode === 'daily' && numBoards === 1) || mode === 'marathon' || mode === 'solutionhunt';
    if (!shouldSave) return;

    const archiveKey = getArchiveKey(mode, speedrunEnabled);
    const archiveRef = ref(database, `archive/${archiveKey}/${dateString}`);
    
    await set(archiveRef, {
      solutions: solutions,
      numBoards: numBoards,
      savedAt: Date.now(),
    });
  } catch (err) {
    // Check if it's a permission error
    if (err?.code === 'permission-denied' || err?.message?.includes('Permission denied')) {
      logError(err, 'archiveService.saveArchiveSolution - Permission denied. User may not be authenticated.');
    } else {
      logError(err, 'archiveService.saveArchiveSolution');
    }
  }
}

/**
 * Load solution words from archive for a specific date
 * @param {Object} params
 * @param {string} params.mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {string} params.dateString - Date string (YYYY-MM-DD)
 * @returns {Promise<string[] | null>} Array of solution words or null if not found
 */
export async function loadArchiveSolution({ mode, speedrunEnabled, dateString }) {
  try {
    const archiveKey = getArchiveKey(mode, speedrunEnabled);
    const archiveRef = ref(database, `archive/${archiveKey}/${dateString}`);
    const snap = await get(archiveRef);
    
    if (snap.exists()) {
      const data = snap.val();
      return data?.solutions || null;
    }
    return null;
  } catch (err) {
    // Check if it's a permission error
    if (err?.code === 'permission-denied' || err?.message?.includes('Permission denied')) {
      logError(err, 'archiveService.loadArchiveSolution - Permission denied. User may not be authenticated.');
    } else {
      logError(err, 'archiveService.loadArchiveSolution');
    }
    return null;
  }
}

/**
 * Save archive game state for a user
 * This stores the game progress so users can continue playing archived games
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {string} params.dateString - Date string (YYYY-MM-DD)
 * @param {Object} params.gameState - Game state object (boards, currentGuess, etc.)
 */
export async function saveArchiveGameState({ uid, mode, speedrunEnabled, dateString, gameState }) {
  if (!uid) return;
  
  try {
    const archiveKey = getArchiveKey(mode, speedrunEnabled);
    const gameStateRef = ref(database, `users/${uid}/archiveGames/${archiveKey}/${dateString}`);
    
    await set(gameStateRef, {
      ...gameState,
      updatedAt: Date.now(),
    });
  } catch (err) {
    logError(err, 'archiveService.saveArchiveGameState');
  }
}

/**
 * Load archive game state for a user
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {string} params.dateString - Date string (YYYY-MM-DD)
 * @returns {Promise<Object | null>} Game state or null if not found
 */
export async function loadArchiveGameState({ uid, mode, speedrunEnabled, dateString }) {
  if (!uid) return null;
  
  try {
    const archiveKey = getArchiveKey(mode, speedrunEnabled);
    const gameStateRef = ref(database, `users/${uid}/archiveGames/${archiveKey}/${dateString}`);
    const snap = await get(gameStateRef);
    
    if (snap.exists()) {
      return snap.val();
    }
    return null;
  } catch (err) {
    logError(err, 'archiveService.loadArchiveGameState');
    return null;
  }
}

/**
 * Get list of dates for archive (14 days before current date)
 * @returns {string[]} Array of date strings (YYYY-MM-DD) in reverse chronological order
 */
export function getArchiveDates() {
  const dates = [];
  const today = new Date();
  
  for (let i = 1; i <= ARCHIVE_DAYS; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  
  return dates; // Most recent first (yesterday, day before, etc.)
}

/**
 * Format date string for display
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date (e.g., "Jan 25, 2026")
 */
export function formatArchiveDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  if (Number.isNaN(date.getTime())) {
    return dateString && typeof dateString === 'string' ? dateString : 'Invalid date';
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

/**
 * Check if a date is within the archive window (14 days)
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean} True if date is within archive window
 */
export function isDateInArchiveWindow(dateString) {
  const archiveDates = getArchiveDates();
  return archiveDates.includes(dateString);
}

/**
 * Clean up old archive data (older than 14 days)
 * This can be called periodically to clean up old data
 * @param {Object} params
 * @param {string} params.mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 */
export async function cleanupOldArchive({ mode, speedrunEnabled }) {
  try {
    const archiveKey = getArchiveKey(mode, speedrunEnabled);
    const archiveRef = ref(database, `archive/${archiveKey}`);
    const snap = await get(archiveRef);
    
    if (!snap.exists()) return;
    
    const data = snap.val() || {};
    const archiveDates = getArchiveDates();
    const validDates = new Set(archiveDates);
    
    // Remove dates that are outside the 14-day window
    const deletions = [];
    for (const dateString of Object.keys(data)) {
      if (!validDates.has(dateString)) {
        deletions.push(remove(ref(database, `archive/${archiveKey}/${dateString}`)));
      }
    }
    
    await Promise.all(deletions);
  } catch (err) {
    logError(err, 'archiveService.cleanupOldArchive');
  }
}
