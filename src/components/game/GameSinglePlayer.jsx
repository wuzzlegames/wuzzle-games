import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { loadJSON, saveJSON, makeSolvedKey, makeDailyKey, makeMarathonKey, makeSolutionHuntKey, makeStreakKey, loadStreak, updateStreakOnWin, marathonMetaKey } from "../../lib/persist";
import { loadMarathonMeta, saveMarathonMeta } from "../../lib/marathonMeta";
import {
  WORD_LENGTH,
  scoreGuess,
  buildLetterMapFromGuesses,
  getTurnsUsed,
  formatElapsed,
  sumMs,
} from "../../lib/wordle";
import { useGameEngine } from "../../hooks/useGameEngine";
import { FLIP_COMPLETE_MS, MESSAGE_TIMEOUT_MS, DEFAULT_MAX_TURNS, SPEEDRUN_COUNTDOWN_MS } from "../../lib/gameConstants";
import { generateShareText, buildMarathonShareTotals } from "../../lib/gameUtils";
import { getCurrentDateString } from "../../lib/dailyWords";
import { formatArchiveDate } from "../../lib/archiveService";
import { submitSpeedrunScore } from "../../hooks/useLeaderboard";
import { useAuth } from "../../hooks/useAuth";
import { useSubscription } from "../../hooks/useSubscription";
import { database } from "../../config/firebase";
import { ref, get, set } from "firebase/database";
import { useTimedMessage } from "../../hooks/useTimedMessage";
import { useShare } from "../../hooks/useShare";
import { useSinglePlayerGame } from "../../hooks/useSinglePlayerGame";
import { useKeyboard } from "../../hooks/useKeyboard";
import { useBoardLayout } from "../../hooks/useBoardLayout";
import { useStageTimer } from "../../hooks/useStageTimer";
import { loadStreakRemoteAware, saveStreakRemoteAware, saveSolvedState } from "../../lib/singlePlayerStore";
import { addPendingLeaderboard } from "../../lib/pendingLeaderboard";
import { grantBadge } from "../../lib/badgeService";
import { clampBoards } from "../../lib/validation";
import { logError } from "../../lib/errorUtils";
import { filterWordsByClues } from "../../lib/wordFilter";
import SubscribeModal from "../SubscribeModal";
import SinglePlayerGameView from "./SinglePlayerGameView";
import "../../Game.css";

const DEFAULT_MARATHON_LEVELS = [1, 2, 3, 4];

function buildStreakLabel(mode, speedrunEnabled, streak) {
  if (!streak) return null;
  const current = typeof streak.current === "number" ? streak.current : 0;
  const best = typeof streak.best === "number" ? streak.best : 0;

  const modeLabel = mode === "daily" ? "Daily" : mode === "marathon" ? "Marathon" : mode === "solutionhunt" ? "Solution Hunt" : "";
  const variant = speedrunEnabled ? "Speedrun" : "Standard";
  const prefix = modeLabel || "Streak";
  const base = `${prefix} ${variant} streak`;

  return `${base}: ${current} day${current === 1 ? "" : "s"} (best ${best})`;
}

