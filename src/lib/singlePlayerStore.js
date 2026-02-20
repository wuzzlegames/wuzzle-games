import { loadJSON, saveJSON, makeStreakKey, loadStreak } from "./persist";
import { logError } from "./errorUtils";
import { validateGameState } from "./validation";
import { defaultStateSync } from "./stateSync";

/**
 * Load a solved snapshot for a given key, preferring server when signed in.
 * Implements conflict resolution: uses the state with the most recent timestamp.
 * Uses StateSync for conflict resolution.
 * 
 * NOTE: Firebase database is dynamically imported here (await import("firebase/database"))
 * to enable code splitting - only load Firebase when needed for signed-in users.
 * This causes a Vite warning because Firebase is also statically imported elsewhere,
 * but this is intentional for performance optimization.
 */
export async function loadSolvedState({ authUser, database, solvedKey }) {
  let remoteState = null;
  let localState = null;

  // Load remote state if available
  if (authUser && database) {
    try {
      const { ref, get } = await import("firebase/database");
      const solvedRef = ref(
        database,
        `users/${authUser.uid}/singlePlayer/solvedStates/${solvedKey}`,
      );
      const snap = await get(solvedRef);
      if (snap.exists()) {
        remoteState = snap.val() || null;
      }
    } catch (err) {
      // Remote failures should never block local play; fall back to local.
      logError(err, 'singlePlayerStore.loadSolvedState');
    }
  }

  // Load local state
  localState = loadJSON(solvedKey, null);

  // Use StateSync for conflict resolution
  const syncedState = await defaultStateSync.sync(solvedKey, localState, remoteState);

  // If synced state is from remote (newer), save it locally
  if (syncedState && syncedState === remoteState && syncedState !== localState) {
    saveJSON(solvedKey, syncedState);
  }

  // If synced state is from local (newer), sync it to remote
  if (syncedState && syncedState === localState && syncedState !== remoteState && authUser && database) {
    // Queue the sync (will retry if offline)
    defaultStateSync.queueUpdate(
      `sync-${solvedKey}`,
      async () => {
        const { ref, set } = await import("firebase/database");
        const solvedRef = ref(
          database,
          `users/${authUser.uid}/singlePlayer/solvedStates/${solvedKey}`,
        );
        await set(solvedRef, syncedState);
      },
      { type: 'solvedState', key: solvedKey }
    );
  }

  return syncedState;
}

/**
 * Save a solved snapshot locally and on the server (when signed in).
 * Uses StateSync for offline queuing and retry logic.
 */
export async function saveSolvedState({ authUser, database, solvedKey, value }) {
  // Always save locally first
  const stateWithTimestamp = value ? { ...value, timestamp: Date.now() } : null;
  saveJSON(solvedKey, stateWithTimestamp);

  if (authUser && database && value) {
    // Use StateSync to queue the update (handles offline and retries)
    defaultStateSync.queueUpdate(
      `save-${solvedKey}`,
      async () => {
        const { ref, set } = await import("firebase/database");
        const solvedRef = ref(
          database,
          `users/${authUser.uid}/singlePlayer/solvedStates/${solvedKey}`,
        );
        await set(solvedRef, stateWithTimestamp);
      },
      { type: 'solvedState', key: solvedKey }
    );
    
    // Try to process immediately if online
    if (defaultStateSync.getConnectionStatus()) {
      defaultStateSync.processQueue();
    }
  }
}

/**
 * Firebase strips empty arrays (e.g. `guesses: []` becomes missing/null).
 * Re-hydrate board-level arrays so the state passes validation.
 */
function normalizeGameState(state) {
  if (!state || typeof state !== 'object' || !Array.isArray(state.boards)) return state;
  return {
    ...state,
    boards: state.boards.map((b) => {
      if (!b || typeof b !== 'object') return b;
      return {
        ...b,
        guesses: Array.isArray(b.guesses) ? b.guesses : [],
      };
    }),
  };
}

