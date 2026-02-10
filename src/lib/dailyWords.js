// Daily word selection utilities

/**
 * Get the current date string in the user's local timezone (YYYY-MM-DD)
 * This resets at midnight in the user's local time
 */
export function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Simple seeded random number generator
 * Based on a simple linear congruential generator (LCG)
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

/**
 * Create a seed from a date string and optional board index
 * Includes numBoards to ensure board 0 in a 1-board game differs from board 0 in a 4-board game
 */
function createSeed(dateString, boardIndex = 0, mode = 'daily', speedrunEnabled = false, marathonIndex = null, numBoards = 1) {
  // Create a more robust hash that ensures different seeds for different parameters
  // Including numBoards ensures that board 0 in different game configurations gets different words
  let hash = 0;
  const combined = `${dateString}-${mode}-${speedrunEnabled}-${boardIndex}-${numBoards}-${marathonIndex || 'none'}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0; // Convert to 32bit signed integer
  }
  // Ensure we get a positive integer and add multipliers to ensure distinct seeds
  return Math.abs(hash) + (boardIndex * 1000000) + (numBoards * 10000) + (marathonIndex || 0) * 100000;
}

/**
 * Select a daily word deterministically based on date and board index
 * @param {string[]} wordList - List of valid words
 * @param {string} dateString - Current date string (YYYY-MM-DD)
 * @param {number} boardIndex - Index of the board (0-based)
 * @param {string} mode - Game mode ('daily' or 'marathon')
 * @param {boolean} speedrunEnabled - Whether speedrun is enabled
 * @param {number} marathonIndex - Marathon level index (for marathon mode)
 * @param {number} numBoards - Total number of boards in the game
 * @returns {string} Selected word
 */
export function selectDailyWord(wordList, dateString, boardIndex = 0, mode = 'daily', speedrunEnabled = false, marathonIndex = null, numBoards = 1) {
  if (!wordList || wordList.length === 0) {
    throw new Error('Word list is empty');
  }
  
  const seed = createSeed(dateString, boardIndex, mode, speedrunEnabled, marathonIndex, numBoards);
  const rng = new SeededRandom(seed);
  const index = Math.floor(rng.next() * wordList.length);
  return wordList[index];
}

/**
 * Select multiple daily words for a game
 * @param {string[]} wordList - List of valid words
 * @param {number} numBoards - Number of boards (words to select)
 * @param {string} mode - Game mode ('daily' or 'marathon')
 * @param {boolean} speedrunEnabled - Whether speedrun is enabled
 * @param {number} marathonIndex - Marathon level index (for marathon mode)
 * @param {number[]} marathonLevels - Array of board counts for each marathon stage (e.g., [1, 2, 3, 4])
 * @returns {string[]} Array of selected words
 */
export function selectDailyWords(wordList, numBoards, mode = 'daily', speedrunEnabled = false, marathonIndex = null, marathonLevels = [1, 2, 3, 4], dateString = null) {
  const targetDateString = dateString || getCurrentDateString();
  const words = [];
  const usedWords = new Set(); // Track used words to avoid duplicates
  
  // For marathon mode, collect all words used in previous stages
  if (mode === 'marathon' && marathonIndex !== null && marathonIndex > 0) {
    // Generate words for all previous stages (0 to marathonIndex - 1)
    for (let prevStageIndex = 0; prevStageIndex < marathonIndex; prevStageIndex++) {
      const prevStageBoards = marathonLevels[prevStageIndex] || 1;
      const prevStageUsedWords = new Set();
      
      // Generate words for this previous stage
      for (let boardIdx = 0; boardIdx < prevStageBoards; boardIdx++) {
        let word;
        let attempts = 0;
        const maxAttempts = wordList.length;
        
        // Generate words for this board in the previous stage
        do {
          word = selectDailyWord(wordList, targetDateString, boardIdx, mode, speedrunEnabled, prevStageIndex, prevStageBoards);
          if (attempts > 0) {
            const seed = createSeed(targetDateString, boardIdx + attempts * 1000, mode, speedrunEnabled, prevStageIndex, prevStageBoards);
            const rng = new SeededRandom(seed);
            const index = Math.floor(rng.next() * wordList.length);
            word = wordList[index];
          }
          attempts++;
        } while (prevStageUsedWords.has(word) && attempts < maxAttempts);
        
        prevStageUsedWords.add(word);
        usedWords.add(word); // Add to global used words set
      }
    }
  }
  
  // Filter word list to exclude words used in previous stages
  const availableWords = usedWords.size > 0 
    ? wordList.filter(word => !usedWords.has(word))
    : wordList;
  
  // If we've used too many words, fall back to full list (shouldn't happen in practice)
  const workingWordList = availableWords.length > 0 ? availableWords : wordList;
  
  for (let i = 0; i < numBoards; i++) {
    let word;
    let attempts = 0;
    const maxAttempts = workingWordList.length; // Safety limit
    
      // Keep trying until we get a unique word
      do {
        // Use the filtered word list, but maintain the same seed logic for determinism
        // We need to map the selection to the filtered list
        const seed = createSeed(targetDateString, i, mode, speedrunEnabled, marathonIndex, numBoards);
        const rng = new SeededRandom(seed);
        const baseIndex = Math.floor(rng.next() * workingWordList.length);
        word = workingWordList[baseIndex];
        
        // If we've tried many times and still getting duplicates, add attempts to seed to vary it
        if (attempts > 0) {
          const seed2 = createSeed(targetDateString, i + attempts * 1000, mode, speedrunEnabled, marathonIndex, numBoards);
          const rng2 = new SeededRandom(seed2);
          const index2 = Math.floor(rng2.next() * workingWordList.length);
          word = workingWordList[index2];
        }
      attempts++;
    } while (usedWords.has(word) && attempts < maxAttempts);
    
    usedWords.add(word);
    words.push(word);
  }
  
  return words;
}
