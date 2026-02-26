import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ref, set, onValue, off, remove, update, get, runTransaction } from 'firebase/database';
import { database } from '../config/firebase';
import { auth } from '../config/firebase';
import { MULTIPLAYER_WAITING_TIMEOUT_MS, getSolutionArray } from '../lib/multiplayerConfig';
import { clampBoards, clampPlayers, validateGameCode } from '../lib/validation';
import { MAX_BOARDS, ABSOLUTE_MAX_PLAYERS, DEFAULT_MAX_PLAYERS, SPEEDRUN_COUNTDOWN_MS } from '../lib/gameConstants';
import { logError } from '../lib/errorUtils';
import { grantBadge } from '../lib/badgeService';
import { getBadgeById } from '../lib/badges';
import { badgeEarnedToastRef } from '../contexts/BadgeEarnedToastContext';

const GAME_NOT_FOUND_HINT =
  'Ensure VITE_FIREBASE_DATABASE_URL in .env matches your Firebase Console Realtime Database URL.';

/** Message shown to guests when the host closes the room (path removed). */
export const ROOM_CLOSED_MESSAGE = 'This room has been closed.';

const BOOTSTRAP_CACHE_KEY_PREFIX = 'multiplayer_bootstrap_';

function getBootstrapFromStorage(code) {
  try {
    const key = BOOTSTRAP_CACHE_KEY_PREFIX + String(code);
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    }
  } catch {
    return null;
  }
  return null;
}

function setBootstrapInStorage(code, data) {
  try {
    if (data && typeof data === 'object' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(BOOTSTRAP_CACHE_KEY_PREFIX + String(code), JSON.stringify(data));
    }
  } catch {
    // ignore
  }
}

/**
 * Generate a random 6-digit game code
 */
function generateGameCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Multiplayer limits for rooms generalized to N players.
// Constants are now imported from gameConstants.js

/**
 * Hook for managing multiplayer game state in Firebase Realtime Database
 */
