import { ref, get, set, push } from 'firebase/database';
import { database } from '../config/firebase';
import { logError } from './errorUtils';
import { getCurrentDateString } from './dailyWords';

/**
 * Stats service for tracking and retrieving advanced statistics
 * Premium feature - tracks detailed game performance data
 */

/**
 * Get stats key for a mode/variant
 * @param {string} mode - 'daily', 'marathon', or 'solutionhunt'
 * @param {boolean} speedrunEnabled - Whether speedrun is enabled
 * @returns {string} Stats key (e.g., 'daily_standard', 'marathon_speedrun', 'solutionhunt_standard')
 */
function getStatsKey(mode, speedrunEnabled) {
  if (mode === 'solutionhunt') {
    return 'solutionhunt_standard'; // Solution Hunt has no speedrun variant
  }
  const modeKey = mode === 'daily' ? 'daily' : 'marathon';
  const variantKey = speedrunEnabled ? 'speedrun' : 'standard';
  return `${modeKey}_${variantKey}`;
}

const DEFAULT_GUESS_DIST = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

/**
 * Save game completion data for statistics
 * This should be called when a game is completed (for streak-tracked modes)
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.mode - 'daily' or 'marathon'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {string} params.dateString - Date string (YYYY-MM-DD)
 * @param {number} params.guesses - Number of guesses used
 * @param {number} params.solveTimeMs - Time taken in milliseconds (for speedrun)
 * @param {number} params.numBoards - Number of boards (for daily, should be 1)
 * @param {boolean} params.solved - Whether the game was solved
 * @param {number} params.marathonIndex - Stage index for marathon (0-3)
 * @param {number} params.marathonTotalGuesses - Total guesses across all stages (for full marathon)
 * @param {number} params.marathonTotalTimeMs - Total time across all stages (for full marathon speedrun)
 * @param {boolean} params.isMarathonComplete - Whether the full marathon is complete
 */
export async function saveGameStats({ 
  uid, 
  mode, 
  speedrunEnabled, 
  dateString, 
  guesses, 
  solveTimeMs = null, 
  numBoards = 1, 
  solved = true,
  marathonIndex = null,
  marathonTotalGuesses = null,
  marathonTotalTimeMs = null,
  isMarathonComplete = false,
}) {
  if (!uid) return;
  
  try {
    // Only track for streak-tracked modes: daily 1-board, marathon (any)
    const shouldTrack = (mode === 'daily' && numBoards === 1) || mode === 'marathon';
    if (!shouldTrack) return;

    const statsKey = getStatsKey(mode, speedrunEnabled);

    // For marathon mode, track each stage and full marathon completion
    if (mode === 'marathon') {
      // Only track solved stages to avoid skewing statistics
      if (solved && guesses > 0 && guesses <= 6) {
        // Track individual stage completion
        const stageData = {
          dateString,
          guesses,
          solved: true,
          timestamp: Date.now(),
          stageIndex: marathonIndex,
          stageBoards: numBoards,
        };

        // Add timing data for speedrun mode
        if (speedrunEnabled && solveTimeMs !== null && solveTimeMs > 0) {
          stageData.solveTimeMs = solveTimeMs;
        }

        // Store stage record
        const stageRef = ref(database, `users/${uid}/stats/${statsKey}/stages`);
        await push(stageRef, stageData);
      }

      // If marathon is complete, also track full marathon completion
      // Only track if we have valid total guesses (all stages solved)
      if (isMarathonComplete && marathonTotalGuesses !== null && marathonTotalGuesses > 0) {
        const marathonData = {
          dateString,
          guesses: marathonTotalGuesses,
          solved: true,
          timestamp: Date.now(),
          isFullMarathon: true,
        };

        // Add total timing data for speedrun mode
        if (speedrunEnabled && marathonTotalTimeMs !== null && marathonTotalTimeMs > 0) {
          marathonData.solveTimeMs = marathonTotalTimeMs;
        }

        // Store full marathon record
        const gameRef = ref(database, `users/${uid}/stats/${statsKey}/games`);
        await push(gameRef, marathonData);

        // Update aggregated stats with full marathon data
        await updateAggregatedStats({ uid, statsKey, gameData: marathonData });
      }
    } else {
      // Daily mode - track single game completion
      // Only track solved games with valid guesses
      if (solved && guesses > 0 && guesses <= 6) {
        const gameData = {
          dateString,
          guesses,
          solved: true,
          timestamp: Date.now(),
        };

        // Add timing data for speedrun mode
        if (speedrunEnabled && solveTimeMs !== null && solveTimeMs > 0) {
          gameData.solveTimeMs = solveTimeMs;
        }

        // Store individual game record
        const gameRef = ref(database, `users/${uid}/stats/${statsKey}/games`);
        await push(gameRef, gameData);

        // Update aggregated stats (for quick retrieval)
        await updateAggregatedStats({ uid, statsKey, gameData });
      }
    }
  } catch (err) {
    logError(err, 'statsService.saveGameStats');
  }
}

