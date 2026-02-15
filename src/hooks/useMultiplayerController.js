import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadWordLists } from '../lib/wordLists';
import { getMaxTurns, scoreGuess } from '../lib/wordle';
import { SeededRandom } from '../lib/dailyWords';
import { clampBoards, clampPlayers } from '../lib/validation';
import { MAX_BOARDS, ABSOLUTE_MAX_PLAYERS, DEFAULT_MAX_PLAYERS, MESSAGE_TIMEOUT_MS, LONG_MESSAGE_TIMEOUT_MS, VERIFICATION_MESSAGE_TIMEOUT_MS, CONFIG_MESSAGE_TIMEOUT_MS } from '../lib/gameConstants';
import { getSolutionArray } from '../lib/multiplayerConfig';
import { formatError, logError } from '../lib/errorUtils';

/** Derive a numeric seed from a string (e.g. alphanumeric game code) for SeededRandom. */
function hashStringToNumber(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h | 0;
  }
  return Math.abs(h);
}

/**
 * Central controller for multiplayer mode. Encapsulates:
 * - initialisation/joining/hosting of games
 * - syncing local multi-board state from Firebase gameState
 * - winner + auto-rematch logic
 * - popup-after-flip timing
 * - multiplayer-specific handlers and friend-request helpers
 */
