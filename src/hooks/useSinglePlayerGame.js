import { useEffect, useRef } from "react";
import { loadJSON, makeSolvedKey } from "../lib/persist";
import { getMaxTurns, createBoardState } from "../lib/wordle";
import { loadWordLists } from "../lib/wordLists";
import { selectDailyWords, getCurrentDateString } from "../lib/dailyWords";
import { FLIP_COMPLETE_MS, LONG_MESSAGE_TIMEOUT_MS } from "../lib/gameConstants";
import { useAuth } from "./useAuth";
import { database } from "../config/firebase";
import { loadSolvedState, loadGameState } from "../lib/singlePlayerStore";
import { formatError, logError } from "../lib/errorUtils";

function applySolvedCommitState({ speedrunEnabled, solvedState, committedRef, committedStageMsRef, setStageTimerSeed }) {
  const elapsed = (solvedState && solvedState.stageElapsedMs) || 0;

  if (typeof setStageTimerSeed === "function") {
    setStageTimerSeed({ elapsedMs: elapsed, frozen: !!speedrunEnabled });
  }

  if (speedrunEnabled) {
    committedRef.current = true;
    committedStageMsRef.current = elapsed;
  } else {
    committedRef.current = false;
    committedStageMsRef.current = 0;
  }
}

function applySavedGameCommitState({ speedrunEnabled, savedGameState, committedRef, committedStageMsRef, setStageTimerSeed }) {
  if (!speedrunEnabled || !savedGameState) {
    committedRef.current = false;
    committedStageMsRef.current = 0;
    if (typeof setStageTimerSeed === "function") {
      const elapsed = (savedGameState && savedGameState.stageElapsedMs) || 0;
      setStageTimerSeed({ elapsedMs: elapsed, frozen: false });
    }
    return;
  }

  const elapsed = savedGameState.stageElapsedMs || 0;
  const fullyCommitted =
    savedGameState.stageElapsedMs > 0 &&
    savedGameState.stageElapsedMs === savedGameState.committedStageMs;

  if (typeof setStageTimerSeed === "function") {
    setStageTimerSeed({ elapsedMs: elapsed, frozen: !!fullyCommitted });
  }

  committedRef.current = !!fullyCommitted;
  committedStageMsRef.current = fullyCommitted
    ? savedGameState.committedStageMs || elapsed
    : 0;
}

/**
 * Encapsulates single-player (non-multiplayer) game initialization and resume logic.
 */
