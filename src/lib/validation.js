// Validation utilities for game state, user data, and configuration

import { MAX_BOARDS, DEFAULT_MAX_TURNS } from './gameConstants';
import { WORD_LENGTH } from './wordle';

/**
 * Clamp board count to valid range
 * @param {number} n - Number of boards
 * @returns {number} Clamped value between 1 and MAX_BOARDS
 */
export function clampBoards(n) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(MAX_BOARDS, n));
}

/**
 * Clamp player count to valid range
 * @param {number} n - Number of players
 * @param {number} min - Minimum players (default: 2)
 * @param {number} max - Maximum players (default: 8)
 * @returns {number} Clamped value
 */
export function clampPlayers(n, min = 2, max = 8) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * Validate game state structure
 * @param {any} state - Game state to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateGameState(state) {
  const errors = [];
  
  if (!state || typeof state !== 'object') {
    return { isValid: false, errors: ['Game state must be an object'] };
  }
  
  if (!Array.isArray(state.boards)) {
    errors.push('Game state must have a boards array');
  } else {
    // Validate each board
    state.boards.forEach((board, index) => {
      if (!board || typeof board !== 'object') {
        errors.push(`Board ${index} must be an object`);
        return;
      }
      if (typeof board.solution !== 'string' || board.solution.length !== WORD_LENGTH) {
        errors.push(`Board ${index} must have a valid solution string`);
      }
      if (!Array.isArray(board.guesses)) {
        errors.push(`Board ${index} must have a guesses array`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate user data structure
 * @param {any} user - User data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateUserData(user) {
  const errors = [];
  
  if (!user || typeof user !== 'object') {
    return { isValid: false, errors: ['User data must be an object'] };
  }
  
  if (typeof user.uid !== 'string' || user.uid.length === 0) {
    errors.push('User must have a valid uid');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiplayer game state structure
 * @param {any} gameState - Multiplayer game state to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateMultiplayerGameState(gameState) {
  const errors = [];
  
  if (!gameState || typeof gameState !== 'object') {
    return { isValid: false, errors: ['Game state must be an object'] };
  }
  
  if (!gameState.players || typeof gameState.players !== 'object') {
    errors.push('Game state must have a players object');
  } else {
    // Validate players map
    const playerIds = Object.keys(gameState.players);
    if (playerIds.length === 0) {
      errors.push('Game state must have at least one player');
    }
    const hasHost = playerIds.some((pid) => gameState.players[pid]?.isHost === true);
    if (!hasHost) {
      errors.push('Game state must have at least one host in the players map');
    }
    playerIds.forEach((playerId) => {
      const player = gameState.players[playerId];
      if (!player || typeof player !== 'object') {
        errors.push(`Player ${playerId} must be an object`);
        return;
      }
      if (typeof player.id !== 'string' || player.id !== playerId) {
        errors.push(`Player ${playerId} must have a matching id`);
      }
      if (typeof player.name !== 'string') {
        errors.push(`Player ${playerId} must have a name`);
      }
    });
  }
  
  const validStatuses = ['waiting', 'ready', 'playing', 'finished'];
  if (!validStatuses.includes(gameState.status)) {
    errors.push(`Game state must have a valid status (${validStatuses.join(', ')})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate board count parameter
 * @param {any} boards - Board count to validate
 * @returns {number|null} Valid board count or null if invalid
 */
export function validateBoardCount(boards) {
  if (boards === null || boards === undefined) return null;
  const parsed = typeof boards === 'string' ? parseInt(boards, 10) : boards;
  if (!Number.isFinite(parsed)) return null;
  return clampBoards(parsed);
}

/**
 * Validate speedrun parameter
 * @param {any} speedrun - Speedrun flag to validate
 * @returns {boolean} Valid boolean value
 */
export function validateSpeedrun(speedrun) {
  if (typeof speedrun === 'boolean') return speedrun;
  if (typeof speedrun === 'string') {
    return speedrun === 'true' || speedrun === '1';
  }
  return !!speedrun;
}

/**
 * Validate game mode
 * @param {any} mode - Mode to validate
 * @returns {string} Valid mode or 'daily' as default
 */
export function validateGameMode(mode) {
  const validModes = ['daily', 'marathon', 'multiplayer', 'solutionhunt'];
  if (typeof mode === 'string' && validModes.includes(mode)) {
    return mode;
  }
  return 'daily'; // Default
}

/**
 * Validate username
 * @param {any} username - Username to validate
 * @param {number} minLength - Minimum length (default: 1)
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {Object} Validation result with isValid, value, and errors
 */
export function validateUsername(username, minLength = 1, maxLength = 50) {
  const errors = [];
  
  if (typeof username !== 'string') {
    return { isValid: false, value: null, errors: ['Username must be a string'] };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < minLength) {
    errors.push(`Username must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`);
  }
  
  if (trimmed.length > maxLength) {
    errors.push(`Username must be at most ${maxLength} characters`);
  }
  
  // Check for invalid characters (no control characters, but allow unicode)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    errors.push('Username contains invalid characters');
  }
  
  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? trimmed : null,
    errors,
  };
}

/**
 * Validate game code format
 * @param {any} code - Game code to validate
 * @returns {Object} Validation result with isValid, value, and errors
 */
export function validateGameCode(code) {
  const errors = [];
  
  if (typeof code !== 'string') {
    return { isValid: false, value: null, errors: ['Game code must be a string'] };
  }
  
  const trimmed = code.trim();
  
  if (trimmed.length !== 6) {
    errors.push('Game code must be exactly 6 digits');
  }
  
  if (!/^\d{6}$/.test(trimmed)) {
    errors.push('Game code must contain only digits');
  }
  
  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? trimmed : null,
    errors,
  };
}
