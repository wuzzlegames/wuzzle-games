import { useState, useEffect } from 'react';
import { ref, push, set, query, limitToLast, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import { getCurrentDateString } from '../lib/dailyWords';

function modeResetsDaily(mode) {
  return mode === 'daily' || mode === 'solutionhunt';
}

function getMsUntilNextLocalMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  // +50ms so we are safely past midnight even if timers fire slightly early.
  return Math.max(0, next.getTime() - now.getTime() + 50);
}

function useLocalDateKey(enabled) {
  const [dateKey, setDateKey] = useState(() => getCurrentDateString());

  useEffect(() => {
    if (!enabled) return;

    // Ensure we're aligned to the current date when enabling.
    setDateKey(getCurrentDateString());

    const timeout = setTimeout(() => {
      setDateKey(getCurrentDateString());
    }, getMsUntilNextLocalMidnight());

    return () => clearTimeout(timeout);
  }, [enabled, dateKey]);

  return dateKey;
}

/**
 * Submit a speedrun time to the leaderboard (ranked by time only; faster is better).
 * Writes to the date-scoped (or marathon) path and to the all-time path, unless skipDateScoped.
 * @param {string} userId - User ID
 * @param {string} userName - User display name or email
 * @param {string} mode - 'daily', 'solutionhunt', or 'marathon'
 * @param {number} numBoards - Number of boards
 * @param {number} timeMs - Time in milliseconds
 * @param {string|null} dateKeyOverride - Optional YYYY-MM-DD (local) date key for daily-reset modes
 * @param {{ skipDateScoped?: boolean }} options - If skipDateScoped is true, only write to all-time (e.g. for past-day pending entries).
 */
export async function submitSpeedrunScore(
  userId,
  userName,
  mode,
  numBoards,
  timeMs,
  dateKeyOverride = null,
  options = {}
) {
  if (!userId) {
    throw new Error('User must be signed in to submit scores');
  }

  const { skipDateScoped = false } = options;
  const resetsDaily = modeResetsDaily(mode);
  const dateKey = resetsDaily ? (dateKeyOverride || getCurrentDateString()) : (dateKeyOverride || getCurrentDateString());
  const timestamp = Date.now();

  const allTimeEntry = {
    userId,
    userName: userName || 'Anonymous',
    numBoards,
    timeMs,
    timestamp,
    dateKey: resetsDaily ? dateKey : getCurrentDateString(),
  };

  let dateScopedKey = null;
  if (!skipDateScoped) {
    const basePath = resetsDaily ? `leaderboard/${mode}/${dateKey}` : `leaderboard/${mode}`;
    const leaderboardRef = ref(database, basePath);
    const entryRef = push(leaderboardRef);
    dateScopedKey = entryRef.key;
    const entry = {
      userId: allTimeEntry.userId,
      userName: allTimeEntry.userName,
      numBoards: allTimeEntry.numBoards,
      timeMs: allTimeEntry.timeMs,
      timestamp: allTimeEntry.timestamp,
      ...(resetsDaily ? { dateKey } : {}),
    };
    await set(entryRef, entry);
  }

  const allTimePath = `leaderboard/${mode}/allTime`;
  const allTimeRef = ref(database, allTimePath);
  const allTimeEntryRef = push(allTimeRef);
  await set(allTimeEntryRef, allTimeEntry);

  return dateScopedKey ?? allTimeEntryRef.key;
}

/**
 * Fetch leaderboard entries for a specific mode
 * @param {string} mode - 'daily', 'solutionhunt', or 'marathon'
 * @param {number} numBoards - Optional: filter by number of boards
 * @param {number} limit - Maximum number of entries to fetch (default: 100)
 * @param {'today' | 'allTime'} scope - 'today' for date-scoped (or marathon) board, 'allTime' for all-time (capped at 100, entries include dateKey)
 */
export function useLeaderboard(mode, numBoards = null, limit = 100, scope = 'today') {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resetsDaily = modeResetsDaily(mode);
  const dateKey = useLocalDateKey(scope === 'today' && resetsDaily);

  useEffect(() => {
    if (!mode) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const isAllTime = scope === 'allTime';
    const basePath = isAllTime
      ? `leaderboard/${mode}/allTime`
      : resetsDaily
        ? `leaderboard/${mode}/${dateKey}`
        : `leaderboard/${mode}`;
    const leaderboardRef = ref(database, basePath);
    const effectiveLimit = isAllTime ? 100 : limit;

    // Fetch a large window: limitToLast is by key order, not timeMs, so we fetch more and sort in JS.
    const fetchSize = Math.min(Math.max(effectiveLimit * 20, 500), 2000);
    const leaderboardQuery = query(
      leaderboardRef,
      limitToLast(fetchSize)
    );

    const unsubscribe = onValue(
      leaderboardQuery,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (!data) {
            setEntries([]);
            setLoading(false);
            return;
          }

          // Convert to array and normalise numeric fields so we can safely sort
          // and render even if some historical entries are malformed.
          let entriesArray = Object.entries(data)
            .map(([key, value]) => ({
              id: key,
              ...value,
            }))
            .map((entry) => {
              const normalised = { ...entry };

              // Coerce timeMs; entries with non-finite timeMs are dropped later.
              const timeNum = Number(normalised.timeMs);
              normalised.timeMs = Number.isFinite(timeNum) ? timeNum : NaN;

              // Normalise numBoards to a number when possible so filters behave.
              const boardsNum = Number(normalised.numBoards);
              normalised.numBoards = Number.isFinite(boardsNum) ? boardsNum : null;

              // Normalise timestamp for deterministic sorting.
              const tsNum = Number(normalised.timestamp);
              normalised.timestamp = Number.isFinite(tsNum) ? tsNum : 0;

              return normalised;
            })
            .filter((entry) => Number.isFinite(entry.timeMs));

          // Filter by numBoards if specified
          if (numBoards !== null) {
            entriesArray = entriesArray.filter((entry) => entry.numBoards === numBoards);
          }

          // Sort by timeMs (ascending = faster is better), then by timestamp for ties
          entriesArray.sort((a, b) => {
            if (a.timeMs !== b.timeMs) {
              return a.timeMs - b.timeMs;
            }
            return a.timestamp - b.timestamp;
          });

          // Limit results (all-time is capped at 100)
          entriesArray = entriesArray.slice(0, effectiveLimit);

          setEntries(entriesArray);
          setLoading(false);
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [mode, numBoards, limit, scope, resetsDaily, dateKey]);

  return { entries, loading, error };
}