export function useMultiplayerController({
  // Mode / routing
  isMultiplayer,
  isHost,
  gameCode,
  gameVariant, // 'standard' | 'speedrun' | 'solutionhunt'
  boardsParam,
  numBoards,
  maxPlayersParam,
  isPublicParam,

  // Auth / user
  authUser,
  isVerifiedUser,

  // Multiplayer game hook instance
  multiplayerGame,

  // Shared state & setters owned by Game.jsx
  boards,
  setBoards,
  maxTurns,
  setMaxTurns,
  allowedSet,
  setAllowedSet,
  setIsUnlimited,
  setIsLoading,
  setShowPopup,
  setCurrentGuess,
  setIsFlipping,
  revealId,
  isFlipping,

  // Navigation / messaging
  navigate,
  setTimedMessage,

  // Multiplayer-only refs from Game.jsx (used for winner/popup coordination)
  endingGameRef,
  popupClosedRef,
  shouldShowPopupAfterFlipRef,

  // Friend system helpers
  sendFriendRequest,
  cancelSentChallenge,

  // Game config limits
  maxMultiplayerBoards,

  // Called when host creates a game; parent can store { code, gameData } for initial state
  onGameCreated,
  // Called when guest joins a game; parent can store { code, gameData } for initial state (same as host)
  onGameJoined,
}) {
  // Internal next-round configuration selected from the end-of-game UI.
  // When null, rematches reuse the previous board count & variant.
  const [multiplayerNextConfig, setMultiplayerNextConfig] = useState(null);

  // Guard to ensure we only create a new room once per controller instance,
  // even if React StrictMode or changing dependencies cause initMultiplayer to
  // run multiple times.
  const hasHostedGameRef = useRef(false);

  // Host-only multiplayer configuration modal state.
  const [isMultiplayerConfigModalOpen, setIsMultiplayerConfigModalOpen] = useState(false);
  const [multiplayerConfigBoardsDraft, setMultiplayerConfigBoardsDraft] = useState(1);
  const [multiplayerConfigVariantDraft, setMultiplayerConfigVariantDraft] = useState('standard');

  // Sync modal draft values when Firebase config changes (so guests see host's updates)
  useEffect(() => {
    if (!isMultiplayer || !multiplayerGame.gameState) return;
    const firebaseConfig = multiplayerGame.gameState.nextGameConfig;
    
    // Only update if modal is open (so we don't interfere with user's edits)
    if (isMultiplayerConfigModalOpen && firebaseConfig) {
      if (Number.isFinite(firebaseConfig.numBoards)) {
        setMultiplayerConfigBoardsDraft(firebaseConfig.numBoards);
      }
      if (firebaseConfig.variant) {
        setMultiplayerConfigVariantDraft(firebaseConfig.variant);
      } else if (typeof firebaseConfig.speedrun === 'boolean') {
        // Backward compatibility: convert old speedrun boolean to variant
        setMultiplayerConfigVariantDraft(firebaseConfig.speedrun ? 'speedrun' : 'standard');
      }
    }
  }, [
    isMultiplayer,
    multiplayerGame.gameState && multiplayerGame.gameState.nextGameConfig,
    isMultiplayerConfigModalOpen,
  ]);

  // Close config modal when game starts (for guests who have it open)
  useEffect(() => {
    if (!isMultiplayer || !multiplayerGame.gameState) return;
    const status = multiplayerGame.gameState.status;
    
    // Close modal when game status changes to 'playing'
    if (status === 'playing' && isMultiplayerConfigModalOpen) {
      setIsMultiplayerConfigModalOpen(false);
    }
  }, [
    isMultiplayer,
    multiplayerGame.gameState && multiplayerGame.gameState.status,
    isMultiplayerConfigModalOpen,
  ]);

  // Helper: derive a stable players array from gameState using players map only.
  const getPlayersArray = (gs) => {
    if (!gs || !gs.players || typeof gs.players !== 'object') {
      return [];
    }
    
    return Object.values(gs.players).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: !!p.isHost,
      ready: !!p.ready,
      guesses: Array.isArray(p.guesses) ? p.guesses : [],
      timeMs: typeof p.timeMs === 'number' ? p.timeMs : null,
      rematch: !!p.rematch,
    }));
  };

  const getCurrentPlayerGuesses = (gs) => {
    if (!gs || !authUser || !gs.players) return [];
    if (gs.players[authUser.uid] && Array.isArray(gs.players[authUser.uid].guesses)) {
      return gs.players[authUser.uid].guesses;
    }
    return [];
  };

  const getOpponentGuesses = (gs) => {
    if (!gs || !authUser || !gs.players) return [];
    const entries = Object.values(gs.players);
    const other = entries.find((p) => p && p.id !== authUser.uid);
    return other && Array.isArray(other.guesses) ? other.guesses : [];
  };

  const getPlayerCount = (gs) => {
    if (!gs || !gs.players || typeof gs.players !== 'object') {
      return 0;
    }
    return Object.keys(gs.players).length;
  };

  // Derived friend-request state based on live gameState.
  const friendRequestSent = useMemo(() => {
    if (!isMultiplayer || !multiplayerGame.gameState || !authUser) return false;
    const gs = multiplayerGame.gameState;
    // Friend request status is now tracked via friendRequestFrom field
    return gs.friendRequestFrom === authUser.uid && gs.friendRequestStatus === 'pending';
  }, [isMultiplayer, multiplayerGame.gameState, authUser]);

  // Track whether the LOCAL player has solved all of their boards in multiplayer.
  const hasPlayerSolvedAllMultiplayerBoards = useMemo(() => {
    if (!isMultiplayer || !multiplayerGame.gameState || !authUser) return false;
    const gs = multiplayerGame.gameState;

    const solutionArray =
      Array.isArray(gs.solutions) && gs.solutions.length > 0
        ? gs.solutions
        : gs.solution
        ? [gs.solution]
        : [];

    if (solutionArray.length === 0) return false;

    let myGuesses = [];

    // Per-player guesses from the players map
    if (gs.players && gs.players[authUser.uid]) {
      myGuesses = gs.players[authUser.uid].guesses || [];
    }

    return solutionArray.every((sol) => myGuesses.includes(sol));
  }, [isMultiplayer, multiplayerGame.gameState, authUser]);

  // Multiplayer mode initialization (host/join, load word lists, guard on verification).
  useEffect(() => {
    async function initMultiplayer() {
      if (!isMultiplayer || !authUser) {
        // If not multiplayer mode, don't block loading
        if (!isMultiplayer) return;
        // If multiplayer but not authenticated, don't block loading but wait for auth
        setIsLoading(false);
        return;
      }

      if (!isVerifiedUser) {
        setTimedMessage('You must verify your email or sign in with Google to play Multiplayer Mode.', LONG_MESSAGE_TIMEOUT_MS);
        setIsLoading(false); // Stop loading even if user is not verified
        return;
      }

      try {
        setIsLoading(true);

        // Load word lists early for multiplayer (needed for validation)
        const { ALLOWED_GUESSES } = await loadWordLists();
        setAllowedSet(new Set(ALLOWED_GUESSES));

        // If host, create game (but only once per controller instance).
        if (isHost && !gameCode && !hasHostedGameRef.current) {
          hasHostedGameRef.current = true;
          let maxPlayersForRoom = DEFAULT_MAX_PLAYERS;
          if (maxPlayersParam != null) {
            const parsed = parseInt(maxPlayersParam, 10);
            if (Number.isFinite(parsed)) {
              // Clamp to a small, reasonable upper bound for UI/layout.
              maxPlayersForRoom = clampPlayers(parsed, DEFAULT_MAX_PLAYERS, ABSOLUTE_MAX_PLAYERS);
            }
          }
          const isPublicRoom = isPublicParam === 'true';

          let boardsForRoom = 1;
          if (boardsParam != null) {
            const parsedBoards = parseInt(boardsParam, 10);
            if (Number.isFinite(parsedBoards)) {
              boardsForRoom = clampBoards(parsedBoards);
            }
          }

          const result = await multiplayerGame.createGame({
            variant: gameVariant,
            speedrun: gameVariant === 'speedrun',
            solutionHunt: gameVariant === 'solutionhunt',
            maxPlayers: maxPlayersForRoom,
            isPublic: isPublicRoom,
            boards: boardsForRoom,
          });
          const code = result.code;
          if (typeof onGameCreated === 'function') {
            onGameCreated(result);
          }
          const boardsQuery = boardsParam ? `&boards=${boardsParam}` : '';
          const roomQuery = `&maxPlayers=${maxPlayersForRoom}&isPublic=${isPublicRoom}`;
          navigate(
            `/game?mode=multiplayer&code=${code}&host=true&variant=${gameVariant}${boardsQuery}${roomQuery}`,
            { replace: true }
          );
          setIsLoading(false);
          return;
        }

        // If joining, join the game (only if not already joined)
        if (!isHost && gameCode) {
          // Check if user is already part of the game via gameState
          if (multiplayerGame.gameState) {
            const players = multiplayerGame.gameState.players || {};
            const isAlreadyInGame = !!players[authUser.uid];

            if (isAlreadyInGame) {
              // User is already part of the game, no need to join
              setIsLoading(false);
            } else {
              try {
                const result = await multiplayerGame.joinGame(gameCode);
                if (result && typeof onGameJoined === 'function') {
                  onGameJoined(result);
                }
              } catch (error) {
                throw error;
              }
            }
          } else {
            try {
              const result = await multiplayerGame.joinGame(gameCode);
              if (result && typeof onGameJoined === 'function') {
                onGameJoined(result);
              }
            } catch (error) {
              throw error;
            }
          }
        } else {
          // For host, we can set loading to false after creating game
          setIsLoading(false);
        }
      } catch (error) {
        console.error('multiplayer init error:', error);
        // If hosting failed before we navigated into the room, allow another attempt.
        if (isHost && !gameCode) {
          hasHostedGameRef.current = false;
        }
        const errorMessage = formatError(error) || 'Failed to initialize multiplayer game';
        logError(error, 'useMultiplayerController.initMultiplayer');
        setTimedMessage(errorMessage, MESSAGE_TIMEOUT_MS);
        setIsLoading(false);
      }
    }

    initMultiplayer();
  }, [
    isMultiplayer,
    isHost,
    gameCode,
    authUser,
    isVerifiedUser,
    gameVariant,
    boardsParam,
    maxPlayersParam,
    isPublicParam,
    multiplayerGame,
    navigate,
    setTimedMessage,
    setAllowedSet,
    setIsLoading,
    onGameJoined,
  ]);

  // Handle multiplayer game state changes and initialization of local multi-board state.
  useEffect(() => {
    async function handleMultiplayerGame() {
      if (!isMultiplayer || !authUser) {
        // If we have a gameCode but no gameState yet, keep loading
        if (isMultiplayer && gameCode && !multiplayerGame.gameState) {
          return;
        }
        // Otherwise, stop loading if not multiplayer or not authenticated
        setIsLoading(false);
        return;
      }

      // Once we have gameState, ensure loading is false
      if (multiplayerGame.gameState) {
        setIsLoading(false);
      }

      if (!multiplayerGame.gameState) return;

      const gameState = multiplayerGame.gameState;
      const {
        status,
        solution,
        solutions,
        players,
      } = gameState;
      const playersMap = players || null;

      if (!playersMap) {
        // All games now use the players map
        return;
      }

      const hostEntry = Object.values(playersMap).find((p) => p && p.isHost) || null;
      const isPlayerHost = !!(hostEntry && hostEntry.id === authUser.uid);
      const isSpeedrun = gameState.speedrun || false;

      const playerIds = Object.keys(playersMap);
      const playerCount = playerIds.length;
      const isMultiRoom = playerCount > 2;

      // Normalize to an array of solutions for multi-board support
      const solutionArray = getSolutionArray(gameState);
      const boardCount = solutionArray.length || 1;

      // Initialize game boards when game starts
      if (status === 'playing' && solutionArray.length > 0) {
        if (boards.length === 0) {
          // Word lists should already be loaded in initMultiplayer, but ensure they're loaded
          if (allowedSet.size === 0) {
            setIsLoading(true);
            const { ALLOWED_GUESSES } = await loadWordLists();
            setAllowedSet(new Set(ALLOWED_GUESSES));
            setIsLoading(false);
          }
        }

        // Always update maxTurns based on current game state (important for rematches and state changes)
        // Set maxTurns based on number of boards (same curve as daily mode).
        const turns = isSpeedrun ? 999 : getMaxTurns(boardCount);
        setMaxTurns(turns);
        setIsUnlimited(isSpeedrun);

        // Update boards with the LOCAL player's guesses (one board per solution).
        // All games now use the players map.
        const playerRecord = playersMap[authUser.uid];
        const myGuesses = playerRecord && Array.isArray(playerRecord.guesses) 
          ? playerRecord.guesses 
          : [];

        const newBoards = solutionArray.map((sol, idx) => {
          const prevBoard = boards[idx];

          // Once a particular board is solved, subsequent guesses should NOT appear
          // on that board. We therefore truncate the guess list at the first time
          // this solution is guessed.
          const firstSolveIndex = myGuesses.indexOf(sol);
          const limit = firstSolveIndex === -1 ? myGuesses.length : firstSolveIndex + 1;

          const guessesWithColors = myGuesses.slice(0, limit).map((word) => {
            const colors = scoreGuess(word, sol);
            return { word, colors };
          });

          const isSolved = firstSolveIndex !== -1;
          const isDead =
            !isSpeedrun && !isSolved && guessesWithColors.length >= maxTurns;

          const prevGuessCount = prevBoard?.guesses?.length ?? 0;
          const hadNewGuess = guessesWithColors.length > prevGuessCount;
            // In multiplayer, revealId is already incremented by submitGuess before this runs,
          // so we record the current revealId for boards that just gained a row.
          const lastRevealId = hadNewGuess ? revealId : prevBoard?.lastRevealId ?? null;

          return {
            solution: sol,
            guesses: guessesWithColors,
            isSolved,
            isDead,
            lastRevealId,
          };
        });

        // Only update local boards when guess counts change to avoid loops
        if (
          boards.length !== newBoards.length ||
          newBoards.some(
            (b, idx) => b.guesses.length !== (boards[idx]?.guesses.length || 0)
          )
        ) {
          setBoards(newBoards);
        }
      }

      // Handle game finished - mark that we should show popup after flip completes
      // Don't reopen if user manually closed it
      if (status === 'finished' && !popupClosedRef.current && !shouldShowPopupAfterFlipRef.current) {
        // Mark that popup should show, but the separate effect will handle timing
        shouldShowPopupAfterFlipRef.current = true;
        return;
      }

      // When a new round starts (status === 'playing' with solutions), reset
      // end-of-game sentinels so winner logic and popups work again.
      if (status === 'playing' && solutionArray.length > 0) {
        endingGameRef.current = false;
        popupClosedRef.current = false;
        shouldShowPopupAfterFlipRef.current = false;
        // Do not force-close showPopup here; it is controlled elsewhere.
      }

      // Multiplayer is now fully free-for-all (no turn order). We no longer
      // auto-switch currentTurn; instead we only care about whether players
      // have finished solving their boards for purposes of ending the game.
      // Check if all required players are done (either solved or exhausted guesses)
      // Only end game if everyone is done AND game is still playing.
      if (status === 'playing' && solutionArray.length > 0 && !endingGameRef.current) {
        // All games use the players map for tracking player state
        if (playersMap && playerIds.length > 0) {
          const allFinished = playerIds.every((pid) => {
            const p = playersMap[pid];
            const guesses = (p && p.guesses) || [];
            const solvedAll = solutionArray.every((sol) => guesses.includes(sol));
            const exhaustedGuesses = !isSpeedrun && guesses.length >= maxTurns;
            return solvedAll || exhaustedGuesses;
          });

          if (allFinished) {
            endingGameRef.current = true;
            // All games end with winner = null (no single winner in free-for-all)
            await multiplayerGame.setWinner(gameCode || '', null);
          }
        }
      }
    }

    handleMultiplayerGame();
  }, [
    isMultiplayer,
    multiplayerGame.gameState,
    authUser,
    maxTurns,
    gameCode,
    multiplayerGame,
    boards,
    allowedSet,
    revealId,
    setBoards,
    setAllowedSet,
    setIsLoading,
    setIsUnlimited,
    setMaxTurns,
    endingGameRef,
    popupClosedRef,
    shouldShowPopupAfterFlipRef,
  ]);

  // Note: Auto-rematch effect removed. Host now manually starts rematch via handleRematchStart.
  // This gives host control over when to start and allows using selected config immediately.

  // Close popup when game status changes from 'finished' to 'playing' (rematch started)
  // This ensures the popup closes immediately when rematch begins
  const prevStatusRef = useRef(null);
  useEffect(() => {
    if (!isMultiplayer) return;
    const status = multiplayerGame.gameState && multiplayerGame.gameState.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;
    
    // If status changed from 'finished' to 'playing', close popup immediately
    if (prevStatus === 'finished' && status === 'playing') {
      setShowPopup(false);
      popupClosedRef.current = true;
      shouldShowPopupAfterFlipRef.current = false;
    }
  }, [
    isMultiplayer,
    multiplayerGame.gameState && multiplayerGame.gameState.status,
    setShowPopup,
  ]);

  // Handle showing popup after flip animation completes for multiplayer.
  // Mirrors the original Game.jsx behavior, keyed off the flip animation flag
  // and current game status.
  useEffect(() => {
    const status = multiplayerGame.gameState && multiplayerGame.gameState.status;
    if (
      isMultiplayer &&
      shouldShowPopupAfterFlipRef.current &&
      !isFlipping &&
      !popupClosedRef.current
    ) {
      // Ensure the flip is truly complete before showing popup
      setTimeout(() => {
        if (shouldShowPopupAfterFlipRef.current && !popupClosedRef.current) {
          setShowPopup(true);
          shouldShowPopupAfterFlipRef.current = false;
        }
      }, 50);
    }
  }, [
    isFlipping,
    isMultiplayer,
    multiplayerGame.gameState?.status,
    popupClosedRef,
    setShowPopup,
    shouldShowPopupAfterFlipRef,
  ]);

  // Multiplayer mode handlers
  const handleMultiplayerReady = useCallback(async () => {
    if (!gameCode) return;
    if (!isVerifiedUser) {
      setTimedMessage('You must verify your email or sign in with Google to play Multiplayer Mode.', VERIFICATION_MESSAGE_TIMEOUT_MS);
      return;
    }
    try {
      const gameState = multiplayerGame.gameState;
      if (!gameState || !gameState.players || !gameState.players[authUser?.uid]) {
        throw new Error('Player not in game');
      }

      // All games now use the players map
      const currentReady = gameState.players[authUser.uid].ready || false;
      await multiplayerGame.setReady(gameCode, !currentReady);
    } catch (error) {
      const errorMessage = formatError(error) || 'Failed to set ready status';
      logError(error, 'useMultiplayerController.handleMultiplayerReady');
      setTimedMessage(errorMessage, MESSAGE_TIMEOUT_MS);
    }
  }, [gameCode, multiplayerGame, authUser, isVerifiedUser, setTimedMessage]);

  const handleMultiplayerStart = useCallback(async () => {
    if (!gameCode) return;
    if (!isVerifiedUser) {
      setTimedMessage('You must verify your email or sign in with Google to play Multiplayer Mode.', VERIFICATION_MESSAGE_TIMEOUT_MS);
      return;
    }
    try {
      const { ANSWER_WORDS } = await loadWordLists();
      // For the initial multiplayer round, respect the boards count stored on the room
      // (configBoards) when available. Fall back to the boards selected on the
      // host screen (boardsParam), then to the current numBoards.
      let boardsForThisGame = 1;

      const gs = multiplayerGame.gameState;
      if (gs && Number.isFinite(gs.configBoards)) {
        const upper = Number.isFinite(maxMultiplayerBoards) ? maxMultiplayerBoards : 32;
        boardsForThisGame = Math.max(1, Math.min(upper, gs.configBoards));
      } else if (boardsParam != null) {
        const parsed = parseInt(boardsParam, 10);
        if (Number.isFinite(parsed)) {
          const upper = Number.isFinite(maxMultiplayerBoards) ? maxMultiplayerBoards : 32;
          boardsForThisGame = Math.max(1, Math.min(upper, parsed));
        }
      } else {
        boardsForThisGame = Math.max(1, numBoards || 1);
      }
      const seed = hashStringToNumber(gameCode) + Date.now();
      const rng = new SeededRandom(seed);
      const solutions = Array.from({ length: boardsForThisGame }).map(() => {
        const index = Math.floor(rng.next() * ANSWER_WORDS.length);
        return ANSWER_WORDS[index];
      });

      await multiplayerGame.startGame(gameCode, solutions);
    } catch (error) {
      setTimedMessage(error.message || 'Failed to start game', 5000);
    }
  }, [gameCode, multiplayerGame, numBoards, isVerifiedUser, setTimedMessage]);

  const handleCancelHostedChallenge = useCallback(async () => {
    if (!gameCode) {
      navigate('/');
      return;
    }
    try {
      await cancelSentChallenge(gameCode);
    } catch (error) {
      const errorMessage = formatError(error) || 'Failed to cancel challenge';
      logError(error, 'useMultiplayerController.handleCancelHostedChallenge');
      setTimedMessage(errorMessage, MESSAGE_TIMEOUT_MS);
    }
    navigate('/');
  }, [gameCode, cancelSentChallenge, navigate, setTimedMessage]);

  const handleAddFriendRequest = useCallback(async (opponentName, opponentId) => {
    if (!authUser) {
      return;
    }
    if (!opponentId) {
      return;
    }
    try {
      await sendFriendRequest(opponentName, opponentId);
      if (isMultiplayer && gameCode && multiplayerGame) {
        // Mark as pending in multiplayer game state so both players see live status.
        try {
          await multiplayerGame.setFriendRequestStatus(gameCode, 'pending');
        } catch (e) {
          console.error('Failed to mark multiplayer friend request pending:', e);
        }
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
    }
  }, [authUser, sendFriendRequest, isMultiplayer, gameCode, multiplayerGame]);

  const openMultiplayerConfigFromEnd = useCallback(() => {
    if (!isMultiplayer) return;
    if (!multiplayerGame.gameState || !authUser) return;
    const gs = multiplayerGame.gameState;

    // Prefer Firebase-stored next config; fallback to local state; otherwise, mirror the current round.
    const firebaseConfig = gs.nextGameConfig || null;
    const localConfig = multiplayerNextConfig;
    const effectiveConfig = firebaseConfig || localConfig;

    const multiBoardCount = Math.max(
      (Array.isArray(gs.solutions) && gs.solutions.length) || boards.length || 0,
      1
    );
    const defaultBoards = (effectiveConfig && Number.isFinite(effectiveConfig.numBoards))
      ? effectiveConfig.numBoards
      : (Array.isArray(gs.solutions) && gs.solutions.length > 0
        ? gs.solutions.length
        : gs.solution
        ? 1
        : multiBoardCount);
    // Determine default variant from config or game state
    let defaultVariant = 'standard';
    if (effectiveConfig && effectiveConfig.variant) {
      defaultVariant = effectiveConfig.variant;
    } else if (effectiveConfig && typeof effectiveConfig.speedrun === 'boolean') {
      // Backward compatibility
      defaultVariant = effectiveConfig.speedrun ? 'speedrun' : 'standard';
    } else if (gs.variant) {
      defaultVariant = gs.variant;
    } else if (gs.solutionHunt) {
      defaultVariant = 'solutionhunt';
    } else if (gs.speedrun) {
      defaultVariant = 'speedrun';
    }

    setMultiplayerConfigBoardsDraft(defaultBoards);
    setMultiplayerConfigVariantDraft(defaultVariant);
    setIsMultiplayerConfigModalOpen(true);
  }, [
    isMultiplayer,
    multiplayerGame.gameState,
    authUser,
    multiplayerNextConfig,
    boards,
  ]);

  const applyMultiplayerConfig = useCallback(async () => {
    if (!gameCode) return;
    
    const upper = Number.isFinite(maxMultiplayerBoards) ? maxMultiplayerBoards : 32;
    const clampedBoards = Math.max(1, Math.min(upper, multiplayerConfigBoardsDraft));
    const config = {
      numBoards: clampedBoards,
      variant: multiplayerConfigVariantDraft,
      speedrun: multiplayerConfigVariantDraft === 'speedrun',
      solutionHunt: multiplayerConfigVariantDraft === 'solutionhunt',
    };
    
    // Save to local state for immediate UI updates
    setMultiplayerNextConfig(config);
    
    // Save to Firebase so all players can see it
    try {
      await multiplayerGame.setNextGameConfig(gameCode, config);
    } catch (err) {
      console.error('Failed to save config to Firebase:', err);
      setTimedMessage('Failed to save configuration', CONFIG_MESSAGE_TIMEOUT_MS);
      return;
    }
    
    setIsMultiplayerConfigModalOpen(false);
    const variantLabels = { standard: 'standard', speedrun: 'speedrun', solutionhunt: 'solution hunt' };
    const modeLabel = variantLabels[multiplayerConfigVariantDraft] || 'standard';
    setTimedMessage(
      `Next rematch will use ${clampedBoards} board${clampedBoards > 1 ? 's' : ''} (${modeLabel} mode).`,
      MESSAGE_TIMEOUT_MS
    );
  }, [
    gameCode,
    maxMultiplayerBoards,
    multiplayerConfigBoardsDraft,
    multiplayerConfigVariantDraft,
    multiplayerGame,
    setTimedMessage,
  ]);

  // Handler for host to immediately start a rematch with selected config
  const handleRematchStart = useCallback(async () => {
    if (!gameCode || !authUser) return;
    const gameState = multiplayerGame.gameState;
    if (!gameState) return;
    
    const isPlayerHost = gameState.players && gameState.players[authUser.uid]?.isHost === true;
    if (!isPlayerHost) {
      setTimedMessage('Only the host can start a rematch', MESSAGE_TIMEOUT_MS);
      return;
    }
    
    try {
      const { ANSWER_WORDS } = await loadWordLists();
      
      // Get config from Firebase (nextGameConfig) or local state or use current game settings
      const firebaseConfig = gameState.nextGameConfig || null;
      const localConfig = multiplayerNextConfig;
      const effectiveConfig = firebaseConfig || localConfig;
      
      let boardsForRematch = 1;
      let variantForRematch = 'standard';
      
      if (effectiveConfig) {
        if (Number.isFinite(effectiveConfig.numBoards)) {
          const upper = Number.isFinite(maxMultiplayerBoards) ? maxMultiplayerBoards : 32;
          boardsForRematch = Math.max(1, Math.min(upper, effectiveConfig.numBoards));
        }
        if (effectiveConfig.variant) {
          variantForRematch = effectiveConfig.variant;
        } else if (typeof effectiveConfig.speedrun === 'boolean') {
          // Backward compatibility
          variantForRematch = effectiveConfig.speedrun ? 'speedrun' : 'standard';
        }
      } else {
        // Use current game settings
        const previousSolutions = Array.isArray(gameState.solutions)
          ? gameState.solutions
          : gameState.solution
          ? [gameState.solution]
          : [];
        boardsForRematch = Math.max(previousSolutions.length || 1, 1);
        if (gameState.variant) {
          variantForRematch = gameState.variant;
        } else if (gameState.solutionHunt) {
          variantForRematch = 'solutionhunt';
        } else if (gameState.speedrun) {
          variantForRematch = 'speedrun';
        }
      }
      
      // Generate new solutions
      const seed = hashStringToNumber(gameCode) + Date.now();
      const rng = new SeededRandom(seed);
      const solutions = Array.from({ length: boardsForRematch }).map(() => {
        const index = Math.floor(rng.next() * ANSWER_WORDS.length);
        return ANSWER_WORDS[index];
      });
      
      // Start the new game immediately
      await multiplayerGame.startGame(gameCode, solutions, {
        variant: variantForRematch,
        speedrun: variantForRematch === 'speedrun',
        solutionHunt: variantForRematch === 'solutionhunt',
      });
      
      // Clear the config for next time (both local and Firebase)
      setMultiplayerNextConfig(null);
      try {
        await multiplayerGame.setNextGameConfig(gameCode, null);
      } catch (err) {
        console.error('Failed to clear config from Firebase:', err);
      }
      
      // Reset UI state - close popup first
      popupClosedRef.current = true;
      shouldShowPopupAfterFlipRef.current = false;
      setShowPopup(false);
      setBoards([]);
      setCurrentGuess('');
      setIsLoading(false);
    } catch (err) {
      const errorMessage = formatError(err) || 'Failed to start rematch';
      logError(err, 'useMultiplayerController.handleRematchStart');
      setTimedMessage(errorMessage, MESSAGE_TIMEOUT_MS);
    }
  }, [
    gameCode,
    authUser,
    multiplayerGame,
    multiplayerNextConfig,
    maxMultiplayerBoards,
    setBoards,
    setCurrentGuess,
    setShowPopup,
    setIsLoading,
    setTimedMessage,
    shouldShowPopupAfterFlipRef,
    popupClosedRef,
  ]);

  return useMemo(() => ({
    friendRequestSent,
    hasPlayerSolvedAllMultiplayerBoards,
    isMultiplayerConfigModalOpen,
    multiplayerConfigBoardsDraft,
    multiplayerConfigVariantDraft,
    setIsMultiplayerConfigModalOpen,
    setMultiplayerConfigBoardsDraft,
    setMultiplayerConfigVariantDraft,
    handleMultiplayerReady,
    handleMultiplayerStart,
    handleCancelHostedChallenge,
    handleAddFriendRequest,
    openMultiplayerConfigFromEnd,
    applyMultiplayerConfig,
    handleRematchStart,
  }), [
    friendRequestSent,
    hasPlayerSolvedAllMultiplayerBoards,
    isMultiplayerConfigModalOpen,
    multiplayerConfigBoardsDraft,
    multiplayerConfigVariantDraft,
    setIsMultiplayerConfigModalOpen,
    setMultiplayerConfigBoardsDraft,
    setMultiplayerConfigVariantDraft,
    handleMultiplayerReady,
    handleMultiplayerStart,
    handleCancelHostedChallenge,
    handleAddFriendRequest,
    openMultiplayerConfigFromEnd,
    applyMultiplayerConfig,
    handleRematchStart,
  ]);
}
