// Game mode registry - central definition of all game modes
import GameSinglePlayer from '../components/game/GameSinglePlayer';
import GameMultiplayer from '../components/game/GameMultiplayer';
import { logError } from './errorUtils';

/**
 * Game mode configuration registry
 * Each mode defines its capabilities, routing, component, and feature flags
 */
export const GAME_MODES = {
  daily: {
    id: 'daily',
    name: 'Daily',
    route: '/game/daily',
    component: GameSinglePlayer,
    supportsSpeedrun: true,
    supportsBoards: true,
    minBoards: 1,
    maxBoards: 32,
    persistence: 'daily',
    isMultiplayer: false,
    // Feature flags for mode-specific capabilities
    features: {
      speedrun: true,
      multiBoard: true,
      streaks: { minBoards: 1, maxBoards: 32 }, // Streaks only for 1-board daily
      leaderboard: true,
      sharing: true,
      comments: true,
      timer: true, // Speedrun timer
      persistence: true, // Local and remote persistence
    },
    seo: {
      title: 'Daily Multi-Board Wordle-Style Game – Wuzzle Games',
      description: 'Play Wuzzle Games daily multi-board Wordle-style puzzles with standard and speedrun options, tracking your guesses and scores across boards.',
    },
  },
  marathon: {
    id: 'marathon',
    name: 'Marathon',
    route: '/game/marathon',
    component: GameSinglePlayer,
    supportsSpeedrun: true,
    supportsBoards: false, // Boards determined by marathon stages
    minBoards: 1,
    maxBoards: 32,
    persistence: 'marathon',
    isMultiplayer: false,
    // Feature flags for mode-specific capabilities
    features: {
      speedrun: true,
      multiBoard: true, // Multiple stages with different board counts
      streaks: { minBoards: 1, maxBoards: 32 }, // Streaks for marathon
      leaderboard: true,
      sharing: true,
      comments: true,
      timer: true, // Speedrun timer with cumulative times
      persistence: true, // Local and remote persistence
      stages: true, // Multi-stage progression
    },
    seo: {
      title: 'Marathon & Speedrun – Multi-Board Game | Wuzzle Games',
      description: 'Play Wuzzle Games marathon and speedrun modes with multi-board Wordle-style puzzles, cumulative times and increasing difficulty across stages.',
    },
  },
  multiplayer: {
    id: 'multiplayer',
    name: 'Multiplayer',
    route: '/game/multiplayer',
    component: GameMultiplayer,
    supportsSpeedrun: true,
    supportsBoards: true,
    minBoards: 1,
    maxBoards: 32,
    persistence: null, // Multiplayer doesn't persist locally
    isMultiplayer: true,
    // Feature flags for mode-specific capabilities
    features: {
      speedrun: true,
      multiBoard: true,
      streaks: false, // No streaks in multiplayer
      leaderboard: false, // No leaderboard for multiplayer
      sharing: true,
      comments: false, // No comments in multiplayer
      timer: true, // Speedrun timer per player
      persistence: false, // No local persistence
      chat: true, // Room chat
      friends: true, // Friend challenges
      rematch: true, // Rematch functionality
    },
    seo: {
      title: 'Multiplayer Wordle-Style Battles – Game | Wuzzle Games',
      description: 'Play Wuzzle Games Multiplayer Mode: host or join multiplayer rooms, challenge friends with custom board counts and speedrun mode, and see who solves multi-board puzzles faster.',
    },
  },
  solutionhunt: {
    id: 'solutionhunt',
    name: 'Solution Hunt',
    route: '/game/solutionhunt',
    component: GameSinglePlayer,
    supportsSpeedrun: false, // No speedrun variant - this is a learning/practice mode
    supportsBoards: false, // Always 1 board
    minBoards: 1,
    maxBoards: 1,
    persistence: 'solutionhunt',
    isMultiplayer: false,
    // Feature flags for mode-specific capabilities
    features: {
      speedrun: false,
      multiBoard: false,
      streaks: { minBoards: 1, maxBoards: 1 }, // Streaks for 1-board only
      leaderboard: false, // No leaderboard for this mode
      sharing: true,
      comments: true,
      timer: false, // No timer
      persistence: true, // Local and remote persistence
      solutionHint: true, // Shows possible remaining words
    },
    seo: {
      title: 'Daily Solution Hunt – Word Puzzle Helper | Wuzzle Games',
      description: 'Play Wuzzle Games Solution Hunt: a daily word puzzle that shows all possible remaining words based on your guesses. Perfect for learning and improving your strategy.',
    },
  },
};

