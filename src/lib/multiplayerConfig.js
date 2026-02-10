export const MULTIPLAYER_WAITING_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes;

/**
 * Normalize the solution/solutions fields on a multiplayer game state into a
 * single array. This avoids duplicating fallback logic across controllers and
 * views.
 */
export function getSolutionArray(gameState) {
  if (!gameState) return [];
  if (Array.isArray(gameState.solutions) && gameState.solutions.length > 0) {
    return gameState.solutions;
  }
  if (typeof gameState.solution === 'string' && gameState.solution.length > 0) {
    return [gameState.solution];
  }
  return [];
}