export function useMultiplayerGame(gameCode = null, isHost = false, speedrun = false, initialGameState = null) {
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const gameRef = useRef(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const effectRunIdRef = useRef(0);
  const dataReceivedRef = useRef(false);
  const user = auth.currentUser;

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Listener cleanup is handled via the unsubscribe function returned from
      // onValue in the gameState subscription effect; we simply clear the ref.
      gameRef.current = null;
    };
  }, []);

  // Listen to game state changes: initial get() for deterministic feedback, then onValue for live updates
  const CONNECTION_TIMEOUT_MS = 10000;

  useEffect(() => {
    if (!gameCode) return;

    isMountedRef.current = true;

    const gamePath = `multiplayer/${gameCode}`;
    const dbRef = ref(database, gamePath);
    gameRef.current = dbRef;

    let cancelled = false;
    const runId = ++effectRunIdRef.current;
    const hasInitialState = initialGameState && typeof initialGameState === 'object';
    dataReceivedRef.current = false;

    const timeoutId = setTimeout(() => {
      if (effectRunIdRef.current !== runId || cancelled) return;
      if (dataReceivedRef.current) return;
      setError('Connection timed out. Please check your connection and try again.');
      setLoading(false);
    }, CONNECTION_TIMEOUT_MS);

    const successCallback = (snapshot) => {
      const data = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : null;
      clearTimeout(timeoutId);
      if (data == null) {
        if (!isMountedRef.current) return;
        setGameState(null);
        setLoading(false);
        setError(ROOM_CLOSED_MESSAGE);
        return;
      }
      dataReceivedRef.current = true;
      setBootstrapInStorage(gameCode, data);
      setGameState(data);
      setLoading(false);
      setError(null);
    };

    const errorCallback = (err) => {
      if (!isMountedRef.current) return;
      setError(err.message);
      setLoading(false);
    };

    // Attach listener synchronously so it is always present (onValue fires with current value when attached)
    unsubscribeRef.current = onValue(dbRef, successCallback, errorCallback);

    // When we have initialGameState, set it so host/guest see the room immediately even if get() bails later
    // immediately even if get() bails later (e.g. isMountedRef false after Strict Mode unmount).
    // The listener will still overwrite with latest data when it fires.
    if (initialGameState && typeof initialGameState === 'object') {
      setBootstrapInStorage(gameCode, initialGameState);
      setGameState(initialGameState);
      setLoading(false);
      setError(null);
      clearTimeout(timeoutId);
    } else {
      const cached = getBootstrapFromStorage(gameCode);
      if (cached && typeof cached === 'object') {
        setGameState(cached);
        setLoading(false);
        setError(null);
        clearTimeout(timeoutId);
      } else {
        setLoading(true);
        setError(null);
      }
    }

    (async () => {
      try {
        const snapshot = await get(dbRef);
        if (cancelled) return;
        if (!snapshot.exists()) {
          if (!isMountedRef.current) return;
          if (!hasInitialState) {
            clearTimeout(timeoutId);
            setGameState(null);
            setError(ROOM_CLOSED_MESSAGE);
            setLoading(false);
            return;
          }
          clearTimeout(timeoutId);
          // Host just created the room; keep state/error as-is, still subscribe for future updates
        } else {
          clearTimeout(timeoutId);
          if (dataReceivedRef.current) return;
          dataReceivedRef.current = true;
          const val = snapshot.val();
          setBootstrapInStorage(gameCode, val);
          setGameState(val);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (cancelled || !isMountedRef.current) return;
        setError(err.message);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      } else {
        off(dbRef);
      }
    };
  }, [gameCode]);

/**
 * Create a new game (host)
 *
 * `options.speedrun` (optional) can override the hook's default `speedrun` flag
 * so callers (e.g., friend challenges) can configure per-game mode.
 *
 * `options.maxPlayers` and `options.isPublic` configure the room. These are
 * stored on the game object so other clients can discover/join via an
 * "Open Rooms" list.
 */
const createGame = useCallback(async (options = {}) => {
    if (!user) throw new Error('User must be signed in to host a game');

    // Determine effective variant - support both legacy speedrun flag and new variant field
    // Variants: 'standard', 'speedrun', 'solutionhunt', 'solutionhunt_speedrun'
    const effectiveVariant = Object.prototype.hasOwnProperty.call(options, 'variant')
      ? options.variant
      : options.solutionHunt && (options.speedrun || speedrun)
      ? 'solutionhunt_speedrun'
      : options.solutionHunt
      ? 'solutionhunt'
      : options.speedrun || speedrun
      ? 'speedrun'
      : 'standard';
    
    const effectiveSpeedrun = effectiveVariant === 'speedrun' || effectiveVariant === 'solutionhunt_speedrun';
    const effectiveSolutionHunt = effectiveVariant === 'solutionhunt' || effectiveVariant === 'solutionhunt_speedrun';

    const rawMaxPlayers = Number.isFinite(options.maxPlayers)
      ? options.maxPlayers
      : DEFAULT_MAX_PLAYERS;
    const maxPlayers = clampPlayers(rawMaxPlayers, DEFAULT_MAX_PLAYERS, ABSOLUTE_MAX_PLAYERS);
    const isPublic = Object.prototype.hasOwnProperty.call(options, 'isPublic')
      ? !!options.isPublic
      : true;

    // Boards configuration for this room (used for waiting-room display and first round).
    // Solution Hunt is always 1 board.
    const rawBoards = effectiveSolutionHunt ? 1 : (Number.isFinite(options.boards) ? options.boards : 1);
    const configBoards = clampBoards(rawBoards);

    const challengeOnly = options.challengeOnly === true;

    const code = generateGameCode();
    const gamePath = `multiplayer/${code}`;

    const hostName = user.displayName || user.email || 'Player 1';
    const now = Date.now();

    const gameData = {
      status: 'waiting', // waiting, ready, playing, finished
      solution: null,
      solutions: [], // Array of solutions (one per board)
      winner: null, // Will be set to a uid when a player wins, or 'draw' for ties
      variant: effectiveVariant, // Game mode variant: 'standard', 'speedrun', 'solutionhunt'
      speedrun: effectiveSpeedrun, // Whether speedrun mode is enabled (for backward compatibility)
      solutionHunt: effectiveSolutionHunt, // Whether solution hunt mode is enabled
      createdAt: now,
      startedAt: null,
      hostId: user.uid, // Set hostId for Firebase security rules
      // Multiplayer room settings
      maxPlayers,
      isPublic,
      configBoards,
      ...(challengeOnly && { challengeOnly: true }),
      // All game state lives in the players map
      players: {
        [user.uid]: {
          id: user.uid,
          name: hostName,
          isHost: true,
          ready: false,
          joinedAt: now,
          guesses: [],
          colors: [], // Colors for each guess (for opponent to see)
          timeMs: null,
          startTime: null,
        },
      },
    };

    try {
      await set(ref(database, gamePath), gameData);
      grantBadge({ database, uid: user.uid, badgeId: 'party_starter' }).then((grantedIds) => {
        if (grantedIds?.length > 0) {
          const def = getBadgeById('party_starter');
          if (def && badgeEarnedToastRef.current) badgeEarnedToastRef.current(def);
        }
      }).catch((err) =>
        logError(err, 'useMultiplayerGame.grantBadge')
      );
      return { code, gameData };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user, speedrun]);

/**
   * Join an existing game/room.
   *
   * This supports N players via the `players` map and `maxPlayers`.
   */
  const joinGame = useCallback(async (code) => {
    if (!user) throw new Error('User must be signed in to join a game');

    // Validate game code format
    const codeValidation = validateGameCode(code);
    if (!codeValidation.isValid) {
      throw new Error(`Invalid game code: ${codeValidation.errors.join(', ')}`);
    }

    const codeToUse = codeValidation.value ?? code;
    const gamePath = `multiplayer/${codeToUse}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error(`Game code not found at path: ${gamePath}. ${GAME_NOT_FOUND_HINT}`);
      }

      let gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || null;

      // If user is already part of the room (in players map), allow them to continue.
      if (players && players[user.uid]) {
        return { code: codeToUse, gameData };
      }

      const status = gameData.status || 'waiting';
      const rawMaxPlayers = Number.isFinite(gameData.maxPlayers)
        ? gameData.maxPlayers
        : DEFAULT_MAX_PLAYERS;
      const maxPlayers = clampPlayers(rawMaxPlayers, DEFAULT_MAX_PLAYERS, ABSOLUTE_MAX_PLAYERS);
      const createdAt = typeof gameData.createdAt === 'number' ? gameData.createdAt : null;

      // Expire stale rooms (waiting or playing) after the total lifetime window.
      if (createdAt && Date.now() - createdAt > MULTIPLAYER_WAITING_TIMEOUT_MS) {
        try {
          await remove(gameDataRef);
        } catch (e) {
          // best-effort cleanup; ignore errors
        }
        throw new Error('Game code has expired');
      }

      // Use transaction to prevent race conditions when multiple players join simultaneously
      await runTransaction(gameDataRef, (currentData) => {
        if (!currentData) {
          return {}; // Force retry: server will send real value, callback runs again
        }

        const currentPlayers = currentData.players || null;
        const currentStatus = currentData.status || 'waiting';

        // Check if user is already in the game
        if (currentPlayers && currentPlayers[user.uid]) {
          return currentData; // Already joined, return current data
        }

        // Check if game is full
        if (currentPlayers) {
          const activeIds = Object.keys(currentPlayers);
          if (activeIds.length >= maxPlayers) {
            throw new Error('Game is full');
          }
        }

        // No one can join once the game has started
        if (currentStatus !== 'waiting') {
          throw new Error('Game has already started');
        }

        // Add player to game
        const now = Date.now();
        const displayName = user.displayName || user.email || 'Player';

        return {
          ...currentData,
          players: {
            ...(currentPlayers || {}),
            [user.uid]: {
              id: user.uid,
              name: displayName,
              isHost: false,
              ready: false,
              joinedAt: now,
              guesses: [],
              timeMs: null,
              startTime: null,
            },
          },
        };
      });

      // Re-read so guest gets state that includes themselves (same as host getting initial state from createGame)
      const afterSnapshot = await get(gameDataRef);
      const finalGameData = afterSnapshot.exists() ? afterSnapshot.val() : gameData;
      return { code: codeToUse, gameData: finalGameData };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

/**
   * Set ready status for the current user.
   *
   * Updates the per-player ready flag in the players map.
   */
  const setReady = useCallback(async (code, ready = true) => {
    if (!user) throw new Error('User must be signed in');

    const codeValidation = validateGameCode(code);
    if (!codeValidation.isValid) {
      throw new Error(`Invalid game code: ${codeValidation.errors.join(', ')}`);
    }

    const codeToUse = codeValidation.value ?? code;
    const gamePath = `multiplayer/${codeToUse}`;
    const gameDataRef = ref(database, gamePath);

    try {
      await runTransaction(gameDataRef, (currentData) => {
        if (!currentData) {
          return {}; // Force retry: server will send real value, callback runs again
        }

        const players = currentData.players || null;

        if (!players || !players[user.uid]) {
          throw new Error('Player not in game');
        }

        return {
          ...currentData,
          players: {
            ...players,
            [user.uid]: {
              ...players[user.uid],
              ready,
            },
          },
        };
      });
      // Optimistic update: onValue may not fire for the writing client, so update local state so host UI reflects ready immediately
      setGameState((prev) => {
        if (!prev || !prev.players || !prev.players[user.uid]) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [user.uid]: { ...prev.players[user.uid], ready },
          },
        };
      });
    } catch (err) {
      const errorMessage = err.message || 'Failed to set ready status';
      setError(errorMessage);
      logError(err, 'useMultiplayerGame.setReady');
      throw err;
    }
  }, [user]);

/**
   * Start the game with one or more solution words.
   * Also clears any previous round state (guesses, colors, winner, timers, rematch flags).
   * - `solutionsOrSolution` may be a single word (string) or an array of words.
   * - `options.speedrun` (optional) can override the `speedrun` flag stored on the game.
   */
  const startGame = useCallback(async (code, solutionsOrSolution, options = {}) => {
    if (!user) throw new Error('User must be signed in');

    const codeValidation = validateGameCode(code);
    if (!codeValidation.isValid) {
      throw new Error(`Invalid game code: ${codeValidation.errors.join(', ')}`);
    }

    const codeToUse = codeValidation.value ?? code;
    const gamePath = `multiplayer/${codeToUse}`;
    const gameDataRef = ref(database, gamePath);

    try {
      await runTransaction(gameDataRef, (currentData) => {
        if (!currentData) {
          return {}; // Force retry: server will send real value, callback runs again
        }

        const players = currentData.players || null;
        const isHost = players && players[user.uid]?.isHost;
        if (!isHost) {
          throw new Error('Only host can start the game');
        }
        if (!players) {
          throw new Error('Invalid game state: no players map found');
        }

        // Check if all players are ready
        const playerValues = Object.values(players);
        const allReady =
          playerValues.length > 0 &&
          playerValues.every((p) => (p && typeof p.ready === 'boolean' ? p.ready : false));
        if (!allReady) {
          throw new Error('All players must be ready to start');
        }

        // Check if game is already started
        if (currentData.status === 'playing') {
          throw new Error('Game has already started');
        }

        // Decide game mode for this round. Allow explicit overrides via options
        // so hosts can change modes between rounds.
        const hasOverrideSpeedrun = Object.prototype.hasOwnProperty.call(options, 'speedrun');
        const hasOverrideSolutionHunt = Object.prototype.hasOwnProperty.call(options, 'solutionHunt');
        const hasOverrideVariant = Object.prototype.hasOwnProperty.call(options, 'variant');
        
        const isSpeedrunRound = hasOverrideSpeedrun ? !!options.speedrun : !!currentData.speedrun;
        const isSolutionHuntRound = hasOverrideSolutionHunt ? !!options.solutionHunt : !!currentData.solutionHunt;
        const variantForRound = hasOverrideVariant ? options.variant : currentData.variant;

        const now = Date.now();

        const solutionsArray = Array.isArray(solutionsOrSolution)
          ? solutionsOrSolution
          : [solutionsOrSolution];

        // Update players map - clear guesses and reset timers
        const updatedPlayers = {};
        Object.keys(players).forEach((pid) => {
          const p = players[pid] || {};
          updatedPlayers[pid] = {
            ...p,
            guesses: [],
            timeMs: null,
            startTime: isSpeedrunRound ? now : null,
            rematch: false, // Clear rematch flags when starting new game
            // keep existing ready flag as-is so lobby state is preserved in history
          };
        });

        // Return updated game state
        return {
          ...currentData,
          status: 'playing',
          solution: solutionsArray[0],
          solutions: solutionsArray,
          variant: variantForRound,
          speedrun: isSpeedrunRound,
          solutionHunt: isSolutionHuntRound,
          startedAt: now,
          winner: null,
          players: updatedPlayers,
          // Clear next game config when starting a new game
          nextGameConfig: null,
        };
      });

      // Re-read and set state so host UI updates immediately (same pattern as setReady / guest join)
      const afterSnapshot = await get(gameDataRef);
      if (afterSnapshot.exists()) {
        setGameState(afterSnapshot.val());
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

/**
   * Submit a guess.
   * All players may submit guesses at any time (no turn enforcement).
   */
  const submitGuess = useCallback(async (code, guess, colors) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || null;
      
      if (!players) {
        throw new Error('Invalid game state: no players map found');
      }
      
      const playerCount = Object.keys(players).length;

      const hostEntry = Object.values(players).find((p) => p && p.isHost) || null;
      const isHost = !!(hostEntry && hostEntry.id === user.uid);
      const isSpeedrun = gameData.speedrun || false;

      const now = Date.now();

      // Normalize to an array of solutions so we can correctly determine
      // when a player has finished *all* boards in multi-board speedrun.
      const solutionArray = getSolutionArray(gameData);

      const updateData = {};

      // Update per-player guesses when using the players map.
      if (players && players[user.uid]) {
        const playerRecord = players[user.uid];
        const newGuesses = [...(playerRecord.guesses || []), guess];
        updateData[`players/${user.uid}/guesses`] = newGuesses;
        updateData[`players/${user.uid}/colors`] = [...(playerRecord.colors || []), colors];

        // Multi-player speedrun timing: track timeMs per player.
        // Timer starts after 3-2-1 countdown, so use effectiveStart = startedAt + 3000.
        if (isSpeedrun && solutionArray.length > 0 && !playerRecord.timeMs) {
          const solvedAll = solutionArray.every((sol) => newGuesses.includes(sol));
          if (solvedAll) {
            const startedAt = gameData.startedAt;
            const effectiveStart = startedAt != null ? startedAt + SPEEDRUN_COUNTDOWN_MS : now;
            const elapsed = Math.max(0, now - effectiveStart);
            updateData[`players/${user.uid}/timeMs`] = elapsed;
          }
        }
      } else {
        // All games now use the players map.
        throw new Error('Invalid game state: no players map found');
      }

      await update(gameDataRef, updateData);

      const afterSnapshot = await get(gameDataRef);
      if (afterSnapshot.exists()) {
        setGameState(afterSnapshot.val());
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * No-op: there is no turn-based mode; all players may guess at any time.
   * Kept for API compatibility.
   */
  const switchTurn = useCallback(async () => {
    // No turn enforcement; everyone can guess anytime.
  }, []);

  /**
   * Set game winner
   */
  const setWinner = useCallback(async (code, winner) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);
      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }
      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }

      await update(gameDataRef, {
        status: 'finished',
        winner: winner,
        hostId: gameData.hostId  // Preserve hostId
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Update friendRequestStatus for this multiplayer game (e.g. 'pending', 'declined').
   * We also track who initiated the request in `friendRequestFrom` so that only
   * that player sees their button disabled.
   */
  const setFriendRequestStatus = useCallback(async (code, status) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || {};
      const isHost = players[user.uid]?.isHost === true;

      if (status === 'pending') {
        const updateData = {
          friendRequestStatus: 'pending',
          // Track who initiated the request so UIs can distinguish requester
          // vs recipient if needed.
          friendRequestFrom: user.uid,
        };
        // Set the appropriate flag based on whether the user is host or guest
        if (isHost) {
          updateData.hostFriendRequestSent = true;
          updateData.guestFriendRequestSent = false;
        } else {
          updateData.guestFriendRequestSent = true;
          updateData.hostFriendRequestSent = false;
        }
        updateData.hostId = gameData.hostId; // Preserve hostId
        await update(gameDataRef, updateData);
      } else if (status === 'declined') {
        await update(gameDataRef, {
          friendRequestStatus: null,
          friendRequestFrom: null,
          hostFriendRequestSent: false,
          guestFriendRequestSent: false,
          hostId: gameData.hostId  // Preserve hostId
        });
      } else {
        // Fallback / explicit clear.
        await update(gameDataRef, {
          friendRequestStatus: null,
          friendRequestFrom: null,
          hostId: gameData.hostId  // Preserve hostId
        });
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Player requests a rematch. Sets their rematch flag in the players map;
   * Game component is responsible for starting a new round when all players have rematch set.
   */
  const requestRematch = useCallback(async (code) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || null;

      // All games now use the players map
      if (!players || !players[user.uid]) {
        throw new Error('Player not in game');
      }
      
      await update(gameDataRef, {
        [`players/${user.uid}/rematch`]: true,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Update the room's display name.
   */
  const setRoomName = useCallback(async (code, roomName) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);
      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }
      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || {};
      if (!players[user.uid]?.isHost) {
        throw new Error('Only the host can update the room name');
      }

      const trimmed = (roomName || '').toString().slice(0, 80).trim();
      await update(gameDataRef, {
        roomName: trimmed || null,
        hostId: gameData.hostId  // Preserve hostId
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Update the next game configuration (for rematch).
   * Only host can update this.
   */
  const setNextGameConfig = useCallback(async (code, config) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);
      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || {};
      if (!players[user.uid]?.isHost) {
        throw new Error('Only host can update game configuration');
      }

      const updateData = {};
      if (config === null) {
        // Clear the config
        updateData.nextGameConfig = null;
      } else {
        // Determine effective variant
        // Variants: 'standard', 'speedrun', 'solutionhunt', 'solutionhunt_speedrun'
        const variant = config.variant || (
          config.solutionHunt && config.speedrun ? 'solutionhunt_speedrun' :
          config.solutionHunt ? 'solutionhunt' :
          config.speedrun ? 'speedrun' :
          'standard'
        );
        const isSolutionHuntVariant = variant === 'solutionhunt' || variant === 'solutionhunt_speedrun';
        // Set the config
        updateData.nextGameConfig = {
          numBoards: isSolutionHuntVariant ? 1 : (Number.isFinite(config.numBoards) ? clampBoards(config.numBoards) : null),
          variant: variant,
          speedrun: variant === 'speedrun' || variant === 'solutionhunt_speedrun',
          solutionHunt: isSolutionHuntVariant,
        };
      }

      updateData.hostId = gameData.hostId; // Preserve hostId
      await update(gameDataRef, updateData);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Reset game back to waiting state (used if players abandon or restart lobby).
   * NOTE: Normal rematch flow should prefer rematch flags + startGame instead of this.
   */
  const resetGame = useCallback(async (code) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || null;

      let updatedPlayers = players || null;
      if (players) {
        updatedPlayers = {};
        Object.keys(players).forEach((pid) => {
          const p = players[pid] || {};
          updatedPlayers[pid] = {
            ...p,
            ready: false,
            guesses: [],
            timeMs: null,
            startTime: null,
          };
        });
      }

      const updatePayload = {
        status: 'waiting',
        solution: null,
        solutions: [],
        currentTurn: null,
        winner: null,
        startedAt: null,
        rematchRequested: false,
        // Keep speedrun flag and hostId
        hostId: gameData.hostId,
      };

      if (updatedPlayers) {
        updatePayload.players = updatedPlayers;
      }

      await update(gameDataRef, updatePayload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  /**
   * Leave/delete game
   */
  const leaveGame = useCallback(async (code) => {
    if (!code) return;

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      if (user) {
        const snapshot = await get(gameDataRef);

        if (snapshot.exists()) {
          const gameData = snapshot.val();
          if (!gameData || typeof gameData !== 'object') {
            return;
          }
          const players = gameData.players || null;
          const isHost = players && players[user.uid]?.isHost === true;

          if (isHost) {
            // If the host leaves, delete the room entirely (current behavior).
            await remove(gameDataRef);
            return;
          }

          const updatePayload = {};

          // Remove from players map for multiplayer rooms.
          if (players && players[user.uid]) {
            const updatedPlayers = { ...players };
            delete updatedPlayers[user.uid];
            updatePayload.players = updatedPlayers;

            if (Object.keys(updatePayload).length > 0) {
              await update(gameDataRef, updatePayload);
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    }
  }, [user]);

  /**
   * Hard-expire a room by deleting it entirely when its lifetime elapses.
   */
  const expireGame = useCallback(async (code) => {
    if (!code) return;
    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);
    try {
      await remove(gameDataRef);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  /**
   * Update room configuration while in the waiting room.
   * Only the host can call this, and only while status === 'waiting'.
   */
  const updateConfig = useCallback(async (code, config = {}) => {
    if (!user) throw new Error('User must be signed in');

    const gamePath = `multiplayer/${code}`;
    const gameDataRef = ref(database, gamePath);

    try {
      const snapshot = await get(gameDataRef);

      if (!snapshot.exists()) {
        throw new Error('Game not found');
      }

      const gameData = snapshot.val();
      if (!gameData || typeof gameData !== 'object') {
        throw new Error('Invalid game state');
      }
      const players = gameData.players || {};
      if (!players[user.uid]?.isHost) {
        throw new Error('Only the host can update room settings');
      }
      if (gameData.status !== 'waiting') {
        throw new Error('Settings can only be changed before the game starts');
      }

      const playerCount = Object.keys(players).length || 1;

      const updatePayload = {};

      // Handle variant field (takes precedence over separate speedrun/solutionHunt flags)
      // Variants: 'standard', 'speedrun', 'solutionhunt', 'solutionhunt_speedrun'
      if (Object.prototype.hasOwnProperty.call(config, 'variant')) {
        const variant = config.variant;
        const isSolutionHuntVariant = variant === 'solutionhunt' || variant === 'solutionhunt_speedrun';
        updatePayload.variant = variant;
        updatePayload.speedrun = variant === 'speedrun' || variant === 'solutionhunt_speedrun';
        updatePayload.solutionHunt = isSolutionHuntVariant;
        
        // Solution Hunt variants are always 1 board
        if (isSolutionHuntVariant) {
          updatePayload.configBoards = 1;
        }
      } else {
        // Legacy support: handle separate flags
        if (Object.prototype.hasOwnProperty.call(config, 'speedrun')) {
          updatePayload.speedrun = !!config.speedrun;
        }
        if (Object.prototype.hasOwnProperty.call(config, 'solutionHunt')) {
          updatePayload.solutionHunt = !!config.solutionHunt;
          if (config.solutionHunt) {
            updatePayload.configBoards = 1;
          }
        }
      }

      // Boards config (only if not already set by solutionhunt)
      if (Object.prototype.hasOwnProperty.call(config, 'boards') && !updatePayload.configBoards) {
        const rawBoards = parseInt(config.boards, 10);
        updatePayload.configBoards = Number.isFinite(rawBoards) ? clampBoards(rawBoards) : 1;
      }

      if (Object.prototype.hasOwnProperty.call(config, 'maxPlayers')) {
        const rawMax = parseInt(config.maxPlayers, 10);
        if (!Number.isFinite(rawMax)) {
          throw new Error('Invalid maxPlayers value');
        }
        const clampedMax = clampPlayers(rawMax, DEFAULT_MAX_PLAYERS, ABSOLUTE_MAX_PLAYERS);
        if (clampedMax < playerCount) {
          throw new Error('Max players cannot be less than current players in room');
        }
        updatePayload.maxPlayers = clampedMax;
      }

      if (Object.prototype.hasOwnProperty.call(config, 'isPublic')) {
        updatePayload.isPublic = !!config.isPublic;
      }

      if (Object.keys(updatePayload).length === 0) {
        return;
      }

      // Preserve hostId to maintain game ownership
      updatePayload.hostId = gameData.hostId;

      await update(gameDataRef, updatePayload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  return useMemo(() => ({
    gameState,
    error,
    loading,
    createGame,
    joinGame,
    setReady,
    startGame,
    submitGuess,
    switchTurn,
    setWinner,
    setFriendRequestStatus,
    requestRematch,
    setRoomName,
    setNextGameConfig,
    resetGame,
    leaveGame,
    expireGame,
    updateConfig,
  }), [gameState, error, loading, createGame, joinGame, setReady, startGame, submitGuess, switchTurn, setWinner, setFriendRequestStatus, requestRematch, setRoomName, setNextGameConfig, resetGame, leaveGame, expireGame, updateConfig]);
}