/**
 * Get a game mode by ID
 * @param {string} modeId - The mode ID (e.g., 'daily', 'marathon', 'multiplayer')
 * @returns {Object|null} The mode configuration or null if not found
 */
export function getGameMode(modeId) {
  return GAME_MODES[modeId] || null;
}

/**
 * Get all game modes
 * @returns {Object} All registered game modes
 */
export function getAllGameModes() {
  return GAME_MODES;
}

/**
 * Check if a mode supports a feature
 * @param {string} modeId - The mode ID
 * @param {string} feature - The feature to check ('speedrun', 'boards')
 * @returns {boolean} True if the mode supports the feature
 */
export function modeSupportsFeature(modeId, feature) {
  const mode = getGameMode(modeId);
  if (!mode) return false;
  
  if (feature === 'speedrun') {
    return mode.supportsSpeedrun === true;
  }
  if (feature === 'boards') {
    return mode.supportsBoards === true;
  }
  return false;
}

/**
 * Validate mode configuration
 * @param {string} modeId - The mode ID
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateModeConfig(modeId, config = {}) {
  const mode = getGameMode(modeId);
  const errors = [];
  
  if (!mode) {
    return { isValid: false, errors: ['Invalid mode ID'] };
  }
  
  // Validate boards if provided
  if (config.boards !== undefined && mode.supportsBoards) {
    const boards = parseInt(config.boards, 10);
    if (!Number.isFinite(boards) || boards < mode.minBoards || boards > mode.maxBoards) {
      errors.push(`Boards must be between ${mode.minBoards} and ${mode.maxBoards}`);
    }
  }
  
  // Validate speedrun if provided
  if (config.speedrun !== undefined && !mode.supportsSpeedrun && config.speedrun) {
    errors.push('Speedrun mode is not supported for this game mode');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a mode supports a specific feature
 * @param {string} modeId - The mode ID
 * @param {string} feature - The feature to check
 * @returns {boolean|Object} True if supported, feature config object, or false
 */
export function modeSupportsFeatureFlag(modeId, feature) {
  const mode = getGameMode(modeId);
  if (!mode || !mode.features) return false;
  
  const featureValue = mode.features[feature];
  if (featureValue === undefined) return false;
  
  // Return the feature value (could be boolean, object, etc.)
  return featureValue;
}

/**
 * Register a new game mode (for extensibility)
 * @param {Object} modeConfig - Mode configuration object
 * @returns {boolean} True if registration succeeded
 */
export function registerGameMode(modeConfig) {
  if (!modeConfig || typeof modeConfig !== 'object') {
    logError('Invalid mode configuration provided to registerGameMode', 'gameModes.registerGameMode');
    return false;
  }
  
  const requiredFields = ['id', 'name', 'route', 'component'];
  const missingFields = requiredFields.filter(field => !modeConfig[field]);
  
  if (missingFields.length > 0) {
    logError(`Missing required fields in mode configuration: ${missingFields.join(', ')}`, 'gameModes.registerGameMode');
    return false;
  }
  
  // Validate feature flags structure
  if (modeConfig.features && typeof modeConfig.features !== 'object') {
    logError('Features must be an object', 'gameModes.registerGameMode');
    return false;
  }
  
  // Set defaults for optional fields
  const defaultMode = {
    supportsSpeedrun: false,
    supportsBoards: false,
    minBoards: 1,
    maxBoards: 32,
    persistence: null,
    isMultiplayer: false,
    features: {},
    seo: {
      title: `${modeConfig.name} – Wuzzle Games`,
      description: `Play Wuzzle Games ${modeConfig.name.toLowerCase()} mode.`,
    },
  };
  
  // Register the mode
  GAME_MODES[modeConfig.id] = {
    ...defaultMode,
    ...modeConfig,
    features: {
      ...defaultMode.features,
      ...(modeConfig.features || {}),
    },
  };
  
  return true;
}

/**
 * Get feature configuration for a mode
 * @param {string} modeId - The mode ID
 * @returns {Object} Feature configuration object
 */
export function getModeFeatures(modeId) {
  const mode = getGameMode(modeId);
  return mode?.features || {};
}
