import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSinglePlayerGame } from './useSinglePlayerGame';

vi.mock('../lib/persist', () => ({
  loadJSON: vi.fn(),
  makeSolvedKey: vi.fn(() => 'SOLVED_KEY'),
}));

vi.mock('../lib/wordLists', () => ({
  loadWordLists: vi.fn(async () => ({ ANSWER_WORDS: [], ALLOWED_GUESSES: [] })),
}));

vi.mock('../lib/dailyWords', () => ({
  selectDailyWords: vi.fn(() => []),
  getCurrentDateString: vi.fn(() => '2026-01-11'),
}));

vi.mock('../lib/gameConstants', () => ({
  FLIP_COMPLETE_MS: 100,
}));

// Ensure useSinglePlayerGame behaves as a guest during these tests so it
// never attempts to talk to Firebase.
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

import { loadJSON } from '../lib/persist';

describe('useSinglePlayerGame resumed completed stage behaviour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (loadJSON.mockReset) {
      loadJSON.mockReset();
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setupHookWithSolvedState(solvedState) {
    loadJSON.mockImplementation((key, fallback) => {
      // First load is the solvedKey lookup, which should return our solvedState.
      if (fallback === null) {
        return solvedState;
      }
      return fallback;
    });

    const savedSolvedStateRef = { current: null };
    const stageStartRef = { current: null };
    const stageEndRef = { current: null };
    const committedRef = { current: false };
    const committedStageMsRef = { current: 0 };

    const setBoards = vi.fn();
    const setCurrentGuess = vi.fn();
    const setMessage = vi.fn();
    const clearMessageTimer = vi.fn();
    const setShowOutOfGuesses = vi.fn();
    const setIsUnlimited = vi.fn();
    const setSelectedBoardIndex = vi.fn();
    const setRevealId = vi.fn();
    const setIsFlipping = vi.fn();
    const setMaxTurns = vi.fn();
    const setAllowedSet = vi.fn();
    const setIsLoading = vi.fn();
    const setShowPopup = vi.fn();
    const setTimedMessage = vi.fn();

    const getGameStateKey = () => 'GAME_KEY';

    renderHook(() =>
      useSinglePlayerGame({
        mode: 'marathon',
        speedrunEnabled: false,
        numBoards: 2,
        marathonIndex: 0,
        getGameStateKey,
        savedSolvedStateRef,
        stageStartRef,
        stageEndRef,
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
      }),
    );

    // Let async initGame resolve and the popup timeout fire.
    return {
      savedSolvedStateRef,
      stageStartRef,
      stageEndRef,
      committedRef,
      committedStageMsRef,
      setBoards,
      setShowPopup,
      setIsLoading,
    };
  }

  it('shows popup on init when resuming a stage that was exited after out-of-guesses', async () => {
    const solvedState = {
      boards: [
        { solution: 'APPLE', guesses: [], isSolved: false, isDead: true },
        { solution: 'BERRY', guesses: [], isSolved: false, isDead: true },
      ],
      turnsUsed: 6,
      maxTurns: 6,
      allSolved: false,
      solvedCount: 0,
      stageElapsedMs: 12345,
      popupTotalMs: 0,
      exitedDueToOutOfGuesses: true,
    };

    const { setBoards, setShowPopup, setIsLoading } = setupHookWithSolvedState(solvedState);

    // Allow async path + timeout to complete.
    await act(async () => {
      vi.runAllTimers();
    });

    expect(setBoards).toHaveBeenCalledTimes(1);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    // Popup should be shown on load so the user sees the end-of-stage state
    // instead of an in-progress grid.
    expect(setShowPopup).toHaveBeenCalled();
  });

  it('marks lastRevealId for all guessed boards when resuming out-of-guesses exit', async () => {
    const solvedState = {
      boards: [
        { solution: 'APPLE', guesses: [{ word: 'APPLE', colors: [] }], isSolved: true, isDead: false },
        { solution: 'BERRY', guesses: [{ word: 'OTHER', colors: [] }], isSolved: false, isDead: true },
      ],
      turnsUsed: 6,
      maxTurns: 6,
      allSolved: false,
      solvedCount: 1,
      stageElapsedMs: 12345,
      popupTotalMs: 0,
      exitedDueToOutOfGuesses: true,
    };

    const { setBoards } = setupHookWithSolvedState(solvedState);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(setBoards).toHaveBeenCalledTimes(1);
    const patchedBoards = setBoards.mock.calls[0][0];
    expect(patchedBoards).toHaveLength(2);
    // Both boards have at least one guess, so both should have lastRevealId set
    // to a non-null value so their final rows can replay the flip animation.
    expect(patchedBoards[0].lastRevealId).not.toBeNull();
    expect(patchedBoards[1].lastRevealId).not.toBeNull();
  });
});