/**
 * Update aggregated statistics
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.statsKey - Stats key (e.g., 'daily_standard')
 * @param {Object} params.gameData - Game completion data
 */
async function updateAggregatedStats({ uid, statsKey, gameData }) {
  try {
    const statsRef = ref(database, `users/${uid}/stats/${statsKey}/aggregated`);
    const snap = await get(statsRef);
    
    const current = snap.exists() ? snap.val() : {
      totalGames: 0,
      solvedGames: 0,
      totalGuesses: 0,
      guessDistribution: { ...DEFAULT_GUESS_DIST },
      totalTimeMs: 0,
      fastestTimeMs: null,
      slowestTimeMs: null,
      lastUpdated: Date.now(),
    };

    const updated = { ...current };
    // Normalize for old or malformed data: ensure guessDistribution has all keys 1-6
    updated.guessDistribution = { ...DEFAULT_GUESS_DIST };
    for (let g = 1; g <= 6; g++) {
      const v = current.guessDistribution && typeof current.guessDistribution[g] === 'number' ? current.guessDistribution[g] : 0;
      updated.guessDistribution[g] = v;
    }
    updated.totalGames = (typeof current.totalGames === 'number' ? current.totalGames : 0) + 1;
    
    if (gameData.solved && gameData.guesses > 0 && gameData.guesses <= 6) {
      updated.solvedGames = (typeof current.solvedGames === 'number' ? current.solvedGames : 0) + 1;
      updated.totalGuesses = (typeof current.totalGuesses === 'number' ? current.totalGuesses : 0) + gameData.guesses;
      
      // Update guess distribution (already validated guesses is 1-6)
      updated.guessDistribution[gameData.guesses] = (updated.guessDistribution[gameData.guesses] || 0) + 1;

      // Update timing stats for speedrun
      if (gameData.solveTimeMs !== undefined && gameData.solveTimeMs !== null && gameData.solveTimeMs > 0) {
        updated.totalTimeMs = (updated.totalTimeMs || 0) + gameData.solveTimeMs;
        
        if (updated.fastestTimeMs === null || gameData.solveTimeMs < updated.fastestTimeMs) {
          updated.fastestTimeMs = gameData.solveTimeMs;
        }
        
        if (updated.slowestTimeMs === null || gameData.solveTimeMs > updated.slowestTimeMs) {
          updated.slowestTimeMs = gameData.solveTimeMs;
        }
      }
    }

    updated.lastUpdated = Date.now();
    await set(statsRef, updated);
  } catch (err) {
    logError(err, 'statsService.updateAggregatedStats');
  }
}

/**
 * Load aggregated statistics
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.mode - 'daily' or 'marathon'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @returns {Promise<Object | null>} Aggregated stats or null
 */
export async function loadAggregatedStats({ uid, mode, speedrunEnabled }) {
  if (!uid) return null;
  
  try {
    const statsKey = getStatsKey(mode, speedrunEnabled);
    const statsRef = ref(database, `users/${uid}/stats/${statsKey}/aggregated`);
    const snap = await get(statsRef);
    
    if (snap.exists()) {
      return snap.val();
    }
    return null;
  } catch (err) {
    logError(err, 'statsService.loadAggregatedStats');
    return null;
  }
}

/**
 * Load all game records for detailed statistics
 * For marathon mode, loads full marathon completions (not individual stages)
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {string} params.mode - 'daily' or 'marathon'
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @returns {Promise<Array | null>} Array of game records or null
 */
export async function loadGameRecords({ uid, mode, speedrunEnabled }) {
  if (!uid) return null;
  
  try {
    const statsKey = getStatsKey(mode, speedrunEnabled);
    const gamesRef = ref(database, `users/${uid}/stats/${statsKey}/games`);
    const snap = await get(gamesRef);
    
    if (snap.exists()) {
      const data = snap.val();
      // Convert Firebase object to array
      const records = Object.values(data || {});
      
      // For marathon, only return full marathon completions (filter out stage records if any)
      if (mode === 'marathon') {
        return records.filter(r => r.isFullMarathon === true);
      }
      
      return records;
    }
    return [];
  } catch (err) {
    logError(err, 'statsService.loadGameRecords');
    return null;
  }
}