export default function GameSinglePlayer({
  mode,
  boardsParam,
  speedrunEnabled,
  marathonLevels = DEFAULT_MARATHON_LEVELS,
  archiveDate = null,
}) {
  const navigate = useNavigate();
  const { message, setMessage, setTimedMessage, clearMessageTimer } = useTimedMessage("");
  const { user: authUser, isVerifiedUser } = useAuth();
  const { isSubscribed, showSubscriptionGate } = useSubscription(authUser);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const archiveRedirectTimeoutRef = useRef(null);
  const subscribeCloseRedirectRef = useRef(null);
  const subscriptionStateRef = useRef({ isSubscribed });
  subscriptionStateRef.current = { isSubscribed };

  // Check premium access for archive games
  useEffect(() => {
    if (archiveDate && !authUser) {
      // Must be signed in for archive games
      setTimedMessage('You must be signed in to play archive games.', 3000);
      if (archiveRedirectTimeoutRef.current) clearTimeout(archiveRedirectTimeoutRef.current);
      archiveRedirectTimeoutRef.current = setTimeout(() => {
        archiveRedirectTimeoutRef.current = null;
        navigate('/profile');
      }, 2000);
      return () => {
        if (archiveRedirectTimeoutRef.current) {
          clearTimeout(archiveRedirectTimeoutRef.current);
          archiveRedirectTimeoutRef.current = null;
        }
      };
    }
    if (archiveDate && authUser && showSubscriptionGate) {
      setShowSubscribeModal(true);
    } else if (isSubscribed) {
      setShowSubscribeModal(false);
    }
  }, [archiveDate, authUser, isSubscribed, showSubscriptionGate, navigate, setTimedMessage]);

  // Best-effort helper to mirror local single-player progress into the
  // authenticated user's Firebase profile so daily/marathon games can be
  // resumed across devices. Guests never hit this path.
  const persistForUser = useCallback((subPath, value) => {
    if (!authUser) return;
    try {
      const userRef = ref(database, `users/${authUser.uid}/${subPath}`);
      set(userRef, value).catch((err) => {
        // Server persistence failures should never break gameplay.
        logError(err, 'GameSinglePlayer.persistForUser');
      });
    } catch (err) {
      logError(err, 'GameSinglePlayer.persistForUser');
    }
  }, [authUser]);

  // Force re-render when marathon advances to next stage (in-app, no full page nav).
  const [marathonStageKey, setMarathonStageKey] = useState(0);

  // Load marathon meta for current speedrun/daily config (standard and speedrun are separate).
  const marathonMeta = loadMarathonMeta(speedrunEnabled);
  const marathonIndex = marathonMeta.index || 0;
  const marathonCumulativeMs = marathonMeta.cumulativeMs || 0;
  const marathonStageTimes = marathonMeta.stageTimes || [];

  // Determine numBoards (clamp to a safe range, non-marathon only).
  // Solution Hunt mode is always 1 board.
  let parsedBoards = 1;
  if (mode !== "marathon" && mode !== "solutionhunt" && boardsParam) {
    const n = parseInt(boardsParam, 10);
    if (Number.isFinite(n)) {
      parsedBoards = clampBoards(n);
    }
  }

  const numBoards = mode === "marathon" ? marathonLevels[marathonIndex] : mode === "solutionhunt" ? 1 : parsedBoards;

  // Solution Hunt mode state
  const isSolutionHuntMode = mode === "solutionhunt";
  const [showSolutionHuntModal, setShowSolutionHuntModal] = useState(false);
  const [answerWords, setAnswerWords] = useState([]);

  const [boards, setBoards] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const currentGuessRef = useRef("");
  const [maxTurns, setMaxTurns] = useState(DEFAULT_MAX_TURNS);
  const [allowedSet, setAllowedSet] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize game engine with allowed words
  const gameEngine = useGameEngine({ allowedWords: allowedSet });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const [showPopup, setShowPopup] = useState(false);
  const [showOutOfGuesses, setShowOutOfGuesses] = useState(false);
  // Tracks when the player has definitively finished the stage (either by
  // solving all boards or choosing to exit after running out of guesses).
  // We use this to gate end-of-game UI like comments so it does not appear
  // while the out-of-guesses popup is still asking whether to continue.
  const [hasCompletedStage, setHasCompletedStage] = useState(false);
  // In marathon mode, remember whether the player is allowed to advance to the
  // next stage from the end-of-game popup. If they reach the popup via
  // "Exit" after running out of guesses, we disable the Next Stage button.
  const [allowNextStageAfterPopup, setAllowNextStageAfterPopup] = useState(true);
  // In marathon mode, if the player exits after running out of guesses, allow
  // them to share their result from the popup even if the stage is not the
  // final marathon stage.
  const [forceCanShareAfterPopup, setForceCanShareAfterPopup] = useState(false);

  // NOTE: This ref holds a solved state snapshot that's loaded once and doesn't change.
  // Using a ref prevents unnecessary re-renders when the value is set.
  const savedSolvedStateRef = useRef(null);

  const [isUnlimited, setIsUnlimited] = useState(false);
  const [selectedBoardIndex, setSelectedBoardIndex] = useState(null);
  const [revealId, setRevealId] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // NOTE: This ref holds DOM element references for boards.
  // Refs are appropriate for DOM references as they don't need to trigger re-renders.
  const boardRefs = useRef({});
  const [showBoardSelector, setShowBoardSelector] = useState(false);

  // NOTE: These refs are used instead of state to avoid unnecessary re-renders.
  // They track internal game state that doesn't need to trigger UI updates.
  // - committedRef: Marathon stage commit flag (doesn't affect UI)
  // - committedStageMsRef: Marathon stage time (only used in calculations)
  // - hasStartedStageTimerRef: Timer start flag (prevents duplicate starts)
  const committedRef = useRef(false);
  const committedStageMsRef = useRef(0);
  const hasStartedStageTimerRef = useRef(false);
  const flipPopupTimeoutsRef = useRef([]);
  const countdownTimeoutsRef = useRef([]);

  // Countdown (3, 2, 1) before timer starts in speedrun. Only for fresh games, not resumed.
  const [countdownRemaining, setCountdownRemaining] = useState(null);

  // Clear flip/popup and countdown timeouts on unmount to avoid setState after unmount.
  useEffect(() => {
    return () => {
      flipPopupTimeoutsRef.current.forEach((id) => clearTimeout(id));
      flipPopupTimeoutsRef.current = [];
      countdownTimeoutsRef.current.forEach((id) => clearTimeout(id));
      countdownTimeoutsRef.current = [];
    };
  }, []);

  // Seed object for the stage timer hook; populated by useSinglePlayerGame
  // based on any saved game state or solved snapshot.
  const [stageTimerSeed, setStageTimerSeed] = useState({ elapsedMs: 0, frozen: false });

  const {
    start: stageTimerStart,
    freeze: stageTimerFreeze,
    elapsedMs: timerElapsedMs,
  } = useStageTimer(speedrunEnabled, 100, {
    initialElapsedMs: stageTimerSeed.elapsedMs,
    initiallyFrozen: stageTimerSeed.frozen,
  });

  const isMarathonSpeedrun = speedrunEnabled && mode === "marathon";

  const [streakLabel, setStreakLabel] = useState(null);

  // Initial streak label from local storage for fast paint / guests.
  useEffect(() => {
    const tracksStreak = (mode === "daily" && numBoards === 1) || mode === "marathon" || mode === "solutionhunt";
    if (!tracksStreak) {
      setStreakLabel(null);
      return;
    }
    try {
      const info = loadStreak(mode, speedrunEnabled);
      setStreakLabel(buildStreakLabel(mode, speedrunEnabled, info));
    } catch (err) {
      logError(err, 'GameSinglePlayer.loadStreak');
      setStreakLabel(null);
    }
  }, [mode, speedrunEnabled, numBoards]);

  // For signed-in users, prefer the server-stored streak so it stays consistent
  // across devices.
  useEffect(() => {
    const tracksStreak = (mode === "daily" && numBoards === 1) || mode === "marathon" || mode === "solutionhunt";
    if (!tracksStreak) return;

    let isMounted = true;

    (async () => {
      try {
        const remoteAware = await loadStreakRemoteAware({
          authUser,
          database,
          mode,
          speedrunEnabled,
        });
        if (!remoteAware) return;
        setStreakLabel(buildStreakLabel(mode, speedrunEnabled, remoteAware));
      } catch (err) {
        logError(err, 'GameSinglePlayer.loadStreakRemoteAware');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authUser, mode, speedrunEnabled, numBoards]);

  // Stage timer ticks are now handled by useStageTimer; this component only
  // passes an initial seed based on saved state.

  // For fresh speedrun games (no saved elapsed time and not resumed from a
  // solved snapshot), show 3-2-1 countdown then start the stage timer.
  useEffect(() => {
    if (!speedrunEnabled) return;
    if (hasStartedStageTimerRef.current) return;

    const hasSeedElapsed = stageTimerSeed.elapsedMs > 0;
    const isSeedFrozen = stageTimerSeed.frozen;

    // Resumed games and solved snapshots rely on the seeding behaviour inside
    // useStageTimer; they should not call start() again. No countdown.
    if (hasSeedElapsed || isSeedFrozen) {
      hasStartedStageTimerRef.current = true;
      return;
    }

    if (!isLoading && boards.length > 0) {
      const stepMs = SPEEDRUN_COUNTDOWN_MS / 3;
      setCountdownRemaining(3);
      const t1 = setTimeout(() => setCountdownRemaining(2), stepMs);
      const t2 = setTimeout(() => setCountdownRemaining(1), stepMs * 2);
      const t3 = setTimeout(() => {
        setCountdownRemaining(null);
        stageTimerStart();
        hasStartedStageTimerRef.current = true;
        countdownTimeoutsRef.current = [];
      }, SPEEDRUN_COUNTDOWN_MS);
      countdownTimeoutsRef.current = [t1, t2, t3];
      return () => {
        countdownTimeoutsRef.current.forEach((id) => clearTimeout(id));
        countdownTimeoutsRef.current = [];
      };
    }
  }, [speedrunEnabled, stageTimerSeed, isLoading, boards.length, stageTimerStart]);

  // Keep an always-fresh ref of the current guess so that even callbacks
  // captured by mocks or older renders (e.g. in tests) see the latest value.
  // NOTE: This ref is necessary because keyboard handlers are called with callbacks
  // that may have stale closures. The ref ensures we always access the latest value.
  useEffect(() => {
    currentGuessRef.current = currentGuess;
  }, [currentGuess]);

  const getGameStateKey = useCallback(() => {
    if (mode === "marathon") {
      return makeMarathonKey(speedrunEnabled);
    }
    if (mode === "solutionhunt") {
      return makeSolutionHuntKey();
    }
    return makeDailyKey(numBoards, speedrunEnabled);
  }, [mode, speedrunEnabled, numBoards]);

  const stageElapsedMs =
    savedSolvedStateRef.current?.stageElapsedMs !== undefined
      ? savedSolvedStateRef.current.stageElapsedMs
      : timerElapsedMs;

  const saveGameState = useCallback(() => {
    if (boards.length === 0) return;
    const allSolved = boards.every((b) => b.isSolved);
    if (allSolved) return;

    const gameStateKey = getGameStateKey();
    const gameState = {
      boards,
      currentGuess,
      isUnlimited,
      maxTurns,
      // Persist the current stage elapsed time directly from the timer hook so
      // we no longer depend on legacy start/end refs.
      stageElapsedMs: speedrunEnabled ? stageElapsedMs : 0,
      committedRef: committedRef.current,
      committedStageMs: committedStageMsRef.current,
      revealId,
      timestamp: Date.now(),
    };
    saveJSON(gameStateKey, gameState);
    // Mirror in-progress single-player state to Firebase for signed-in users.
    persistForUser(`singlePlayer/gameStates/${gameStateKey}`, gameState);

    // If this is an archive game, also save to archive game state
    if (archiveDate && authUser) {
      (async () => {
        try {
          const { saveArchiveGameState } = await import('../../lib/archiveService');
          await saveArchiveGameState({
            uid: authUser.uid,
            mode,
            speedrunEnabled,
            dateString: archiveDate,
            gameState,
          });
        } catch (err) {
          logError(err, 'GameSinglePlayer.saveArchiveGameState');
        }
      })();
    }
  }, [boards, currentGuess, isUnlimited, maxTurns, speedrunEnabled, stageElapsedMs, revealId, getGameStateKey, persistForUser, archiveDate, authUser, mode]);

  const clearGameState = useCallback(() => {
    const gameStateKey = getGameStateKey();
    saveJSON(gameStateKey, null);
    persistForUser(`singlePlayer/gameStates/${gameStateKey}`, null);
  }, [getGameStateKey, persistForUser]);

  useSinglePlayerGame({
    mode,
    speedrunEnabled,
    numBoards,
    marathonIndex,
    marathonLevels,
    getGameStateKey,
    savedSolvedStateRef,
    committedRef,
    committedStageMsRef,
    setBoards,
    setCurrentGuess,
    setMessage,
    clearMessageTimer,
    setShowOutOfGuesses,
    setIsUnlimited,
    setSelectedBoardIndex,
    setRevealId,
    setIsFlipping,
    setMaxTurns,
    setAllowedSet,
    setIsLoading,
    setShowPopup,
    setTimedMessage,
    setStageTimerSeed,
    archiveDate,
    setAnswerWords, // For Solution Hunt mode
  });

  const hasThisStageCommittedInProps =
    isMarathonSpeedrun && marathonStageTimes.some((x) => x.boards === numBoards);

  const displayTotalMs = isMarathonSpeedrun
    ? marathonCumulativeMs +
      (hasThisStageCommittedInProps
        ? 0
        : committedRef.current
        ? committedStageMsRef.current
        : stageElapsedMs)
    : stageElapsedMs;

  const commitStageIfNeeded = (ms) => {
    if (!isMarathonSpeedrun) return;
    if (committedRef.current) return;

    committedRef.current = true;
    committedStageMsRef.current = ms;

    if (speedrunEnabled && mode === "marathon") {
      const currentMeta = loadMarathonMeta(speedrunEnabled);
      const newStageTimes = [...(currentMeta.stageTimes || [])];
      const existing = newStageTimes.findIndex((st) => st.boards === numBoards);
      if (existing >= 0) {
        newStageTimes[existing] = { boards: numBoards, ms };
      } else {
        newStageTimes.push({ boards: numBoards, ms });
      }
      const cumulative = newStageTimes.reduce((sum, st) => sum + st.ms, 0);
      const updatedMeta = {
        ...currentMeta,
        index: marathonIndex,
        cumulativeMs: cumulative,
        stageTimes: newStageTimes,
      };
      const saved = saveMarathonMeta(speedrunEnabled, updatedMeta);
      const metaKey = marathonMetaKey(speedrunEnabled);
      // Mirror marathon meta so cumulative times stay consistent across devices.
      persistForUser(`singlePlayer/meta/${metaKey}`, saved);
    }
  };

  const invalidCurrentGuess =
    currentGuess.length === WORD_LENGTH && !allowedSet.has(currentGuess);

  const { perBoardLetterMaps, focusedLetterMap, gridCols, gridRows } = useBoardLayout(
    boards,
    selectedBoardIndex,
    numBoards
  );

  // Solution Hunt: Filter possible words based on guesses
  const filteredSolutionWords = useMemo(() => {
    if (!isSolutionHuntMode || answerWords.length === 0) return [];
    // For solution hunt, we only have 1 board
    const board = boards[0];
    if (!board) return answerWords;
    return filterWordsByClues(answerWords, board.guesses || []);
  }, [isSolutionHuntMode, answerWords, boards]);

  // Solution Hunt: Callback to select a word from the modal
  const handleSelectSolutionWord = useCallback((word) => {
    if (!word || typeof word !== 'string') return;
    const upperWord = word.toUpperCase();
    currentGuessRef.current = upperWord;
    setCurrentGuess(upperWord);
    // Clear any existing message
    if (message) {
      setMessage("");
      clearMessageTimer();
    }
  }, [message, setMessage, clearMessageTimer]);

  // Use game engine for solved count (can be replaced with gameEngine.countSolvedBoards(boards))
  const solvedCount = useMemo(() => boards.filter((b) => b.isSolved).length, [boards]);

  // Use game engine for finished check (can be replaced with gameEngine.checkAllBoardsFinished)
  const finished = useMemo(() => {
    if (boards.length === 0) return false;
    return gameEngine.checkAllBoardsFinished(boards, maxTurns, isUnlimited);
  }, [boards, isUnlimited, maxTurns, gameEngine]);

  // Mark the stage as fully completed the first time the end-of-game popup
  // is shown. This happens both when the player solves all boards and when
  // they choose to exit after running out of guesses (including when
  // revisiting an already-solved puzzle from local storage).
  useEffect(() => {
    if (!hasCompletedStage && finished && showPopup) {
      setHasCompletedStage(true);
    }
  }, [hasCompletedStage, finished, showPopup]);

  // Use game engine for all solved check
  const allSolved = useMemo(
    () => gameEngine.checkAllBoardsSolved(boards),
    [boards, gameEngine]
  );

  const isInputBlocked = useCallback(() => {
    if (allSolved) return true;
    if (showPopup || showOutOfGuesses) return true;
    if (countdownRemaining != null) return true;

    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (
        active &&
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return true;
      }
    }
    return false;
  }, [allSolved, showPopup, showOutOfGuesses, countdownRemaining]);

  const addLetter = (letter) => {
    if (currentGuessRef.current.length >= WORD_LENGTH) return;
    const next = currentGuessRef.current + letter;
    currentGuessRef.current = next;
    setCurrentGuess(next);
    if (message) {
      setMessage("");
      clearMessageTimer();
    }
  };

  const removeLetter = () => {
    if (currentGuessRef.current.length === 0) return;
    const next = currentGuessRef.current.slice(0, -1);
    currentGuessRef.current = next;
    setCurrentGuess(next);
    if (message) {
      setMessage("");
      clearMessageTimer();
    }
  };

  const freezeStageTimer = () => {
    if (!speedrunEnabled) return 0;
    // Delegate entirely to the stage timer hook; we no longer maintain
    // separate start/end refs now that timing is fully encapsulated.
    const ms = stageTimerFreeze();
    return ms;
  };

  const submitGuess = async () => {
    if (showPopup || showOutOfGuesses) return;

    const guess = currentGuessRef.current;

    // If the guess is not complete (fewer than WORD_LENGTH letters), treat
    // Enter as "clear" so the player can quickly start over.
    if (guess.length !== WORD_LENGTH) {
      if (guess.length > 0) {
        currentGuessRef.current = "";
        setCurrentGuess("");
      }
      return;
    }

    // Use game engine for guess validation
    const validation = gameEngine.validateGuess(guess, allowedSet);
    if (!validation.isValid) {
      setTimedMessage(validation.error || "Not in word list.", MESSAGE_TIMEOUT_MS);
      currentGuessRef.current = "";
      setCurrentGuess("");
      return;
    }

    // Use game engine to check if all boards are finished
    const allOver = gameEngine.checkAllBoardsFinished(boards, maxTurns, isUnlimited);
    if (allOver) return;

    const nextRevealId = revealId + 1;

    // Use game engine to process guesses for all boards
    const newBoards = boards.map((board) => {
      // Skip processing for solved or dead boards
      if (gameEngine.isBoardSolved(board)) return board;
      if (!isUnlimited && gameEngine.isBoardDead(board, maxTurns)) return board;

      try {
        // Use game engine's processGuess method
        const updatedBoard = gameEngine.processGuess(board, guess, maxTurns, isUnlimited, nextRevealId);
        return updatedBoard;
      } catch (err) {
        // If processing fails, return board unchanged
        logError(err, 'GameSinglePlayer.submitGuess.processGuess');
        return board;
      }
    });

    setBoards(newBoards);
    setRevealId(nextRevealId);
    setIsFlipping(true);
    currentGuessRef.current = "";
    setCurrentGuess("");
    setMessage("");
    clearMessageTimer();

    const flipId = setTimeout(() => {
      setIsFlipping(false);
    }, FLIP_COMPLETE_MS);
    flipPopupTimeoutsRef.current.push(flipId);

    // Use game engine for finished and solved checks
    const finishedNow = gameEngine.checkAllBoardsFinished(newBoards, maxTurns, isUnlimited);
    const allSolvedNow = gameEngine.checkAllBoardsSolved(newBoards);

    if (finishedNow && !allSolvedNow && !isUnlimited) {
      freezeStageTimer();
      const outId = setTimeout(() => {
        setShowOutOfGuesses(true);
      }, FLIP_COMPLETE_MS);
      flipPopupTimeoutsRef.current.push(outId);
      return;
    }

    if (finishedNow && allSolvedNow) {
      const finalStageMs = freezeStageTimer();
      if (isMarathonSpeedrun) commitStageIfNeeded(finalStageMs);

      // For archive games, use archiveDate; for regular games, use current date
      const dateString = archiveDate || getCurrentDateString();
      const solvedKey = makeSolvedKey(
        mode,
        numBoards,
        speedrunEnabled,
        mode === "marathon" ? marathonIndex : null,
        dateString
      );
      const currentTurnsUsed = getTurnsUsed(newBoards);

      let savedPopupTotalMs = 0;
      if (speedrunEnabled) {
        if (isMarathonSpeedrun) {
          const stageAlreadyCommitted = marathonStageTimes.some((x) => x.boards === numBoards);
          savedPopupTotalMs = stageAlreadyCommitted
            ? marathonCumulativeMs
            : marathonCumulativeMs + finalStageMs;
        } else {
          savedPopupTotalMs = finalStageMs;
        }
      }

      const solvedState = {
        boards: newBoards,
        turnsUsed: currentTurnsUsed,
        maxTurns,
        allSolved: true,
        solvedCount: newBoards.length,
        stageElapsedMs: finalStageMs,
        popupTotalMs: savedPopupTotalMs,
        timestamp: Date.now(),
      };
      saveSolvedState({ authUser, database, solvedKey, value: solvedState });

      const isMarathonComplete =
        mode === "marathon" && marathonIndex >= marathonLevels.length - 1;

      // Update streaks for supported configurations:
      // - Daily: 1-board standard or speedrun
      // - Marathon: standard or speedrun, but only once the full run is complete.
      // NOTE: Archive games do NOT update streaks
      const shouldUpdateStreak =
        !archiveDate && // Don't update streaks for archive games
        ((mode === "daily" && numBoards === 1) ||
        (mode === "marathon" && isMarathonComplete));

      if (shouldUpdateStreak) {
        (async () => {
          try {
            const streakInfo = updateStreakOnWin(mode, speedrunEnabled, dateString);

            await saveStreakRemoteAware({
              authUser,
              database,
              mode,
              speedrunEnabled,
              streakInfo,
            });

            setStreakLabel(buildStreakLabel(mode, speedrunEnabled, streakInfo));

            // Save solution words to archive for streak-tracked modes
            // Only save for regular games (not archive games) - archive games already have solutions saved
            if (!archiveDate) {
              const solutions = newBoards.map((b) => b.solution).filter(Boolean);
              if (solutions.length > 0) {
                const { saveArchiveSolution } = await import('../../lib/archiveService');
                await saveArchiveSolution({
                  mode,
                  speedrunEnabled,
                  dateString, // This is current date for regular games
                  solutions,
                  numBoards,
                });
              }

              // Save game statistics for advanced stats
              // Track for Daily Standard, Daily Speedrun 1 board, and Marathon modes
              if ((mode === 'daily' && numBoards === 1) || mode === 'marathon') {
                const { saveGameStats } = await import('../../lib/statsService');
                
                if (mode === 'marathon') {
                  // For marathon, calculate total guesses and time when complete
                  let marathonTotalGuesses = null;
                  let marathonTotalTimeMs = null;
                  const fallbackTotal = newBoards.reduce((sum, b) => sum + (b.guesses?.length ?? 0), 0) || currentTurnsUsed;

                  if (isMarathonComplete) {
                    // Calculate total guesses across all stages from Firebase solved states
                    let totalGuesses = 0;
                    try {
                      const { loadSolvedState } = await import('../../lib/singlePlayerStore');

                      // Sum guesses from all stages
                      for (let stageIdx = 0; stageIdx < marathonLevels.length; stageIdx++) {
                        const stageBoards = marathonLevels[stageIdx];
                        const stageSolvedKey = makeSolvedKey(
                          mode,
                          stageBoards,
                          speedrunEnabled,
                          stageIdx,
                          dateString
                        );
                        const stageState = await loadSolvedState({
                          authUser,
                          database,
                          solvedKey: stageSolvedKey,
                        });
                        if (stageState && typeof stageState.turnsUsed === 'number') {
                          totalGuesses += stageState.turnsUsed;
                        }
                      }
                      marathonTotalGuesses = totalGuesses;

                      // For speedrun, total time is already calculated
                      if (speedrunEnabled) {
                        marathonTotalTimeMs = savedPopupTotalMs || marathonCumulativeMs + finalStageMs;
                      }
                    } catch (err) {
                      logError(err, 'GameSinglePlayer.calculateMarathonTotals');
                      marathonTotalGuesses = marathonTotalGuesses ?? totalGuesses ?? fallbackTotal;
                      if (speedrunEnabled && marathonTotalTimeMs == null) {
                        marathonTotalTimeMs = savedPopupTotalMs || marathonCumulativeMs + finalStageMs;
                      }
                    }
                  }
                  
                  await saveGameStats({
                    uid: authUser.uid,
                    mode,
                    speedrunEnabled,
                    dateString,
                    guesses: currentTurnsUsed,
                    solveTimeMs: speedrunEnabled ? finalStageMs : null,
                    numBoards,
                    solved: true,
                    marathonIndex,
                    marathonTotalGuesses,
                    marathonTotalTimeMs,
                    isMarathonComplete,
                  });
                } else {
                  // Daily mode
                  await saveGameStats({
                    uid: authUser.uid,
                    mode,
                    speedrunEnabled,
                    dateString,
                    guesses: currentTurnsUsed,
                    solveTimeMs: speedrunEnabled ? finalStageMs : null,
                    numBoards,
                    solved: true,
                  });
                }
              }
            }
          } catch (err) {
            logError(err, 'GameSinglePlayer.updateStreak');
          }
        })();
      }

      if (mode === "daily" && authUser) {
        grantBadge({ database, uid: authUser.uid, badgeId: "daily_player" }).catch((err) => {
          logError(err, 'GameSinglePlayer.grantBadge');
        });
      }

      const wouldSubmitSpeedrun =
        speedrunEnabled && allSolvedNow && (mode === "daily" || isMarathonComplete);
      const finalTimeMs = savedPopupTotalMs || finalStageMs;
      const submitNumBoards =
        mode === "marathon"
          ? marathonLevels[marathonLevels.length - 1]
          : numBoards;

      if (wouldSubmitSpeedrun && authUser && isVerifiedUser) {
        const userName = authUser.displayName || authUser.email || "Anonymous";
        submitSpeedrunScore(
          authUser.uid,
          userName,
          mode,
          submitNumBoards,
          finalTimeMs
        ).catch((err) => {
          logError(err, 'GameSinglePlayer.submitSpeedrunScore');
        });
      } else if (wouldSubmitSpeedrun && !authUser) {
        addPendingLeaderboard({ mode, numBoards: submitNumBoards, timeMs: finalTimeMs });
      }

      clearGameState();

      const popupId = setTimeout(() => {
        setShowPopup(true);
      }, FLIP_COMPLETE_MS);
      flipPopupTimeoutsRef.current.push(popupId);
    }
  };

  // useKeyboard stores disabled in a ref; ensure isInputBlocked (allSolved,
  // showPopup, showOutOfGuesses) stays correct when changing input-blocking logic.
  useKeyboard({
    disabled: isInputBlocked(),
    onEnter: submitGuess,
    onBackspace: removeLetter,
    onLetter: addLetter,
  });

  // Persist game state when boards/guess/unlimited change. saveGameState and
  // isLoading intentionally excluded from deps to avoid re-running on every
  // callback identity change or when loading toggles; re-evaluate if logic changes.
  useEffect(() => {
    if (boards.length > 0 && !isLoading) {
      const allSolvedLocal = boards.every((b) => b.isSolved);
      if (!allSolvedLocal) {
        saveGameState();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, currentGuess, isUnlimited]);

  const handleBack = useCallback(() => {
    saveGameState();
    navigate("/");
  }, [saveGameState, navigate]);

  const handleVirtualKey = (key) => {
    if (isInputBlocked()) return;

    if (key === "ENTER") submitGuess();
    else if (key === "BACK") removeLetter();
    else addLetter(key);
  };

  const solutionsText = useMemo(
    () =>
      (Array.isArray(boards) ? boards : [])
        .map((b) => (b && typeof b.solution === "string" ? b.solution : null))
        .filter(Boolean)
        .map((w) => w.toUpperCase())
        .join(" · "),
    [boards]
  );
  const turnsUsed = useMemo(() => getTurnsUsed(boards), [boards]);

  const statusText =
    speedrunEnabled
      ? ""
      : finished && !showPopup && !showOutOfGuesses
      ? "Stage complete."
      : `Guesses used: ${turnsUsed}/${maxTurns}${isUnlimited ? " (unlimited)" : ""}`;

  // gridCols and gridRows are now provided by useBoardLayout so the layout
  // logic stays consistent between single-player and multiplayer.

  const marathonHasNext = useMemo(
    () => mode === "marathon" && marathonIndex < marathonLevels.length - 1,
    [mode, marathonIndex, marathonLevels.length]
  );
  const marathonNextBoards = useMemo(
    () => (marathonHasNext ? marathonLevels[marathonIndex + 1] : null),
    [marathonHasNext, marathonLevels, marathonIndex]
  );

  // Only allow sharing for marathon mode once the final stage has been solved.
  const canShare =
    mode === "marathon"
      ? // Normally only allow sharing once the final stage has been fully solved,
        // but if the player has chosen to exit after running out of guesses we
        // still let them share their partial marathon run.
        forceCanShareAfterPopup || (allSolved && !marathonHasNext)
      : true;

  const showNextStageBar =
    mode === "marathon" && allSolved && !showPopup && !showOutOfGuesses && marathonHasNext;

  const goNextStage = useCallback(() => {
    if (marathonHasNext) {
      const newIndex = marathonIndex + 1;
      // Save meta for this variant only (standard and speedrun are separate).
      const updatedMeta = saveMarathonMeta(speedrunEnabled, { index: newIndex });
      const metaKey = marathonMetaKey(speedrunEnabled);
      persistForUser(`singlePlayer/meta/${metaKey}`, updatedMeta);
      // Clear in-progress game state for this variant so next stage loads fresh boards.
      const gameStateKey = makeMarathonKey(speedrunEnabled);
      saveJSON(gameStateKey, null);
      persistForUser(`singlePlayer/gameStates/${gameStateKey}`, null);
      // Reset timer seed and start flag so the next stage runs countdown and starts the speedrun timer.
      setStageTimerSeed({ elapsedMs: 0, frozen: false });
      hasStartedStageTimerRef.current = false;
      // Re-render so we read new meta and useSinglePlayerGame runs with new marathonIndex/numBoards.
      setMarathonStageKey((k) => k + 1);
    }
  }, [marathonHasNext, marathonIndex, speedrunEnabled]);

  const exitFromOutOfGuesses = () => {
    // Freeze the timer and immediately transition to the end-of-game popup
    // so the experience matches the solved flow (no extra delay).
    const finalStageMs = freezeStageTimer();
    setShowOutOfGuesses(false);

    // Persist a completed-stage snapshot so that revisiting the mode for the
    // same day shows the end-of-game popup (and comments) instead of an
    // in-progress grid. This mirrors the full-solve flow but keeps allSolved
    // false so the UI uses the "Stage ended" messaging.
    try {
      const dateString = getCurrentDateString();
      const solvedKey = makeSolvedKey(
        mode,
        numBoards,
        speedrunEnabled,
        mode === "marathon" ? marathonIndex : null,
        dateString
      );

      const currentTurnsUsed = getTurnsUsed(boards);

      const solvedCountForStage = boards.filter((b) => b && b.isSolved).length;

      let savedPopupTotalMs = 0;
      if (speedrunEnabled) {
        if (isMarathonSpeedrun) {
          // For partial marathon exits, rely on the aggregated per-stage rows
          // when building share text; store just the per-stage time here.
          savedPopupTotalMs = finalStageMs;
        } else {
          savedPopupTotalMs = finalStageMs;
        }
      }

      const solvedState = {
        boards,
        turnsUsed: currentTurnsUsed,
        maxTurns,
        allSolved: false,
        solvedCount: solvedCountForStage,
        stageElapsedMs: finalStageMs,
        popupTotalMs: savedPopupTotalMs,
        exitedDueToOutOfGuesses: true,
        timestamp: Date.now(),
      };

      saveSolvedState({ authUser, database, solvedKey, value: solvedState });
    } catch (err) {
      // Best-effort only; failure to persist should not break gameplay.
      console.error("Failed to persist out-of-guesses exit state", err);
    }

    // If the player chose to exit after running out of guesses in marathon
    // mode, do not offer a Next Stage button in the final popup and allow
    // sharing from that popup even on non-final stages.
    if (mode === "marathon") {
      setAllowNextStageAfterPopup(false);
      setForceCanShareAfterPopup(true);
    }
    setShowPopup(true);
  };

  const continueAfterOutOfGuesses = () => {
    setShowOutOfGuesses(false);
    setIsUnlimited(true);
    setBoards((prev) => prev.map((b) => (b.isSolved ? b : { ...b, isDead: false })));
  };

  const speedrunRows = useMemo(() => {
    if (!speedrunEnabled) return [];

    if (isMarathonSpeedrun) {
      const rows = marathonStageTimes.slice();
      if (!rows.some((x) => x.boards === numBoards)) rows.push({ boards: numBoards, ms: stageElapsedMs });

      const order = new Map(marathonLevels.map((b, i) => [b, i]));
      return rows
        .slice()
        .sort((a, b) => (order.get(a.boards) ?? 999) - (order.get(b.boards) ?? 999));
    }

    return [{ boards: numBoards, ms: stageElapsedMs }];
  }, [speedrunEnabled, isMarathonSpeedrun, marathonStageTimes, numBoards, stageElapsedMs, marathonLevels]);

  const popupTotalMs =
    savedSolvedStateRef.current?.popupTotalMs !== undefined
      ? savedSolvedStateRef.current.popupTotalMs
      : speedrunEnabled
      ? isMarathonSpeedrun
        ? sumMs(speedrunRows)
        : stageElapsedMs
      : 0;

  // For marathon mode, when on the final stage, aggregate guesses/turns across
  // all stages so the final share text reflects the full run.
  const marathonShareTotals = useMemo(() => {
    if (mode !== "marathon") return null;
    // Only compute marathon totals on the final stage, or when the player has
    // chosen to exit after running out of guesses (so we can share partial
    // marathon progress even if there are more stages remaining).
    if (marathonHasNext && !forceCanShareAfterPopup) return null;

    try {
      return buildMarathonShareTotals(marathonLevels, speedrunEnabled, maxTurns);
    } catch (err) {
      // Fall back to current-stage numbers if aggregation fails for any reason.
      logError(err, 'GameSinglePlayer.buildMarathonShareTotals');
      return null;
    }
  }, [
    mode,
    marathonHasNext,
    marathonLevels,
    speedrunEnabled,
    maxTurns,
    // Recompute when boards become solved so final stage data is included,
    // or when we flip into "share partial marathon" mode after exiting.
    solvedCount,
    allSolved,
    forceCanShareAfterPopup,
  ]);

  const shareText = useMemo(() => {
    if (!boards || boards.length === 0) {
      return "Play Wuzzle Games!";
    }

    const isMarathon = mode === "marathon";
    const useTotals =
      isMarathon &&
      marathonShareTotals &&
      (!marathonHasNext || forceCanShareAfterPopup);

    const effectiveNumBoards = useTotals
      ? marathonShareTotals.totalBoards
      : numBoards;
    const effectiveTurnsUsed = useTotals
      ? marathonShareTotals.totalTurnsUsed
      : turnsUsed;
    const effectiveMaxTurns = useTotals
      ? marathonShareTotals.totalMaxTurns
      : maxTurns;
    const effectiveSolvedCount = useTotals
      ? marathonShareTotals.totalSolvedCount
      : solvedCount;
    const effectiveAllSolved = useTotals
      ? marathonShareTotals.totalSolvedCount === marathonShareTotals.totalBoards
      : allSolved;

    return generateShareText(
      boards,
      mode,
      effectiveNumBoards,
      speedrunEnabled,
      stageElapsedMs,
      popupTotalMs,
      formatElapsed,
      effectiveTurnsUsed,
      effectiveMaxTurns,
      effectiveAllSolved,
      effectiveSolvedCount,
      // For marathon final-stage sharing, include detailed per-stage breakdown
      // so the share text can list each stage separately.
      marathonShareTotals?.stages ?? null
    );
  }, [
    boards,
    mode,
    numBoards,
    speedrunEnabled,
    stageElapsedMs,
    popupTotalMs,
    turnsUsed,
    maxTurns,
    allSolved,
    solvedCount,
    marathonShareTotals,
    marathonHasNext,
    forceCanShareAfterPopup,
  ]);

  const { handleShare } = useShare(shareText, setTimedMessage);

  const getModeLabel = () => {
    const modeLabel = mode === "marathon" ? "Marathon" : mode === "daily" ? "Daily" : mode === "solutionhunt" ? "Solution Hunt" : "Game";
    const variant = speedrunEnabled ? " Speedrun" : " Standard";
    return `${modeLabel}${variant}`;
  };

  const pageTitle = archiveDate
    ? `Archive ${formatArchiveDate(archiveDate)} – ${getModeLabel()} | Wuzzle Games`
    : mode === "marathon"
      ? "Marathon & Speedrun – Multi‑Board Game | Wuzzle Games"
      : mode === "daily"
      ? "Daily Multi‑Board Wordle-Style Game – Wuzzle Games"
      : mode === "solutionhunt"
      ? "Daily Solution Hunt – Word Puzzle Helper | Wuzzle Games"
      : "Game – Wuzzle Games";

  const pageDescription =
    archiveDate
      ? `Play the Wuzzle Games ${getModeLabel()} puzzle from ${formatArchiveDate(archiveDate)}.`
      : mode === "marathon"
      ? "Play Wuzzle Games marathon and speedrun modes with multi-board Wordle-style puzzles, cumulative times and increasing difficulty across stages."
      : mode === "daily"
      ? "Play Wuzzle Games daily multi-board Wordle-style puzzles with standard and speedrun options, tracking your guesses and scores across boards."
      : mode === "solutionhunt"
      ? "Play Wuzzle Games Solution Hunt: a daily word puzzle that shows all possible remaining words based on your guesses. Perfect for learning and improving your strategy."
      : "Play Wuzzle Games game modes including daily, marathon, speedrun and multi-board Wordle-style puzzles.";

  // Show comments only once the stage is definitively completed for the day
  // (after the end-of-game popup has been shown at least once), so that
  // they do not appear while the player is still deciding whether to
  // continue after running out of guesses.
  const shouldShowComments =
    hasCompletedStage && (mode === "daily" || mode === "marathon" || mode === "solutionhunt");

  const commentsThreadId = shouldShowComments
    ? makeSolvedKey(
        mode,
        numBoards,
        speedrunEnabled,
        mode === "marathon" ? marathonIndex : null,
        getCurrentDateString()
      )
    : null;

  // In test environments we skip the full‑screen loading fallback so tests can
  // render the game view immediately without depending on environment globals.
  const isTestEnv =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.MODE === "test" || import.meta.env.TEST === true);

  const hasWordListError = !isLoading && boards.length === 0;

  if (isLoading && !isTestEnv) {
    return (
      <>
        <Helmet>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
        </Helmet>
        <div className="loadingContainer">
          Loading Wuzzle dictionaries...
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>
      <SinglePlayerGameView
        mode={mode}
        numBoards={numBoards}
        speedrunEnabled={speedrunEnabled}
        archiveDate={archiveDate}
        allSolved={allSolved}
        finished={finished}
        solutionsText={solutionsText}
        message={message}
        boards={boards}
        maxTurns={maxTurns}
        turnsUsed={turnsUsed}
        isUnlimited={isUnlimited}
        currentGuess={currentGuess}
        invalidCurrentGuess={invalidCurrentGuess}
        revealId={revealId}
        selectedBoardIndex={selectedBoardIndex}
        setSelectedBoardIndex={setSelectedBoardIndex}
        boardRefs={boardRefs}
        gridCols={gridCols}
        gridRows={gridRows}
        perBoardLetterMaps={perBoardLetterMaps}
        focusedLetterMap={focusedLetterMap}
        showNextStageBar={showNextStageBar}
        marathonNextBoards={marathonNextBoards}
        goNextStage={goNextStage}
        showBoardSelector={showBoardSelector}
        setShowBoardSelector={setShowBoardSelector}
        statusText={statusText}
        showOutOfGuesses={showOutOfGuesses}
        exitFromOutOfGuesses={exitFromOutOfGuesses}
        continueAfterOutOfGuesses={continueAfterOutOfGuesses}
        showPopup={showPopup}
        stageElapsedMs={stageElapsedMs}
        popupTotalMs={popupTotalMs}
        formatElapsed={formatElapsed}
        solvedCount={solvedCount}
        marathonHasNext={marathonHasNext}
        handleShare={handleShare}
        freezeStageTimer={freezeStageTimer}
        isMarathonSpeedrun={isMarathonSpeedrun}
        commitStageIfNeeded={commitStageIfNeeded}
        handleVirtualKey={handleVirtualKey}
        allowNextStageAfterPopup={allowNextStageAfterPopup}
        showFeedbackModal={showFeedbackModal}
        setShowFeedbackModal={setShowFeedbackModal}
        setShowPopup={setShowPopup}
        setShowOutOfGuesses={setShowOutOfGuesses}
        showComments={shouldShowComments}
        commentThreadId={commentsThreadId}
        canShare={canShare}
        streakLabel={streakLabel}
        countdownRemaining={countdownRemaining}
        wordListError={
          hasWordListError
            ? "Failed to load word lists. Please check your connection and try again."
            : null
        }
        onRetryWordLists={() => window.location.reload()}
        // Solution Hunt mode props
        isSolutionHuntMode={isSolutionHuntMode}
        showSolutionHuntModal={showSolutionHuntModal}
        setShowSolutionHuntModal={setShowSolutionHuntModal}
        filteredSolutionWords={filteredSolutionWords}
        totalSolutionWords={answerWords.length}
        onSelectSolutionWord={handleSelectSolutionWord}
      />

        <SubscribeModal
          isOpen={showSubscribeModal}
          onRequestClose={() => {
            setShowSubscribeModal(false);
            if (archiveDate) {
              if (subscribeCloseRedirectRef.current) clearTimeout(subscribeCloseRedirectRef.current);
              subscribeCloseRedirectRef.current = setTimeout(() => {
                subscribeCloseRedirectRef.current = null;
                // Only redirect if still not subscribed (avoids redirect when race resolved)
                if (!subscriptionStateRef.current.isSubscribed) navigate('/profile');
              }, 1000);
            }
          }}
          onSubscriptionComplete={() => {
            setShowSubscribeModal(false);
          }}
        />
    </>
  );
}
