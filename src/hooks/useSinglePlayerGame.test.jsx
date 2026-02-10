import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/persist', () => ({
  loadJSON: vi.fn(),
  makeSolvedKey: vi.fn(() => 'SOLVED_KEY'),
}));

vi.mock('../lib/wordle', () => ({
  WORD_LENGTH: 5,
  getMaxTurns: vi.fn(() => 10),
  createBoardState: vi.fn((solution) => ({ solution })),
}));

vi.mock('../lib/wordLists', () => ({
  loadWordLists: vi.fn(async () => ({
    ANSWER_WORDS: ['APPLE', 'BERRY', 'CHERRY'],
    ALLOWED_GUESSES: ['APPLE', 'BERRY', 'CHERRY'],
  })),
}));

vi.mock('../lib/dailyWords', () => ({
  selectDailyWords: vi.fn(() => ['APPLE', 'BERRY']),
  getCurrentDateString: vi.fn(() => '2024-01-01'),
}));

vi.mock('../lib/gameConstants', () => ({
  FLIP_COMPLETE_MS: 100,
  DEFAULT_MAX_TURNS: 6,
  LONG_MESSAGE_TIMEOUT_MS: 10000,
}));

// useSinglePlayerGame now consults useAuth to decide whether to load/save
// progress from Firebase. For these unit tests we always behave as a guest.
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('../lib/singlePlayerStore', () => ({
  loadSolvedState: vi.fn(async () => null),
  loadGameState: vi.fn(async () => null),
  saveSolvedState: vi.fn(async () => {}),
  saveGameState: vi.fn(async () => {}),
}));

import { loadJSON } from '../lib/persist';
import { loadWordLists } from '../lib/wordLists';
import { selectDailyWords } from '../lib/dailyWords';
import { getMaxTurns, createBoardState } from '../lib/wordle';
import { loadGameState, loadSolvedState } from '../lib/singlePlayerStore';
import { useSinglePlayerGame } from './useSinglePlayerGame';

beforeEach(() => {
  vi.clearAllMocks();
});

function createRefs() {
  return {
    savedSolvedStateRef: { current: null },
    stageStartRef: { current: null },
    stageEndRef: { current: null },
    committedRef: { current: false },
    committedStageMsRef: { current: 0 },
  };
}

