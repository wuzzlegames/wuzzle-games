// Word filtering utilities for Solution Hunt mode
import { WORD_LENGTH } from './wordle';

/**
 * Filter words based on clues from guesses.
 * 
 * @param {string[]} wordList - List of possible solution words (uppercase)
 * @param {Array<{word: string, colors: string[]}>} guesses - Array of guesses with their color results
 * @returns {string[]} Filtered list of words that match all clues
 */
export function filterWordsByClues(wordList, guesses) {
  if (!wordList || wordList.length === 0) return [];
  if (!guesses || guesses.length === 0) return wordList;

  // Build constraints from all guesses
  const constraints = buildConstraints(guesses);

  return wordList.filter((word) => wordMatchesConstraints(word, constraints));
}

/**
 * Build constraints object from guesses.
 * Handles duplicate letter edge cases correctly.
 * 
 * @param {Array<{word: string, colors: string[]}>} guesses
 * @returns {Object} Constraints object
 */
function buildConstraints(guesses) {
  // greenPositions[i] = letter that MUST be at position i (or null)
  const greenPositions = Array(WORD_LENGTH).fill(null);
  
  // yellowPositions[i] = Set of letters that must NOT be at position i (but must exist elsewhere)
  const yellowPositions = Array(WORD_LENGTH).fill(null).map(() => new Set());
  
  // mustContain = Map of letter -> minimum count required
  const mustContain = new Map();
  
  // cannotContain = Set of letters that cannot appear at all
  // (only if grey and never green/yellow in same guess)
  const cannotContain = new Set();
  
  // maxCounts = Map of letter -> maximum count allowed
  // (determined when a letter is grey but also green/yellow in same word)
  const maxCounts = new Map();

  for (const guess of guesses) {
    if (!guess || typeof guess.word !== 'string' || !Array.isArray(guess.colors)) {
      continue;
    }

    const word = guess.word.toUpperCase();
    const colors = guess.colors;

    // Count occurrences of each letter by color in this guess
    const letterColorCounts = new Map(); // letter -> { green: n, yellow: n, grey: n }
    
    for (let i = 0; i < WORD_LENGTH && i < word.length && i < colors.length; i++) {
      const letter = word[i];
      const color = colors[i];
      
      if (!letterColorCounts.has(letter)) {
        letterColorCounts.set(letter, { green: 0, yellow: 0, grey: 0 });
      }
      
      const counts = letterColorCounts.get(letter);
      if (color === 'green') {
        counts.green++;
        greenPositions[i] = letter;
      } else if (color === 'yellow') {
        counts.yellow++;
        yellowPositions[i].add(letter);
      } else if (color === 'grey') {
        counts.grey++;
      }
    }

    // Process each letter's constraints from this guess
    for (const [letter, counts] of letterColorCounts) {
      const confirmedCount = counts.green + counts.yellow;
      
      if (confirmedCount > 0) {
        // Letter must appear at least this many times
        const currentMin = mustContain.get(letter) || 0;
        mustContain.set(letter, Math.max(currentMin, confirmedCount));
        
        // If there's also a grey, we know the exact count
        if (counts.grey > 0) {
          const exactCount = confirmedCount;
          const currentMax = maxCounts.get(letter);
          if (currentMax === undefined || exactCount < currentMax) {
            maxCounts.set(letter, exactCount);
          }
        }
        
        // Remove from cannotContain if it was added
        cannotContain.delete(letter);
      } else if (counts.grey > 0) {
        // Letter is only grey - cannot appear at all (unless overridden by another guess)
        if (!mustContain.has(letter)) {
          cannotContain.add(letter);
        }
      }
    }
  }

  return {
    greenPositions,
    yellowPositions,
    mustContain,
    cannotContain,
    maxCounts,
  };
}

/**
 * Check if a word matches all constraints.
 * 
 * @param {string} word - Word to check (uppercase)
 * @param {Object} constraints - Constraints from buildConstraints
 * @returns {boolean} True if word matches all constraints
 */
function wordMatchesConstraints(word, constraints) {
  const { greenPositions, yellowPositions, mustContain, cannotContain, maxCounts } = constraints;

  // Count letters in the word
  const letterCounts = new Map();
  for (const letter of word) {
    letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
  }

  // Check green positions - exact matches required
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (greenPositions[i] !== null && word[i] !== greenPositions[i]) {
      return false;
    }
  }

  // Check yellow positions - letter must NOT be at these positions
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (yellowPositions[i].has(word[i])) {
      return false;
    }
  }

  // Check mustContain - letter must appear at least N times
  for (const [letter, minCount] of mustContain) {
    const actualCount = letterCounts.get(letter) || 0;
    if (actualCount < minCount) {
      return false;
    }
  }

  // Check cannotContain - letter must not appear at all
  for (const letter of cannotContain) {
    if (letterCounts.has(letter) && letterCounts.get(letter) > 0) {
      return false;
    }
  }

  // Check maxCounts - letter must not exceed maximum
  for (const [letter, maxCount] of maxCounts) {
    const actualCount = letterCounts.get(letter) || 0;
    if (actualCount > maxCount) {
      return false;
    }
  }

  return true;
}

/**
 * Get the count of remaining possible words.
 * 
 * @param {string[]} wordList - List of possible solution words
 * @param {Array<{word: string, colors: string[]}>} guesses - Array of guesses with colors
 * @returns {number} Count of remaining possible words
 */
export function countRemainingWords(wordList, guesses) {
  return filterWordsByClues(wordList, guesses).length;
}
