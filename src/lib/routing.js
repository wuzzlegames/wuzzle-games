// URL routing utilities for game modes
import { getGameMode, validateModeConfig } from './gameModes';
import { validateGameMode, validateBoardCount, validateSpeedrun } from './validation';
import { logError } from './errorUtils';

/**
 * Build a game URL from configuration
 * @param {Object} config - Game configuration
 * @param {string} config.mode - Game mode ('daily', 'marathon', 'multiplayer')
 * @param {number} [config.boards] - Number of boards (optional)
 * @param {boolean} [config.speedrun] - Enable speedrun mode (optional)
 * @param {string} [config.code] - Multiplayer game code (optional, for multiplayer mode)
 * @param {boolean} [config.useQueryParams] - Use query params instead of route params (default: false)
 * @returns {string} The game URL
 */
export function buildGameUrl(config) {
  const { mode, boards, speedrun, code, useQueryParams = false } = config;
  
  // Validate mode
  const modeConfig = getGameMode(mode);
  if (!modeConfig) {
    logError(`Invalid mode: ${mode}, defaulting to daily`, 'routing.buildGameUrl');
    return buildGameUrl({ ...config, mode: 'daily' });
  }
  
  // Validate configuration
  const validation = validateModeConfig(mode, { boards, speedrun });
  if (!validation.isValid) {
    logError(`Invalid game configuration: ${validation.errors.join(', ')}`, 'routing.buildGameUrl');
  }
  
  // Multiplayer mode with code
  if (mode === 'multiplayer' && code) {
    if (useQueryParams) {
      const params = new URLSearchParams();
      params.set('mode', 'multiplayer');
      params.set('code', code);
      if (speedrun) params.set('speedrun', 'true');
      if (boards) params.set('boards', boards.toString());
      return `/game?${params.toString()}`;
    }
    // Route-based: /game/multiplayer/:code
    let url = `/game/multiplayer/${code}`;
    if (speedrun) {
      url += '/speedrun';
    }
    return url;
  }
  
  // Single player modes (daily, marathon)
  if (useQueryParams) {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (speedrun) params.set('speedrun', 'true');
    if (boards && modeConfig.supportsBoards) {
      params.set('boards', boards.toString());
    }
    return `/game?${params.toString()}`;
  }
  
  // Route-based URLs
  let url = `/game/${mode}`;
  
  if (boards && modeConfig.supportsBoards) {
    url += `/${boards}`;
  }
  
  if (speedrun && modeConfig.supportsSpeedrun) {
    if (boards && modeConfig.supportsBoards) {
      url += '/speedrun';
    } else {
      // If no boards param, speedrun goes in query
      url += '?speedrun=true';
    }
  }
  
  return url;
}

/**
 * Parse game URL parameters
 * @param {Object} params - URL parameters from useParams()
 * @param {URLSearchParams} searchParams - Search params from useSearchParams()
 * @returns {Object} Parsed game configuration
 */
export function parseGameUrl(params = {}, searchParams = null) {
  const { mode: modeParam, boards: boardsParam, variant: variantParam, code: codeParam } = params;
  
  // Get search params if provided
  const rawMode = searchParams?.get('mode');
  const speedrunParam = searchParams?.get('speedrun');
  const boardsQueryParam = searchParams?.get('boards');
  const codeQueryParam = searchParams?.get('code');
  
  // Determine mode with validation
  let mode = 'daily'; // Default
  const isMultiplayerQueryMode = rawMode === 'multiplayer';
  const isMultiplayerRoute = modeParam === 'multiplayer' || !!codeParam;
  const is1v1Alias = rawMode === '1v1' || modeParam === '1v1';
  const isSolutionHuntMode = modeParam === 'solutionhunt' || rawMode === 'solutionhunt';

  if (modeParam === 'daily' || modeParam === 'marathon' || modeParam === 'solutionhunt') {
    mode = validateGameMode(modeParam);
  } else if (isMultiplayerRoute || is1v1Alias) {
    mode = 'multiplayer';
  } else if (rawMode === 'daily' || rawMode === 'marathon' || rawMode === 'solutionhunt' || isMultiplayerQueryMode || is1v1Alias) {
    mode = (isMultiplayerQueryMode || is1v1Alias) ? 'multiplayer' : validateGameMode(rawMode);
  } else if (modeParam && modeParam !== 'multiplayer' && !is1v1Alias) {
    // Invalid mode in route params - log and default to daily
    logError(`Invalid mode in route params: ${modeParam}, defaulting to daily`, 'routing.parseGameUrl');
    mode = 'daily';
  }
  
  // Validate mode config exists
  const modeConfig = getGameMode(mode);
  if (!modeConfig) {
    logError(`Mode config not found for: ${mode}, defaulting to daily`, 'routing.parseGameUrl');
    mode = 'daily';
  }
  
  // Determine speedrun with validation
  let speedrunEnabled = false;
  const supportsSpeedrunParam = modeConfig?.supportsSpeedrun && 
    (rawMode === 'daily' || rawMode === 'marathon' || isMultiplayerQueryMode || is1v1Alias);
  
  if (variantParam === 'speedrun') {
    speedrunEnabled = modeConfig?.supportsSpeedrun || false;
  } else if (supportsSpeedrunParam && speedrunParam) {
    speedrunEnabled = validateSpeedrun(speedrunParam);
  }
  
  // Determine boards with validation
  let boards = null;
  if (boardsParam) {
    boards = validateBoardCount(boardsParam);
  } else if ((supportsSpeedrunParam || mode === 'multiplayer') && boardsQueryParam) {
    boards = validateBoardCount(boardsQueryParam);
  }
  
  // Validate game code format (6 digits)
  let code = codeParam || codeQueryParam || null;
  if (code && typeof code === 'string') {
    // Game code should be 6 digits
    if (!/^\d{6}$/.test(code)) {
      logError(`Invalid game code format: ${code}`, 'routing.parseGameUrl');
      code = null;
    }
  }
  
  // Validate configuration
  const validation = validateModeConfig(mode, { boards, speedrun: speedrunEnabled });
  if (!validation.isValid) {
    logError(`Invalid game configuration: ${validation.errors.join(', ')}`, 'routing.parseGameUrl');
    // Apply defaults based on validation errors
    if (boards === null && modeConfig?.supportsBoards) {
      boards = 1; // Default to 1 board
    }
  }
  
  return {
    mode,
    boards,
    speedrun: speedrunEnabled,
    code,
    validationErrors: validation.isValid ? [] : validation.errors,
  };
}

/**
 * Get canonical URL for a game configuration
 * Normalizes to route-based format (not query params)
 * @param {Object} config - Game configuration
 * @returns {string} Canonical URL
 */
export function getCanonicalGameUrl(config) {
  return buildGameUrl({ ...config, useQueryParams: false });
}