describe('useSinglePlayerGame', () => {
  it('initializes a new daily game when there is no saved or solved state', async () => {
    /** @type {any} */ (loadJSON).mockReturnValueOnce(null); // solved state
    /** @type {any} */ (loadJSON).mockReturnValueOnce(null); // saved game state

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
    const setStageTimerSeed = vi.fn();

    const refs = createRefs();

    const { rerender } = renderHook((props) => useSinglePlayerGame(props), {
      initialProps: {
        mode: 'daily',
        speedrunEnabled: false,
        numBoards: 2,
        marathonIndex: 0,
        getGameStateKey: () => 'GAME_STATE_KEY',
        ...refs,
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
      },
    });

    // Allow async init to complete
    await waitFor(() => {
      expect(setBoards).toHaveBeenCalled();
    });

    expect(loadWordLists).toHaveBeenCalledTimes(1);
    expect(selectDailyWords).toHaveBeenCalledWith(
      ['APPLE', 'BERRY', 'CHERRY'],
      2,
      'daily',
      false,
      null,
      [1, 2, 3, 4], // marathonLevels parameter
    );

    expect(setBoards).toHaveBeenCalledWith([
      { solution: 'APPLE' },
      { solution: 'BERRY' },
    ]);

    expect(getMaxTurns).toHaveBeenCalledWith(2);
    expect(setMaxTurns).toHaveBeenCalledWith(10);
    expect(setIsUnlimited).toHaveBeenCalledWith(false);

    // Changing numBoards should trigger re-init
    rerender({
      mode: 'daily',
      speedrunEnabled: false,
      numBoards: 3,
      marathonIndex: 0,
      getGameStateKey: () => 'GAME_STATE_KEY',
      ...refs,
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
    });
  });

  it('replays solved state and schedules popup when mode already solved', async () => {
    const solvedBoards = [
      { isSolved: true, lastRevealId: null },
      { isSolved: true, lastRevealId: null },
    ];

    const solvedState = {
      allSolved: true,
      boards: solvedBoards,
      stageElapsedMs: 1234,
    };

    /** @type {any} */ (loadSolvedState).mockResolvedValueOnce(solvedState);

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
    const setStageTimerSeed = vi.fn();

    const refs = createRefs();

    renderHook((props) => useSinglePlayerGame(props), {
      initialProps: {
        mode: 'daily',
        speedrunEnabled: true,
        numBoards: 2,
        marathonIndex: 0,
        getGameStateKey: () => 'GAME_STATE_KEY',
        ...refs,
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
      },
    });

    await waitFor(() => {
      expect(setBoards).toHaveBeenCalled();
    });

    // savedSolvedStateRef should be patched with lastRevealId for solved boards
    expect(refs.savedSolvedStateRef.current).not.toBeNull();
    const patchedBoards = refs.savedSolvedStateRef.current.boards;
    expect(patchedBoards[0].lastRevealId).toBe(1);
    expect(patchedBoards[1].lastRevealId).toBe(1);

    // Popup should be scheduled after FLIP_COMPLETE_MS (100ms)
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(setShowPopup).toHaveBeenCalledWith(true);
  });

  it('resumes an in-progress saved speedrun game instead of starting a new one', async () => {
    /** @type {any} */ (loadJSON).mockReturnValueOnce(null); // no solved state

    const partialBoard = {
      solution: 'APPLE',
      guesses: [
        { word: 'OTHER', colors: ['grey', 'grey', 'grey', 'grey', 'grey'] },
      ],
      isSolved: false,
      isDead: false,
      lastRevealId: 1,
    };

    const savedGameState = {
      boards: [partialBoard],
      currentGuess: 'AP',
      isUnlimited: true,
      maxTurns: 12,
      stageStartTime: 1_000,
      stageElapsedMs: 2_000,
      committedStageMs: 0,
      revealId: 3,
    };

    // Mock loadGameState to return the saved game state
    /** @type {any} */ (loadGameState).mockResolvedValueOnce(savedGameState);

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
    const setStageTimerSeed = vi.fn();

    const refs = createRefs();

    // Provide a stable Date.now so we can assert timer restoration
    vi.setSystemTime(10_000);

    renderHook((props) => useSinglePlayerGame(props), {
      initialProps: {
        mode: 'daily',
        speedrunEnabled: true,
        numBoards: 1,
        marathonIndex: 0,
        getGameStateKey: () => 'GAME_STATE_KEY',
        ...refs,
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
      },
    });

    await waitFor(() => {
      expect(setBoards).toHaveBeenCalledWith(savedGameState.boards);
    });

    expect(setCurrentGuess).toHaveBeenCalledWith('AP');
    expect(setMaxTurns).toHaveBeenCalledWith(12);
    expect(setIsUnlimited).toHaveBeenCalledWith(true);
    expect(setSelectedBoardIndex).toHaveBeenCalledWith(null);
    expect(setRevealId).toHaveBeenCalledWith(3);
    expect(setIsFlipping).toHaveBeenCalledWith(false);
    expect(setShowPopup).toHaveBeenCalledWith(false);
    expect(setShowOutOfGuesses).toHaveBeenCalledWith(false);
    expect(setMessage).toHaveBeenCalledWith('');
    expect(clearMessageTimer).toHaveBeenCalled();

    // Allowed guesses should be restored, but a brand new game should not be started
    expect(loadWordLists).toHaveBeenCalledTimes(1);
    expect(selectDailyWords).not.toHaveBeenCalled();
    expect(createBoardState).not.toHaveBeenCalled();

    // Timer state should be resumed in-progress via the stage timer hook.
    expect(setStageTimerSeed).toHaveBeenCalledWith({ elapsedMs: 2_000, frozen: false });
    expect(refs.committedRef.current).toBe(false);
    expect(refs.committedStageMsRef.current).toBe(0);

    // Loading should be cleared
    expect(setIsLoading).toHaveBeenCalledWith(false);
  });
});