/**
 * Load stage records for marathon mode (for per-stage statistics)
 * @param {Object} params
 * @param {string} params.uid - User ID
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @returns {Promise<Array | null>} Array of stage records or null
 */
export async function loadMarathonStageRecords({ uid, speedrunEnabled }) {
  if (!uid) return null;
  
  try {
    const statsKey = getStatsKey('marathon', speedrunEnabled);
    const stagesRef = ref(database, `users/${uid}/stats/${statsKey}/stages`);
    const snap = await get(stagesRef);
    
    if (snap.exists()) {
      const data = snap.val();
      // Convert Firebase object to array
      return Object.values(data || {});
    }
    return [];
  } catch (err) {
    logError(err, 'statsService.loadMarathonStageRecords');
    return null;
  }
}

/**
 * Calculate advanced statistics from game records
 * @param {Array} gameRecords - Array of game completion records
 * @returns {Object} Calculated statistics
 */
export function calculateAdvancedStats(gameRecords) {
  if (!gameRecords || gameRecords.length === 0) {
    return {
      totalGames: 0,
      solvedGames: 0,
      winRate: 0,
      averageGuesses: 0,
      medianGuesses: 0,
      guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      bestPerformance: null,
      worstPerformance: null,
      perfectGames: 0,
      gamesSolvedIn3OrFewer: 0,
      gamesSolvedIn4OrFewer: 0,
      averageTimeMs: null,
      medianTimeMs: null,
      fastestTimeMs: null,
      slowestTimeMs: null,
      averageTimePerGuess: null,
      sub30Count: 0,
      sub30Percentage: 0,
      sub60Count: 0,
      sub60Percentage: 0,
      sub120Count: 0,
      sub120Percentage: 0,
      avgTimeMsByGuesses: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
    };
  }

  const solvedGames = gameRecords.filter(g => g.solved);
  const totalGames = gameRecords.length;
  const solvedCount = solvedGames.length;
  const winRate = totalGames > 0 ? (solvedCount / totalGames) * 100 : 0;

  // Guess statistics
  const guesses = solvedGames.map(g => g.guesses).filter(g => g > 0);
  const averageGuesses = guesses.length > 0 
    ? guesses.reduce((sum, g) => sum + g, 0) / guesses.length 
    : 0;
  
  const sortedGuesses = [...guesses].sort((a, b) => a - b);
  const medianGuesses = sortedGuesses.length > 0
    ? sortedGuesses.length % 2 === 0
      ? (sortedGuesses[sortedGuesses.length / 2 - 1] + sortedGuesses[sortedGuesses.length / 2]) / 2
      : sortedGuesses[Math.floor(sortedGuesses.length / 2)]
    : 0;

  // Guess distribution
  const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  guesses.forEach(g => {
    if (g >= 1 && g <= 6) {
      guessDistribution[g] = (guessDistribution[g] || 0) + 1;
    }
  });

  const bestPerformance = guesses.length > 0 ? Math.min(...guesses) : null;
  const worstPerformance = guesses.length > 0 ? Math.max(...guesses) : null;
  const perfectGames = guessDistribution[1] || 0;
  const gamesSolvedIn3OrFewer = (guessDistribution[1] || 0) + (guessDistribution[2] || 0) + (guessDistribution[3] || 0);
  const gamesSolvedIn4OrFewer = gamesSolvedIn3OrFewer + (guessDistribution[4] || 0);

  // Time statistics (for speedrun)
  const times = solvedGames
    .map(g => g.solveTimeMs)
    .filter(t => t !== null && t !== undefined && t > 0);
  
  const averageTimeMs = times.length > 0
    ? times.reduce((sum, t) => sum + t, 0) / times.length
    : null;
  
  const sortedTimes = [...times].sort((a, b) => a - b);
  const medianTimeMs = sortedTimes.length > 0
    ? sortedTimes.length % 2 === 0
      ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
      : sortedTimes[Math.floor(sortedTimes.length / 2)]
    : null;
  
  const fastestTimeMs = times.length > 0 ? Math.min(...times) : null;
  const slowestTimeMs = times.length > 0 ? Math.max(...times) : null;

  // Average time per guess
  const averageTimePerGuess = averageTimeMs !== null && averageGuesses > 0
    ? averageTimeMs / averageGuesses
    : null;

  // Speed categories (sub-30s, sub-1m, sub-2m) and avg time by guess count (for speedrun)
  const sub30Ms = 30 * 1000;
  const sub60Ms = 60 * 1000;
  const sub120Ms = 120 * 1000;
  let sub30Count = 0;
  let sub60Count = 0;
  let sub120Count = 0;
  const avgTimeMsByGuesses = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  const sumByGuesses = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const countByGuesses = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  solvedGames.forEach((g) => {
    const ms = g.solveTimeMs;
    if (ms != null && ms > 0) {
      if (ms < sub30Ms) sub30Count += 1;
      if (ms < sub60Ms) sub60Count += 1;
      if (ms < sub120Ms) sub120Count += 1;
      const guesses = g.guesses;
      if (guesses >= 1 && guesses <= 6) {
        sumByGuesses[guesses] += ms;
        countByGuesses[guesses] += 1;
      }
    }
  });

  [1, 2, 3, 4, 5, 6].forEach((g) => {
    if (countByGuesses[g] > 0) {
      avgTimeMsByGuesses[g] = Math.round(sumByGuesses[g] / countByGuesses[g]);
    }
  });

  const sub30Percentage = solvedCount > 0 ? Math.round((sub30Count / solvedCount) * 10000) / 100 : 0;
  const sub60Percentage = solvedCount > 0 ? Math.round((sub60Count / solvedCount) * 10000) / 100 : 0;
  const sub120Percentage = solvedCount > 0 ? Math.round((sub120Count / solvedCount) * 10000) / 100 : 0;

  return {
    totalGames,
    solvedGames: solvedCount,
    winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
    averageGuesses: Math.round(averageGuesses * 100) / 100,
    medianGuesses,
    guessDistribution,
    bestPerformance,
    worstPerformance,
    perfectGames,
    perfectGamesPercentage: solvedCount > 0 ? Math.round((perfectGames / solvedCount) * 10000) / 100 : 0,
    gamesSolvedIn3OrFewer,
    gamesSolvedIn3OrFewerPercentage: solvedCount > 0 ? Math.round((gamesSolvedIn3OrFewer / solvedCount) * 10000) / 100 : 0,
    gamesSolvedIn4OrFewer,
    gamesSolvedIn4OrFewerPercentage: solvedCount > 0 ? Math.round((gamesSolvedIn4OrFewer / solvedCount) * 10000) / 100 : 0,
    averageTimeMs,
    medianTimeMs,
    fastestTimeMs,
    slowestTimeMs,
    averageTimePerGuess: averageTimePerGuess !== null ? Math.round(averageTimePerGuess * 100) / 100 : null,
    sub30Count,
    sub30Percentage,
    sub60Count,
    sub60Percentage,
    sub120Count,
    sub120Percentage,
    avgTimeMsByGuesses,
  };
}

