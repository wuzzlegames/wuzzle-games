/**
 * Pending leaderboard submissions (e.g. guest solves speedrun, then logs in).
 * Stored in localStorage; flushed when user signs in.
 */

import { loadJSON, saveJSON } from "./persist";
import { submitSpeedrunScore } from "../hooks/useLeaderboard";
import { logError } from "./errorUtils";

const PENDING_KEY = "mw:pendingLeaderboard";

/**
 * @param {{ mode: string; numBoards: number; timeMs: number }} item
 */
export function addPendingLeaderboard(item) {
  const list = loadJSON(PENDING_KEY, []);
  if (!Array.isArray(list)) return;
  list.push({
    mode: item.mode,
    numBoards: item.numBoards,
    timeMs: item.timeMs,
  });
  saveJSON(PENDING_KEY, list);
}

/**
 * @returns {{ mode: string; numBoards: number; timeMs: number }[]}
 */
export function getAndClearPendingLeaderboard() {
  const list = loadJSON(PENDING_KEY, []);
  saveJSON(PENDING_KEY, []);
  return Array.isArray(list) ? list : [];
}

/**
 * Submit any pending leaderboard entries for the newly signed-in user.
 * Call when authUser becomes truthy (e.g. on login).
 * @param {{ uid: string; displayName?: string | null; email?: string | null }} authUser
 */
export async function flushPendingLeaderboardOnLogin(authUser) {
  if (!authUser?.uid) return;
  const pending = getAndClearPendingLeaderboard();
  const userName = authUser.displayName || authUser.email || "Anonymous";
  for (const item of pending) {
    try {
      await submitSpeedrunScore(
        authUser.uid,
        userName,
        item.mode,
        item.numBoards,
        item.timeMs
      );
    } catch (err) {
      logError(err, "pendingLeaderboard.flush");
    }
  }
}
