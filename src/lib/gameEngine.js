// Game Engine - Centralized game logic for all modes
// This class encapsulates core game rules and logic that can be shared across modes

import { WORD_LENGTH, scoreGuess as wordleScoreGuess, getMaxTurns as wordleGetMaxTurns } from './wordle';
import { DEFAULT_MAX_TURNS } from './gameConstants';

/**
 * Game Engine class - Centralizes core game logic
 * Provides a single source of truth for game rules, scoring, and validation
 */
export class GameEngine {
  constructor(config = {}) {
    this.wordLength = config.wordLength || WORD_LENGTH;
    this.defaultMaxTurns = config.defaultMaxTurns || DEFAULT_MAX_TURNS;
    this.allowedWords = config.allowedWords || new Set();
  }

  /**
   * Score a guess against a solution
   * @param {string} guess - The guess word
   * @param {string} solution - The solution word
   * @returns {Array<string>} Array of color codes ('green', 'yellow', 'grey')
   */
  scoreGuess(guess, solution) {
    if (typeof guess !== 'string' || typeof solution !== 'string') {
      return Array(this.wordLength).fill('grey');
    }
    
    if (guess.length !== this.wordLength || solution.length !== this.wordLength) {
      return Array(this.wordLength).fill('grey');
    }
    
    // Use the existing wordle scoring logic
    return wordleScoreGuess(guess, solution);
  }

  /**
   * Validate a guess word
   * @param {string} guess - The guess to validate
   * @param {Set<string>} allowedWords - Set of allowed words
   * @returns {Object} Validation result with isValid and error message
   */
  validateGuess(guess, allowedWords = null) {
    const words = allowedWords || this.allowedWords;
    
    if (typeof guess !== 'string') {
      return { isValid: false, error: 'Guess must be a string' };
    }
    
    if (guess.length !== this.wordLength) {
      return { isValid: false, error: `Guess must be exactly ${this.wordLength} letters` };
    }
    
    if (!words || !(words instanceof Set)) {
      return { isValid: false, error: 'Word list not available' };
    }
    
    if (!words.has(guess.toUpperCase())) {
      return { isValid: false, error: 'Not in word list.' };
    }
    
    return { isValid: true, error: null };
  }

  /**
   * Check if a board is solved
   * @param {Object} board - Board state object
   * @returns {boolean} True if the board is solved
   */
  isBoardSolved(board) {
    if (!board || typeof board !== 'object') return false;
    
    // Check if explicitly marked as solved
    if (board.isSolved === true) return true;
    
    // Check if any guess matches the solution
    if (board.solution && Array.isArray(board.guesses)) {
      return board.guesses.some(guess => 
        guess && typeof guess.word === 'string' && guess.word === board.solution
      );
    }
    
    return false;
  }

  /**
   * Check if a board is dead (out of guesses)
   * @param {Object} board - Board state object
   * @param {number} maxTurns - Maximum number of turns
   * @returns {boolean} True if the board is dead
   */
  isBoardDead(board, maxTurns) {
    if (!board || typeof board !== 'object') return false;
    
    // Check if explicitly marked as dead
    if (board.isDead === true) return true;
    
    // Check if out of guesses
    if (Array.isArray(board.guesses) && maxTurns > 0) {
      const guessCount = board.guesses.length;
      return guessCount >= maxTurns && !this.isBoardSolved(board);
    }
    
    return false;
  }

  /**
   * Check if all boards are solved
   * @param {Array<Object>} boards - Array of board states
   * @returns {boolean} True if all boards are solved
   */
  checkAllBoardsSolved(boards) {
    if (!Array.isArray(boards) || boards.length === 0) return false;
    
    return boards.every(board => this.isBoardSolved(board));
  }

  /**
   * Check if all boards are finished (solved or dead)
   * @param {Array<Object>} boards - Array of board states
   * @param {number} maxTurns - Maximum number of turns
   * @param {boolean} isUnlimited - Whether unlimited guesses are allowed
   * @returns {boolean} True if all boards are finished
   */
  checkAllBoardsFinished(boards, maxTurns, isUnlimited = false) {
    if (!Array.isArray(boards) || boards.length === 0) return false;
    
    if (isUnlimited) {
      // In unlimited mode, only solved boards count as finished
      return boards.every(board => this.isBoardSolved(board));
    }
    
    // In limited mode, boards are finished if solved or dead
    return boards.every(board => 
      this.isBoardSolved(board) || this.isBoardDead(board, maxTurns)
    );
  }