/**
 * Calculate per-stage statistics for marathon mode
 * @param {Array} stageRecords - Array of stage completion records (stageBoards, guesses, solveTimeMs)
 * @param {boolean} speedrunEnabled - Whether speedrun timing is present
 * @returns {{ byStage: Object, totals: Object }}
 */
export function calculateMarathonStageStats(stageRecords, speedrunEnabled = false) {
  const byStage = { 1: null, 2: null, 3: null, 4: null };
  const stageBoardsList = [1, 2, 3, 4];

  stageBoardsList.forEach((numBoards) => {
    const records = (stageRecords || []).filter((r) => {
      const boards = Number(r.stageBoards);
      const g = Number(r.guesses);
      return boards === numBoards && r.solved !== false && g >= 1 && g <= 6;
    });
    const solvedCount = records.length;
    const guesses = records.map((r) => Number(r.guesses));
    const guessDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    guesses.forEach((g) => { guessDistribution[g] = (guessDistribution[g] || 0) + 1; });

    const averageGuesses = guesses.length > 0
      ? guesses.reduce((sum, g) => sum + g, 0) / guesses.length
      : 0;
    const sortedGuesses = [...guesses].sort((a, b) => a - b);
    const medianGuesses = sortedGuesses.length > 0
      ? (sortedGuesses.length % 2 === 0
        ? (sortedGuesses[sortedGuesses.length / 2 - 1] + sortedGuesses[sortedGuesses.length / 2]) / 2
        : sortedGuesses[Math.floor(sortedGuesses.length / 2)])
      : 0;
    const bestPerformance = guesses.length > 0 ? Math.min(...guesses) : null;
    const worstPerformance = guesses.length > 0 ? Math.max(...guesses) : null;

    let averageTimeMs = null;
    let medianTimeMs = null;
    let fastestTimeMs = null;
    let slowestTimeMs = null;
    let averageTimePerGuess = null;

    if (speedrunEnabled) {
      const times = records.map((r) => r.solveTimeMs).filter((t) => t != null && t > 0);
      if (times.length > 0) {
        averageTimeMs = times.reduce((sum, t) => sum + t, 0) / times.length;
        const sortedTimes = [...times].sort((a, b) => a - b);
        medianTimeMs = sortedTimes.length % 2 === 0
          ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
          : sortedTimes[Math.floor(sortedTimes.length / 2)];
        fastestTimeMs = Math.min(...times);
        slowestTimeMs = Math.max(...times);
        if (averageGuesses > 0) {
          averageTimePerGuess = averageTimeMs / averageGuesses;
        }
      }
    }

    byStage[numBoards] = {
      guessDistribution,
      solvedGames: solvedCount,
      averageGuesses: Math.round(averageGuesses * 100) / 100,
      medianGuesses,
      bestPerformance,
      worstPerformance,
      averageTimeMs: averageTimeMs != null ? Math.round(averageTimeMs) : null,
      medianTimeMs: medianTimeMs != null ? Math.round(medianTimeMs) : null,
      fastestTimeMs: fastestTimeMs ?? null,
      slowestTimeMs: slowestTimeMs ?? null,
      averageTimePerGuess: averageTimePerGuess != null ? Math.round(averageTimePerGuess * 100) / 100 : null,
    };
  });

  const totalStages = (stageRecords || []).filter((r) => {
    const g = Number(r.guesses);
    return r.solved !== false && g >= 1 && g <= 6;
  }).length;
  const totals = { totalStages };

  return { byStage, totals };
}