/**
 * Load an in-progress game state with server-first semantics and conflict resolution.
 * Validates state structure and resolves conflicts using timestamps.
 */
export async function loadGameState({ authUser, database, gameStateKey }) {
  let remoteState = null;
  let remoteTimestamp = 0;
  let localState = null;
  let localTimestamp = 0;

  // Load remote state if available
  if (authUser && database) {
    try {
      const { ref, get } = await import("firebase/database");
      const stateRef = ref(
        database,
        `users/${authUser.uid}/singlePlayer/gameStates/${gameStateKey}`,
      );
      const snap = await get(stateRef);
      if (snap.exists()) {
        remoteState = normalizeGameState(snap.val() || null);
        // Validate remote state
        if (remoteState) {
          const validation = validateGameState(remoteState);
          if (!validation.isValid) {
            logError(`Invalid remote game state: ${validation.errors.join(', ')}`, 'singlePlayerStore.loadGameState');
            remoteState = null;
          } else if (typeof remoteState.timestamp === 'number') {
            remoteTimestamp = remoteState.timestamp;
          }
        }
      }
    } catch (err) {
      logError(err, 'singlePlayerStore.loadGameState');
    }
  }

  // Load local state
  localState = normalizeGameState(loadJSON(gameStateKey, null));
  if (localState) {
    // Validate local state
    const validation = validateGameState(localState);
    if (!validation.isValid) {
      logError(`Invalid local game state: ${validation.errors.join(', ')}`, 'singlePlayerStore.loadGameState');
      localState = null;
    } else if (typeof localState.timestamp === 'number') {
      localTimestamp = localState.timestamp;
    }
  }

  // Conflict resolution: prefer state with most recent timestamp
  if (remoteState && localState) {
    if (remoteTimestamp >= localTimestamp) {
      // Remote is newer or equal - use remote and sync to local
      saveJSON(gameStateKey, remoteState);
      return remoteState;
    } else {
      // Local is newer - use local and sync to remote
      if (authUser && database) {
        try {
          const { ref, set } = await import("firebase/database");
          const stateRef = ref(
            database,
            `users/${authUser.uid}/singlePlayer/gameStates/${gameStateKey}`,
          );
          await set(stateRef, localState);
        } catch (err) {
          logError(err, 'singlePlayerStore.loadGameState.sync');
        }
      }
      return localState;
    }
  }

  // Return whichever exists and is valid
  return remoteState || localState;
}

/**
 * Save an in-progress game state locally and on the server (when signed in).
 * Pass value = null to clear.
 * Uses StateSync for offline queuing and retry logic.
 */
export async function saveGameState({ authUser, database, gameStateKey, value }) {
  // Always save locally first
  const stateWithTimestamp = value ? { ...value, timestamp: Date.now() } : null;
  saveJSON(gameStateKey, stateWithTimestamp);

  if (authUser && database) {
    // Use StateSync to queue the update (handles offline and retries)
    defaultStateSync.queueUpdate(
      `save-${gameStateKey}`,
      async () => {
        const { ref, set } = await import("firebase/database");
        const stateRef = ref(
          database,
          `users/${authUser.uid}/singlePlayer/gameStates/${gameStateKey}`,
        );
        await set(stateRef, stateWithTimestamp);
      },
      { type: 'gameState', key: gameStateKey }
    );
    
    // Try to process immediately if online
    if (defaultStateSync.getConnectionStatus()) {
      defaultStateSync.processQueue();
    }
  }
}

/**
 * Load a streak with server-first semantics and mirror into local storage.
 */
