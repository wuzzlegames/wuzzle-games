/**
 * Pending leaderboard submissions (e.g. guest solves speedrun, then logs in).
 * Stored in localStorage; flushed when user signs in.
 */

import { loadJSON, saveJSON } from "./persist";
import { submitSpeedrunScore } from "../hooks/useLeaderboard";
import { getCurrentDateString } from "./dailyWords";
import { logError } from "./errorUtils";

const PENDING_KEY = "mw:pendingLeaderboard";

function modeResetsDaily(mode) {
  return mode === 'daily' || mode === 'solutionhunt';
}

/**
 * @param {{ mode: string; numBoards: number; timeMs: number; dateKey?: string | null }} item
 */
export function addPendingLeaderboard(item) {
  const list = loadJSON(PENDING_KEY, []);
  if (!Array.isArray(list)) return;
  list.push({
    mode: item.mode,
    numBoards: item.numBoards,
    timeMs: item.timeMs,
    dateKey: item.dateKey ?? null,
  });
  saveJSON(PENDING_KEY, list);
}

/**
 * @returns {{ mode: string; numBoards: number; timeMs: number; dateKey?: string | null }[]}
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
  const today = getCurrentDateString();

  for (const item of pending) {
    try {
      // If the pending entry is for a previous day, don't submit it into today's leaderboard.
      if (modeResetsDaily(item.mode) && item.dateKey && item.dateKey !== today) {
        continue;
      }

      await submitSpeedrunScore(
        authUser.uid,
        userName,
        item.mode,
        item.numBoards,
        item.timeMs,
        item.dateKey ?? null
      );
    } catch (err) {
      logError(err, "pendingLeaderboard.flush");
    }
  }
}