  /**
   * Get maximum turns for a given number of boards
   * @param {number} numBoards - Number of boards
   * @returns {number} Maximum number of turns
   */
  getMaxTurns(numBoards) {
    if (!Number.isFinite(numBoards) || numBoards < 1) {
      return this.defaultMaxTurns;
    }
    
    return wordleGetMaxTurns(numBoards);
  }

  /**
   * Process a guess and update board state
   * @param {Object} board - Current board state
   * @param {string} guess - The guess word
   * @param {number} maxTurns - Maximum number of turns
   * @param {boolean} isUnlimited - Whether unlimited guesses are allowed
   * @param {number} revealId - Reveal ID for animation
   * @returns {Object} Updated board state
   */
  processGuess(board, guess, maxTurns, isUnlimited = false, revealId = null) {
    if (!board || typeof board !== 'object') {
      throw new Error('Invalid board state');
    }
    
    // Don't process guesses for solved or dead boards
    if (this.isBoardSolved(board)) {
      return board;
    }
    
    if (!isUnlimited && this.isBoardDead(board, maxTurns)) {
      return board;
    }
    
    // Validate guess
    const validation = this.validateGuess(guess, this.allowedWords);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Score the guess
    const colors = this.scoreGuess(guess, board.solution || '');
    
    // Update guesses array
    const prevGuesses = Array.isArray(board.guesses) ? board.guesses : [];
    const guesses = [...prevGuesses, { word: guess, colors }];
    
    // Check if solved or dead
    const isSolvedNow = guess === board.solution;
    const isDeadNow = !isUnlimited && !isSolvedNow && guesses.length >= maxTurns;
    
    return {
      ...board,
      guesses,
      isSolved: isSolvedNow,
      isDead: isDeadNow,
      lastRevealId: revealId,
    };
  }

  /**
   * Count solved boards
   * @param {Array<Object>} boards - Array of board states
   * @returns {number} Number of solved boards
   */
  countSolvedBoards(boards) {
    if (!Array.isArray(boards)) return 0;
    
    return boards.filter(board => this.isBoardSolved(board)).length;
  }

  /**
   * Get turns used across all boards
   * @param {Array<Object>} boards - Array of board states
   * @returns {number} Maximum number of guesses across all boards
   */
  getTurnsUsed(boards) {
    if (!Array.isArray(boards) || boards.length === 0) return 0;
    
    let max = 0;
    for (const board of boards) {
      if (board && Array.isArray(board.guesses)) {
        const len = board.guesses.length || 0;
        if (len > max) max = len;
      }
    }
    return max;
  }

  /**
   * Create a new board state
   * @param {string} solution - The solution word
   * @returns {Object} New board state object
   */
  createBoardState(solution) {
    if (typeof solution !== 'string' || solution.length !== this.wordLength) {
      throw new Error(`Solution must be a ${this.wordLength}-letter string`);
    }
    
    return {
      solution: solution.toUpperCase(),
      guesses: [],
      isSolved: false,
      isDead: false,
      lastRevealId: null,
    };
  }

  /**
   * Create multiple board states
   * @param {Array<string>} solutions - Array of solution words
   * @returns {Array<Object>} Array of board states
   */
  createBoards(solutions) {
    if (!Array.isArray(solutions)) {
      throw new Error('Solutions must be an array');
    }
    
    return solutions.map(solution => this.createBoardState(solution));
  }
}

/**
 * Create a game engine instance with default configuration
 * @param {Object} config - Optional configuration
 * @returns {GameEngine} Game engine instance
 */
export function createGameEngine(config = {}) {
  return new GameEngine(config);
}

/**
 * Default game engine instance (can be used when no custom config is needed)
 */
export const defaultGameEngine = new GameEngine();