export function useSinglePlayerGame({
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
  archiveDate = null, // Optional: date string (YYYY-MM-DD) for archive games
  setAnswerWords = null, // Optional: for Solution Hunt mode to filter possible words
}) {
  const { user: authUser, loading: authLoading } = useAuth();
  // Note: We can't use useSubscription here directly due to hook rules,
  // so we'll check premium access in the component level
  const flipPopupTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    // Defer initialization until Firebase auth has resolved so we know
    // whether to use remote or local state.
    if (authLoading) return;

    async function initGame() {
      // Premium check for archive games is handled at component level
      // Archive games require signed-in user
      if (archiveDate && !authUser) {
        if (isMountedRef.current) {
          setIsLoading(false);
          setTimedMessage('You must be signed in to play archive games.', 5000);
        }
        return;
      }

      try {
        if (isMountedRef.current) setIsLoading(true);

        // For archive games, use archiveDate; for regular games, use current date
        const dateString = archiveDate || getCurrentDateString();
        const solvedKey = makeSolvedKey(
          mode,
          numBoards,
          speedrunEnabled,
          mode === "marathon" ? marathonIndex : null,
          dateString
        );

        const solvedState = await loadSolvedState({
          authUser,
          database,
          solvedKey,
        });

        // Only use a solved state if it matches the current configuration.
        // This prevents old/local-storage states with a different board count
        // from leaking into new games (e.g., seeing 2 boards when selecting 1).
        const solvedBoardsCount =
          solvedState && Array.isArray(solvedState.boards)
            ? solvedState.boards.length
            : 0;
        const solvedMatchesConfig =
          solvedBoardsCount > 0 && solvedBoardsCount === numBoards;

        if (solvedState && solvedMatchesConfig) {
          // Mode already has a completed stage state (either fully solved or
          // exited after running out of guesses). Load saved state and show
          // the end-of-game popup instead of resuming an in-progress board.
          const rawBoards = Array.isArray(solvedState.boards)
            ? solvedState.boards
            : [];

          const exitedDueToOutOfGuesses = !!solvedState.exitedDueToOutOfGuesses;

          // Apply commit state + timer seeding for solved snapshots via a
          // shared helper so marathon display logic stays consistent.
          applySolvedCommitState({
            speedrunEnabled,
            solvedState,
            committedRef,
            committedStageMsRef,
            setStageTimerSeed,
          });

          // Use a shared non-zero reveal id and assign it to all relevant boards so
          // their final row replays the flip once when the page is opened.
          const replayRevealId = 1;
          const patchedBoards = rawBoards.map((b) => {
            if (!b) return b;

            // For fully solved stages, only re-flip solved boards.
            if (!exitedDueToOutOfGuesses && b.isSolved) {
              return { ...b, lastRevealId: replayRevealId };
            }

            // For stages exited after running out of guesses, re-flip any board
            // that has at least one guess so the player sees the final row
            // animation again, even if the board is marked dead.
            if (exitedDueToOutOfGuesses && Array.isArray(b.guesses) && b.guesses.length > 0) {
              return { ...b, lastRevealId: replayRevealId };
            }

            // Preserve any existing lastRevealId for other boards (defensive).
            return { ...b, lastRevealId: b.lastRevealId ?? null };
          });

          const patchedSolvedState = { ...solvedState, boards: patchedBoards };
          savedSolvedStateRef.current = patchedSolvedState;
          setBoards(patchedBoards);
          setCurrentGuess("");
          setMessage("");
          clearMessageTimer();
          setShowOutOfGuesses(false);
          setIsUnlimited(false);
          setSelectedBoardIndex(null);

          // Set revealId to match patched boards so solved rows flip once on load.
          setRevealId(replayRevealId);
          setIsFlipping(false);

          const turns = getMaxTurns(numBoards);
          setMaxTurns(turns);

          const { ALLOWED_GUESSES, ANSWER_WORDS } = await loadWordLists();
          setAllowedSet(new Set(ALLOWED_GUESSES));
          
          // For Solution Hunt mode, pass the answer words for filtering
          if (mode === 'solutionhunt' && typeof setAnswerWords === 'function') {
            setAnswerWords(ANSWER_WORDS);
          }

          setIsLoading(false);

          if (exitedDueToOutOfGuesses) {
            // When resuming a stage that ended due to running out of guesses,
            // show the popup immediately so the user sees the end-of-stage state
            // instead of an in-progress grid.
            setShowPopup(true);
          } else {
            // For fully solved stages, delay popup to ensure any potential
            // animations are complete before showing the results.
            if (flipPopupTimeoutRef.current) clearTimeout(flipPopupTimeoutRef.current);
            flipPopupTimeoutRef.current = setTimeout(() => {
              flipPopupTimeoutRef.current = null;
              if (isMountedRef.current) setShowPopup(true);
            }, FLIP_COMPLETE_MS);
          }
          return;
        }

        // Reset saved state ref when starting a new game
        savedSolvedStateRef.current = null;

        // Handle archive games
        let archiveGameState = null;
        if (archiveDate && authUser) {
          const { loadArchiveGameState } = await import('../lib/archiveService');
          archiveGameState = await loadArchiveGameState({
            uid: authUser.uid,
            mode,
            speedrunEnabled,
            dateString: archiveDate,
          });
        }

        // Check if there's an incomplete game state to resume (regular or archive)
        // For archive games only use archiveGameState; getGameStateKey() uses current date,
        // so loading it would load today's state and can trigger validation errors.
        const gameStateKey = getGameStateKey();
        const savedGameState = archiveGameState || (archiveDate ? null : await loadGameState({
          authUser,
          database,
          gameStateKey,
        }));

        const savedBoardsCount =
          savedGameState && Array.isArray(savedGameState.boards)
            ? savedGameState.boards.length
            : 0;
        const savedMatchesConfig =
          savedBoardsCount > 0 && savedBoardsCount === numBoards;

        if (savedGameState && savedMatchesConfig) {
          // Check if the saved state matches current configuration
          const allSolvedInSaved = savedGameState.boards.every((b) => b.isSolved);
          if (!allSolvedInSaved) {
            // Resume incomplete game
            const { ALLOWED_GUESSES, ANSWER_WORDS } = await loadWordLists();
            setAllowedSet(new Set(ALLOWED_GUESSES));
            
            // For Solution Hunt mode, pass the answer words for filtering
            if (mode === 'solutionhunt' && typeof setAnswerWords === 'function') {
              setAnswerWords(ANSWER_WORDS);
            }

            setBoards(savedGameState.boards);
            setCurrentGuess(savedGameState.currentGuess || "");
            setMaxTurns(savedGameState.maxTurns || getMaxTurns(numBoards));
            setIsUnlimited(savedGameState.isUnlimited || false);
            setSelectedBoardIndex(null);

            // Restore timing/commit state based solely on persisted elapsed time
            // and commit markers; the actual ticking is owned by useStageTimer
            // via setStageTimerSeed.
            applySavedGameCommitState({
              speedrunEnabled,
              savedGameState,
              committedRef,
              committedStageMsRef,
              setStageTimerSeed,
            });

            setRevealId(savedGameState.revealId || 0);
            setIsFlipping(false); // No animation in progress when resuming
            setShowPopup(false);
            setShowOutOfGuesses(false);
            setMessage("");
            clearMessageTimer();

            setIsLoading(false);
            return;
          }
        }

        // No saved state - start new game (or archive game)
        const { ANSWER_WORDS, ALLOWED_GUESSES } = await loadWordLists();
        setAllowedSet(new Set(ALLOWED_GUESSES));
        
        // For Solution Hunt mode, pass the answer words for filtering
        if (mode === 'solutionhunt' && typeof setAnswerWords === 'function') {
          setAnswerWords(ANSWER_WORDS);
        }

        const turns = getMaxTurns(numBoards);
        setMaxTurns(turns);

        // For archive games, load solution words from archive or seed on demand
        const marathonIndexForSeed = mode === "marathon" ? marathonIndex : null;
        const marathonLevelsForSelection = mode === "marathon" ? (marathonLevels || [1, 2, 3, 4]) : [1, 2, 3, 4];
        let dailySolutions;
        if (archiveDate) {
          const { loadArchiveSolution, saveArchiveSolution } = await import('../lib/archiveService');
          const archiveSolutions = await loadArchiveSolution({
            mode,
            speedrunEnabled,
            dateString: archiveDate,
          });

          if (archiveSolutions && archiveSolutions.length >= numBoards) {
            dailySolutions = archiveSolutions.slice(0, numBoards);
          } else {
            // Seed on demand: compute solutions for this date, save to Firebase, then use
            dailySolutions = selectDailyWords(
              ANSWER_WORDS,
              numBoards,
              mode,
              speedrunEnabled,
              marathonIndexForSeed,
              marathonLevelsForSelection,
              archiveDate
            );
            await saveArchiveSolution({
              mode,
              speedrunEnabled,
              dateString: archiveDate,
              solutions: dailySolutions,
              numBoards,
            });
          }
        } else {
          // Regular game - select daily words deterministically based on current date
          dailySolutions = selectDailyWords(
            ANSWER_WORDS,
            numBoards,
            mode,
            speedrunEnabled,
            marathonIndexForSeed,
            marathonLevelsForSelection
          );
        }
        
        const newBoards = dailySolutions.map((solution) => createBoardState(solution));

        setBoards(newBoards);
        setCurrentGuess("");
        setMessage("");
        clearMessageTimer();
        setShowPopup(false);
        setShowOutOfGuesses(false);

        // Speedrun starts unlimited immediately
        setIsUnlimited(!!speedrunEnabled);
        setSelectedBoardIndex(null);

        // Reset commit guard for each new stage; actual timing is owned by the
        // stage timer hook seeded via setStageTimerSeed.
        committedRef.current = false;
        committedStageMsRef.current = 0;

        if (typeof setStageTimerSeed === "function") {
          setStageTimerSeed({ elapsedMs: 0, frozen: false });
        }

        // Reset flip id and state
        setRevealId(0);
        setIsFlipping(false);

        setIsLoading(false);
      } catch (error) {
        logError(error, 'useSinglePlayerGame.initGame');
        if (isMountedRef.current) {
          setIsLoading(false);
          const errorMessage = formatError(error) || "Failed to load word lists. Please refresh the page.";
          setTimedMessage(errorMessage, LONG_MESSAGE_TIMEOUT_MS);
        }
      }
    }

    initGame();

    return () => {
      isMountedRef.current = false;
      if (flipPopupTimeoutRef.current) {
        clearTimeout(flipPopupTimeoutRef.current);
        flipPopupTimeoutRef.current = null;
      }
    };
    // initGame uses stable imports (loadWordLists, loadGameState, selectDailyWords, etc.),
    // refs (isMountedRef, committedRef, flipPopupTimeoutRef), and config in deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numBoards, mode, speedrunEnabled, marathonIndex, authUser, authLoading, archiveDate]);
}