/**
 * Calculate full-marathon summary from game records (completed marathons only)
 * @param {Array} gameRecords - Array of full marathon completion records (guesses = total guesses, solveTimeMs for speedrun)
 * @param {boolean} speedrunEnabled - Whether speedrun timing is present
 * @returns {Object}
 */
export function calculateMarathonSummaryFromGames(gameRecords, speedrunEnabled = false) {
  if (!gameRecords || gameRecords.length === 0) {
    return {
      totalMarathons: 0,
      averageTotalGuesses: 0,
      bestMarathonGuesses: null,
      worstMarathonGuesses: null,
      averageTimeMs: null,
      medianTimeMs: null,
      fastestTimeMs: null,
      slowestTimeMs: null,
    };
  }

  const totalMarathons = gameRecords.length;
  const guesses = gameRecords.map((r) => r.guesses).filter((g) => g > 0);
  const averageTotalGuesses = guesses.length > 0
    ? guesses.reduce((sum, g) => sum + g, 0) / guesses.length
    : 0;
  const bestMarathonGuesses = guesses.length > 0 ? Math.min(...guesses) : null;
  const worstMarathonGuesses = guesses.length > 0 ? Math.max(...guesses) : null;

  let averageTimeMs = null;
  let medianTimeMs = null;
  let fastestTimeMs = null;
  let slowestTimeMs = null;

  if (speedrunEnabled) {
    const times = gameRecords.map((r) => r.solveTimeMs).filter((t) => t != null && t > 0);
    if (times.length > 0) {
      averageTimeMs = times.reduce((sum, t) => sum + t, 0) / times.length;
      const sortedTimes = [...times].sort((a, b) => a - b);
      medianTimeMs = sortedTimes.length % 2 === 0
        ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
        : sortedTimes[Math.floor(sortedTimes.length / 2)];
      fastestTimeMs = Math.min(...times);
      slowestTimeMs = Math.max(...times);
    }
  }

  return {
    totalMarathons,
    averageTotalGuesses: Math.round(averageTotalGuesses * 100) / 100,
    bestMarathonGuesses,
    worstMarathonGuesses,
    averageTimeMs: averageTimeMs != null ? Math.round(averageTimeMs) : null,
    medianTimeMs: medianTimeMs != null ? Math.round(medianTimeMs) : null,
    fastestTimeMs: fastestTimeMs ?? null,
    slowestTimeMs: slowestTimeMs ?? null,
  };
}

/**
 * Format time in milliseconds to readable string
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time (e.g., "1m 23s" or "45s")
 */
export function formatTime(ms) {
  if (ms === null || ms === undefined) return 'N/A';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}