export async function loadStreakRemoteAware({ authUser, database, mode, speedrunEnabled }) {
  const modeKey = mode === "daily" ? "daily" : "marathon";
  const variantKey = speedrunEnabled ? "speedrun" : "standard";
  const remoteKey = `${modeKey}_${variantKey}`;
  const localKey = makeStreakKey(mode, speedrunEnabled);

  if (!authUser || !database) {
    return loadJSON(localKey, null);
  }

  try {
    const { ref, get } = await import("firebase/database");
    const streakRef = ref(database, `users/${authUser.uid}/streaks/${remoteKey}`);
    const snap = await get(streakRef);
    if (!snap.exists()) {
      const local = loadJSON(localKey, null);
      const hasData =
        local &&
        ((typeof local.current === "number" && local.current > 0) ||
          (typeof local.best === "number" && local.best > 0));
      if (hasData) {
        await saveStreakRemoteAware({
          authUser,
          database,
          mode,
          speedrunEnabled,
          streakInfo: {
            current: local.current,
            best: local.best,
            lastDate: local.lastDate || null,
          },
        });
      }
      return local;
    }
    const remote = snap.val() || null;
    if (!remote) return loadJSON(localKey, null);

    saveJSON(localKey, remote);
    return remote;
  } catch (err) {
    logError(err, 'singlePlayerStore.loadStreakRemoteAware');
    return loadJSON(localKey, null);
  }
}

/**
 * Save a streak both locally and (when signed in) in the user's streaks subtree.
 */
export async function saveStreakRemoteAware({
  authUser,
  database,
  mode,
  speedrunEnabled,
  streakInfo,
}) {
  const localKey = makeStreakKey(mode, speedrunEnabled);
  saveJSON(localKey, streakInfo);

  if (!authUser || !database) return;

  const modeKey = mode === "daily" ? "daily" : "marathon";
  const variantKey = speedrunEnabled ? "speedrun" : "standard";
  const remoteKey = `${modeKey}_${variantKey}`;

  try {
    const { ref, set } = await import("firebase/database");
    const streakRef = ref(database, `users/${authUser.uid}/streaks/${remoteKey}`);
    await set(streakRef, streakInfo);
  } catch (err) {
    logError(err, 'singlePlayerStore.saveStreakRemoteAware');
  }
}

/**
 * Sync local streaks to Firebase when user logs in and remote is missing.
 * Ensures guest-play streaks are persisted after sign-in.
 * Only uploads when remote has no data for that variant—never overwrites
 * higher remote values with lower local ones.
 * @param {{ uid: string }} authUser
 * @param {object} database
 */
export async function syncLocalStreaksToRemoteOnLogin(authUser, database) {
  if (!authUser?.uid || !database) return;

  const variants = [
    { mode: "daily", speedrunEnabled: false },
    { mode: "daily", speedrunEnabled: true },
    { mode: "marathon", speedrunEnabled: false },
    { mode: "marathon", speedrunEnabled: true },
  ];

  try {
    const { ref, get } = await import("firebase/database");
    const streaksRef = ref(database, `users/${authUser.uid}/streaks`);
    const snap = await get(streaksRef);
    const remote = snap.exists() ? snap.val() || {} : {};

    const modeKey = (m) => (m === "daily" ? "daily" : "marathon");
    const variantKey = (v) => (v ? "speedrun" : "standard");
    const remoteKey = (m, v) => `${modeKey(m)}_${variantKey(v)}`;

    for (const { mode, speedrunEnabled } of variants) {
      const key = remoteKey(mode, speedrunEnabled);
      if (remote[key]) continue; // Never overwrite existing remote data

      const local = loadStreak(mode, speedrunEnabled);
      const hasData =
        (typeof local.current === "number" && local.current > 0) ||
        (typeof local.best === "number" && local.best > 0);
      if (!hasData) continue;

      await saveStreakRemoteAware({
        authUser,
        database,
        mode,
        speedrunEnabled,
        streakInfo: {
          current: local.current,
          best: local.best,
          lastDate: local.lastDate || null,
        },
      });
    }
  } catch (err) {
    logError(err, "singlePlayerStore.syncLocalStreaksToRemoteOnLogin");
  }
}
