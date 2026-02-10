import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

let latestViewProps = null;
let latestUseSinglePlayerGameArgs = null;
let latestUseKeyboardArgs = null;
const mockSetTimedMessage = vi.fn();
const mockUseAuth = vi.fn(() => ({ user: null, isVerifiedUser: false }));
const submitSpeedrunScoreMock = vi.fn();

vi.mock('./SinglePlayerGameView', () => ({
  __esModule: true,
  default: (props) => {
    latestViewProps = props;
    return <div data-testid="single-player-view" />;
  },
}));

vi.mock('../../hooks/useSinglePlayerGame', () => ({
  useSinglePlayerGame: (args) => {
    latestUseSinglePlayerGameArgs = args;
    // Provide default state to avoid breaking later calls
    return {
      boards: [],
      currentGuess: '',
      turnsUsed: 0,
      maxTurns: 5,
      allSolved: false,
      finished: false,
      canShare: false,
      showPopup: false,
      showOutOfGuesses: false,
      commentThreadId: null,
      showComments: false,
      allowNextStageAfterPopup: true,
      exitFromOutOfGuesses: () => {},
      handleVirtualKey: () => {},
    };
  },
}));

vi.mock('../../hooks/useTimedMessage', () => ({
  useTimedMessage: () => ({
    message: '',
    setMessage: vi.fn(),
    setTimedMessage: mockSetTimedMessage,
    clearMessageTimer: vi.fn(),
  }),
}));

vi.mock('../../hooks/useShare', () => ({
  useShare: () => ({ handleShare: vi.fn() }),
}));

vi.mock('../../lib/persist', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Override only the pieces we need to control in these tests while keeping
    // other helpers like loadStreak/makeStreakKey/updateStreakOnWin available.
    loadJSON: vi.fn(() => ({ index: 0, cumulativeMs: 0, stageTimes: [] })),
    saveJSON: vi.fn(),
    makeSolvedKey: vi.fn(() => 'SOLVED_KEY'),
    makeDailyKey: vi.fn(() => 'DAILY_KEY'),
    makeMarathonKey: vi.fn(() => 'MARATHON_KEY'),
    marathonMetaKey: vi.fn(() => 'META_KEY'),
  };
});

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../hooks/useSubscription', () => ({
  useSubscription: () => ({ isSubscribed: false, showSubscriptionGate: false }),
}));

vi.mock('../../hooks/useLeaderboard', () => ({
  submitSpeedrunScore: (...args) => {
    submitSpeedrunScoreMock(...args);
    return Promise.resolve();
  },
}));

// Capture how GameSinglePlayer wires callbacks into the keyboard hook.
vi.mock('../../hooks/useKeyboard', () => ({
  useKeyboard: (args) => {
    latestUseKeyboardArgs = args;
  },
}));

// Mock share-text helper; score helpers are no longer used. Keep other
// exports (like buildMarathonShareTotals) from the real module so marathon
// aggregation behaviour can still be exercised.
vi.mock('../../lib/gameUtils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generateShareText: vi.fn(() => 'Play Wuzzle Games!'),
  };
});

import GameSinglePlayer from './GameSinglePlayer';
import { generateShareText } from '../../lib/gameUtils';
import { loadJSON, makeSolvedKey } from '../../lib/persist';

describe('GameSinglePlayer partial and full guess handling on Enter', () => {
  beforeEach(() => {
    latestViewProps = null;
    latestUseSinglePlayerGameArgs = null;
    latestUseKeyboardArgs = null;
    mockSetTimedMessage.mockClear();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ user: null, isVerifiedUser: false });
    submitSpeedrunScoreMock.mockReset();
  });

  async function renderGame() {
    render(
      <MemoryRouter
        initialEntries={['/game']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer mode="daily" boardsParam="1" speedrunEnabled={false} />
      </MemoryRouter>,
    );

    // Wait for component to initialize and props to be set
    await waitFor(() => {
      expect(latestViewProps).not.toBeNull();
    });

    return latestViewProps;
  }

  it('does nothing when Enter is pressed with 0 letters', async () => {
    const { handleVirtualKey } = await renderGame();
    expect(typeof handleVirtualKey).toBe('function');
    expect(latestViewProps.currentGuess).toBe('');

    act(() => {
      handleVirtualKey('ENTER');
    });

    // Guess remains empty and no validation message is shown.
    expect(latestViewProps.currentGuess).toBe('');
    expect(mockSetTimedMessage).not.toHaveBeenCalled();
  });

  it('clears currentGuess when Enter is pressed with fewer than 5 letters via virtual keyboard', async () => {
    const { handleVirtualKey } = await renderGame();

    act(() => {
      handleVirtualKey('A');
      handleVirtualKey('B');
      handleVirtualKey('C');
    });

    expect(latestViewProps.currentGuess).toBe('ABC');

    act(() => {
      handleVirtualKey('ENTER');
    });

    // Partial guess should be cleared by the new behavior.
    expect(latestViewProps.currentGuess).toBe('');
  });

  it('follows normal submit path (not partial-clear) when Enter is pressed with 5 letters', async () => {
    const { handleVirtualKey } = await renderGame();

    // Simulate a 5-letter guess.
    act(() => {
      handleVirtualKey('A');
      handleVirtualKey('P');
      handleVirtualKey('P');
      handleVirtualKey('L');
      handleVirtualKey('E');
    });

    expect(latestViewProps.currentGuess).toBe('APPLE');

    act(() => {
      handleVirtualKey('ENTER');
    });

    // For an invalid word, the normal path shows a timed message and clears the guess.
    // The presence of this message confirms we did not take the new "partial clear" branch.
    expect(mockSetTimedMessage).toHaveBeenCalledWith('Not in word list.', 5000);
    expect(latestViewProps.currentGuess).toBe('');
  });

  it('treats physical Enter via useKeyboard onEnter the same as virtual Enter', async () => {
    const { handleVirtualKey } = await renderGame();

    expect(latestUseKeyboardArgs).not.toBeNull();
    const { onEnter } = latestUseKeyboardArgs;
    expect(typeof onEnter).toBe('function');

    // Partial guess: 3 letters, then physical Enter -> clears guess, no message.
    act(() => {
      handleVirtualKey('A');
      handleVirtualKey('B');
      handleVirtualKey('C');
    });
    expect(latestViewProps.currentGuess).toBe('ABC');

    mockSetTimedMessage.mockClear();
    act(() => {
      onEnter();
    });

    expect(latestViewProps.currentGuess).toBe('');
    expect(mockSetTimedMessage).not.toHaveBeenCalled();

    // Full 5-letter guess: physical Enter should follow normal submit path.
    act(() => {
      handleVirtualKey('A');
      handleVirtualKey('P');
      handleVirtualKey('P');
      handleVirtualKey('L');
      handleVirtualKey('E');
    });
    expect(latestViewProps.currentGuess).toBe('APPLE');

    mockSetTimedMessage.mockClear();
    act(() => {
      onEnter();
    });

    expect(mockSetTimedMessage).toHaveBeenCalledWith('Not in word list.', 5000);
    expect(latestViewProps.currentGuess).toBe('');
  });

  it('passes turnsUsed equal to global max guess rows across multiple boards', async () => {
    await renderGame();

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading } = latestUseSinglePlayerGameArgs;
    expect(typeof setBoards).toBe('function');
    expect(typeof setIsLoading).toBe('function');

    act(() => {
      setBoards([
        {
          guesses: [
            { word: 'APPLE', colors: [] },
            { word: 'BERRY', colors: [] },
            { word: 'CHILI', colors: [] },
          ],
          isSolved: false,
          isDead: false,
        },
        {
          guesses: [
            { word: 'DELTA', colors: [] },
            { word: 'EAGLE', colors: [] },
          ],
          isSolved: false,
          isDead: false,
        },
      ]);
      // Mark loading as finished so GameSinglePlayer renders SinglePlayerGameView
      setIsLoading(false);
    });

    // SinglePlayerGameView mock captures latest props.
    expect(latestViewProps).not.toBeNull();
    expect(latestViewProps.boards).toHaveLength(2);

    // getTurnsUsed for the above boards would be max(3, 2) = 3.
    expect(latestViewProps.turnsUsed).toBe(3);
  });

  it('marks finished true when all boards are dead (out of guesses) so UI can hide controls', async () => {
    await renderGame();

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading, setIsUnlimited } = latestUseSinglePlayerGameArgs;
    expect(typeof setBoards).toBe('function');
    expect(typeof setIsLoading).toBe('function');
    expect(typeof setIsUnlimited).toBe('function');

    act(() => {
      // All boards are dead (out of guesses) and game is not unlimited.
      setBoards([
        {
          guesses: [
            { word: 'OTHER', colors: [] },
            { word: 'OTHER', colors: [] },
          ],
          isSolved: false,
          isDead: true,
        },
        {
          guesses: [
            { word: 'OTHER', colors: [] },
          ],
          isSolved: false,
          isDead: true,
        },
      ]);
      setIsUnlimited(false);
      setIsLoading(false);
    });

    expect(latestViewProps).not.toBeNull();
    // All boards are dead, but none are solved.
    expect(latestViewProps.allSolved).toBe(false);
    // Finished should be true so the view can hide keyboard/board selector.
    expect(latestViewProps.finished).toBe(true);
  });

  it('exitFromOutOfGuesses shows popup immediately without adding a new timer', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const viewProps = await renderGame();
    expect(typeof viewProps.exitFromOutOfGuesses).toBe('function');

    const callsBefore = setTimeoutSpy.mock.calls.length;
    const showPopupBefore = viewProps.showPopup;

    act(() => {
      viewProps.exitFromOutOfGuesses();
    });

    // Latest props from the SinglePlayerGameView mock.
    expect(latestViewProps.showOutOfGuesses).toBe(false);
    expect(latestViewProps.showPopup).toBe(true);
    // No extra setTimeout call should be introduced by the exit handler.
    expect(setTimeoutSpy).toHaveBeenCalledTimes(callsBefore);

    // Sanity: previously showPopup was false.
    expect(showPopupBefore).toBe(false);

    setTimeoutSpy.mockRestore();
  });
});

describe('GameSinglePlayer marathon share gating and totals', () => {
  beforeEach(() => {
    latestViewProps = null;
    latestUseSinglePlayerGameArgs = null;
    latestUseKeyboardArgs = null;
    mockSetTimedMessage.mockClear();
    generateShareText.mockClear();
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({ user: null, isVerifiedUser: false });
    submitSpeedrunScoreMock.mockReset();

    // Reset persist mocks to their baseline behaviour for each test in this suite.
    loadJSON.mockReset();
    loadJSON.mockImplementation(() => ({ index: 0, cumulativeMs: 0, stageTimes: [] }));
    makeSolvedKey.mockReset();
    makeSolvedKey.mockImplementation(() => 'SOLVED_KEY');
  });

  async function renderMarathon({ speedrunEnabled }) {
    render(
      <MemoryRouter
        initialEntries={['/game?mode=marathon']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="marathon"
          boardsParam={null}
          speedrunEnabled={speedrunEnabled}
          marathonLevels={[1, 2]}
        />
      </MemoryRouter>,
    );

    // Wait for component to initialize
    await waitFor(() => {
      expect(latestUseSinglePlayerGameArgs).not.toBeNull();
      expect(latestViewProps).not.toBeNull();
    });

    return latestUseSinglePlayerGameArgs;
  }

  it('keeps canShare false on non-final marathon stage (standard)', async () => {
    const { setBoards, setIsLoading } = await renderMarathon({ speedrunEnabled: false });

    act(() => {
      // First stage: one board, initially unsolved.
      setBoards([
        {
          solution: 'APPLE',
          guesses: [],
          isSolved: false,
          isDead: false,
        },
      ]);
      setIsLoading(false);
    });

    // Not all solved yet, share should be disabled.
    expect(latestViewProps.canShare).toBe(false);

    act(() => {
      // Mark the only board solved; still non-final stage because marathonHasNext === true.
      setBoards([
        {
          solution: 'APPLE',
          guesses: [],
          isSolved: true,
          isDead: false,
        },
      ]);
    });

    // Even with all boards solved on a non-final stage, share stays disabled.
    expect(latestViewProps.canShare).toBe(false);
  });

  it('keeps canShare false on non-final marathon stage (speedrun)', async () => {
    const { setBoards, setIsLoading } = await renderMarathon({ speedrunEnabled: true });

    act(() => {
      setBoards([
        {
          solution: 'APPLE',
          guesses: [],
          isSolved: false,
          isDead: false,
        },
      ]);
      setIsLoading(false);
    });

    expect(latestViewProps.canShare).toBe(false);

    act(() => {
      setBoards([
        {
          solution: 'APPLE',
          guesses: [],
          isSolved: true,
          isDead: false,
        },
      ]);
    });

    expect(latestViewProps.canShare).toBe(false);
  });

  it('on final marathon stage, shareText uses aggregated totals across stages', () => {
    // Marathon meta key is always 'META_KEY' from our persist mock.
    const metaKey = 'META_KEY';

    // Configure persist mocks for this test: final stage (index 1) and
    // two solved-state entries, one per stage.
    makeSolvedKey.mockImplementation((mode, numBoards, speedrun, marathonIndex, dateString) => {
      if (mode === 'marathon') {
        return `SOLVED_STAGE_${marathonIndex}`;
      }
      return 'SOLVED_KEY';
    });

    const stage0Solved = {
      boards: [{ isSolved: true }],
      turnsUsed: 2,
      maxTurns: 5,
      solvedCount: 1,
    };
    const stage1Solved = {
      boards: [{ isSolved: true }, { isSolved: true }],
      turnsUsed: 4,
      maxTurns: 7,
      solvedCount: 2,
    };

    loadJSON.mockImplementation((key, fallback) => {
      if (key === metaKey && fallback && typeof fallback === 'object' && 'index' in fallback) {
        // Marathon meta: we are on the final stage (index 1 of [1,2]).
        return { index: 1, cumulativeMs: 0, stageTimes: [] };
      }

      if (fallback === null) {
        if (key === 'SOLVED_STAGE_0') return stage0Solved;
        if (key === 'SOLVED_STAGE_1') return stage1Solved;
        return null;
      }

      return fallback;
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=marathon']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="marathon"
          boardsParam={null}
          speedrunEnabled={false}
          marathonLevels={[1, 2]}
        />
      </MemoryRouter>,
    );

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading } = latestUseSinglePlayerGameArgs;

    act(() => {
      // Current (final) stage: 2 boards, both solved.
      setBoards([
        { solution: 'CURR1', guesses: [], isSolved: true, isDead: false },
        { solution: 'CURR2', guesses: [], isSolved: true, isDead: false },
      ]);
      setIsLoading(false);
    });

    // Expect generateShareText to have been called with aggregated totals:
    // total boards = 1 + 2 = 3, turnsUsed = 2 + 4 = 6, maxTurns = 5 + 7 = 12,
    // solvedCount = 1 + 2 = 3, allSolved = true.
    const calls = generateShareText.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const aggregatedCall = calls.find(([, mode, numBoards, , , , , turnsUsed, maxTurns, allSolved, solvedCount]) =>
      mode === 'marathon' &&
      numBoards === 3 &&
      turnsUsed === 6 &&
      maxTurns === 12 &&
      allSolved === true &&
      solvedCount === 3,
    );

    expect(aggregatedCall).toBeDefined();
  });

  it('on final 4-stage marathon, passes all stages (including stage 4) to shareText once final stage is solved', () => {
    const metaKey = 'META_KEY';

    makeSolvedKey.mockImplementation((mode, numBoards, speedrun, marathonIndex, dateString) => {
      if (mode === 'marathon') {
        return `SOLVED_STAGE_${marathonIndex}`;
      }
      return 'SOLVED_KEY';
    });

    const stage0Solved = {
      boards: [{ isSolved: true }],
      turnsUsed: 1,
      maxTurns: 4,
      solvedCount: 1,
    };
    const stage1Solved = {
      boards: [{ isSolved: true }, { isSolved: true }],
      turnsUsed: 2,
      maxTurns: 5,
      solvedCount: 2,
    };
    const stage2Solved = {
      boards: [{ isSolved: true }, { isSolved: true }, { isSolved: true }],
      turnsUsed: 3,
      maxTurns: 6,
      solvedCount: 3,
    };
    const stage3Solved = {
      boards: [
        { isSolved: true },
        { isSolved: true },
        { isSolved: true },
        { isSolved: true },
      ],
      turnsUsed: 4,
      maxTurns: 7,
      solvedCount: 4,
    };

    let stage4Available = false;

    loadJSON.mockImplementation((key, fallback) => {
      if (key === metaKey && fallback && typeof fallback === 'object' && 'index' in fallback) {
        // Marathon meta: 4 stages => final index is 3.
        return { index: 3, cumulativeMs: 0, stageTimes: [] };
      }

      if (fallback === null) {
        if (key === 'SOLVED_STAGE_0') return stage0Solved;
        if (key === 'SOLVED_STAGE_1') return stage1Solved;
        if (key === 'SOLVED_STAGE_2') return stage2Solved;
        if (key === 'SOLVED_STAGE_3') return stage4Available ? stage3Solved : null;
        return null;
      }

      return fallback;
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=marathon']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="marathon"
          boardsParam={null}
          speedrunEnabled={false}
          marathonLevels={[1, 2, 3, 4]}
        />
      </MemoryRouter>,
    );

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading } = latestUseSinglePlayerGameArgs;

    act(() => {
      // Final stage: 4 boards, initially unsolved.
      setBoards([
        { solution: 'S1', guesses: [], isSolved: false, isDead: false },
        { solution: 'S2', guesses: [], isSolved: false, isDead: false },
        { solution: 'S3', guesses: [], isSolved: false, isDead: false },
        { solution: 'S4', guesses: [], isSolved: false, isDead: false },
      ]);
      setIsLoading(false);
    });

    // Now pretend the final stage solved state has been written to storage.
    stage4Available = true;

    act(() => {
      // Mark all 4 boards solved to trigger recomputation of marathonShareTotals.
      setBoards([
        { solution: 'S1', guesses: [], isSolved: true, isDead: false },
        { solution: 'S2', guesses: [], isSolved: true, isDead: false },
        { solution: 'S3', guesses: [], isSolved: true, isDead: false },
        { solution: 'S4', guesses: [], isSolved: true, isDead: false },
      ]);
    });

    const calls = generateShareText.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];

    const marathonStagesArg = lastCall[11]; // 12th argument is marathonStages
    expect(Array.isArray(marathonStagesArg)).toBe(true);
    expect(marathonStagesArg).toHaveLength(4);
    expect(marathonStagesArg.some((st) => st.boards === 4)).toBe(true);
  });

  it('disables Next Stage after exiting out-of-guesses in marathon', async () => {
    const { setBoards, setIsLoading } = await renderMarathon({ speedrunEnabled: false });

    // Initial render: allowNextStageAfterPopup should be true.
    expect(latestViewProps.allowNextStageAfterPopup).toBe(true);
    expect(typeof latestViewProps.exitFromOutOfGuesses).toBe('function');

    act(() => {
      // Simulate boards in a "finished" state due to running out of guesses.
      setBoards([
        { solution: 'APPLE', guesses: [], isSolved: false, isDead: true },
      ]);
      setIsLoading(false);
    });

    act(() => {
      latestViewProps.exitFromOutOfGuesses();
    });

    // After exiting from out-of-guesses, the marathon popup should no longer
    // offer a Next Stage button, so allowNextStageAfterPopup becomes false.
    expect(latestViewProps.allowNextStageAfterPopup).toBe(false);
  });

  it('enables sharing after exiting out-of-guesses in marathon', async () => {
    const { setBoards, setIsLoading } = await renderMarathon({ speedrunEnabled: false });

    // Non-final marathon stage should not be shareable initially.
    expect(latestViewProps.canShare).toBe(false);

    act(() => {
      setBoards([
        { solution: 'APPLE', guesses: [], isSolved: false, isDead: true },
      ]);
      setIsLoading(false);
    });

    act(() => {
      latestViewProps.exitFromOutOfGuesses();
    });

    // After exiting from out-of-guesses, sharing should be enabled so the user
    // can copy their partial marathon result.
    expect(latestViewProps.canShare).toBe(true);
  });

  it('passes marathonStages to shareText when exiting non-final marathon stage after out-of-guesses', () => {
    const metaKey = 'META_KEY';

    // Configure solved-state keys per stage.
    makeSolvedKey.mockImplementation((mode, numBoards, speedrun, marathonIndex, dateString) => {
      if (mode === 'marathon') {
        return `SOLVED_STAGE_${marathonIndex}`;
      }
      return 'SOLVED_KEY';
    });

    const stage0Solved = {
      boards: [{ isSolved: true }],
      turnsUsed: 2,
      maxTurns: 5,
      solvedCount: 1,
    };

    loadJSON.mockImplementation((key, fallback) => {
      if (key === metaKey && fallback && typeof fallback === 'object' && 'index' in fallback) {
        // Non-final stage: index 0 for marathonLevels [1,2].
        return { index: 0, cumulativeMs: 0, stageTimes: [] };
      }

      if (fallback === null) {
        if (key === 'SOLVED_STAGE_0') return stage0Solved;
        // Next stage has no solved state yet.
        if (key === 'SOLVED_STAGE_1') return null;
        return null;
      }

      return fallback;
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=marathon']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="marathon"
          boardsParam={null}
          speedrunEnabled={false}
          marathonLevels={[1, 2]}
        />
      </MemoryRouter>,
    );

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading } = latestUseSinglePlayerGameArgs;

    act(() => {
      // Current stage (1 board) is out of guesses.
      setBoards([
        { solution: 'CURR', guesses: [], isSolved: false, isDead: true },
      ]);
      setIsLoading(false);
    });

    generateShareText.mockClear();

    act(() => {
      latestViewProps.exitFromOutOfGuesses();
    });

    const calls = generateShareText.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    const marathonStagesArg = lastCall[11]; // 12th argument is marathonStages

    expect(Array.isArray(marathonStagesArg)).toBe(true);
    expect(marathonStagesArg).toHaveLength(2);
    expect(marathonStagesArg.map((st) => st.boards)).toEqual([1, 2]);
  });

  it('shows comments after exiting out-of-guesses in marathon', async () => {
    const { setBoards, setIsLoading } = await renderMarathon({ speedrunEnabled: false });

    act(() => {
      setBoards([
        { solution: 'APPLE', guesses: [], isSolved: false, isDead: true },
      ]);
      setIsLoading(false);
    });

    // Initially, before exit, comments should be hidden.
    expect(latestViewProps.showComments).toBe(false);

    act(() => {
      latestViewProps.exitFromOutOfGuesses();
    });

    // After exiting via out-of-guesses, we show the end-of-stage popup and
    // mark the stage as completed for the day, which should enable comments.
    expect(latestViewProps.showPopup).toBe(true);
    expect(latestViewProps.showComments).toBe(true);
    expect(latestViewProps.commentThreadId).not.toBeNull();
  });

  it('enables canShare on final marathon stage when all boards are solved', () => {
    const metaKey = 'META_KEY';

    // Make marathon meta report that we are on the final stage (index 1 for [1,2]).
    loadJSON.mockImplementation((key, fallback) => {
      if (key === metaKey && fallback && typeof fallback === 'object' && 'index' in fallback) {
        return { index: 1, cumulativeMs: 0, stageTimes: [] };
      }
      return fallback;
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=marathon']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="marathon"
          boardsParam={null}
          speedrunEnabled={false}
          marathonLevels={[1, 2]}
        />
      </MemoryRouter>,
    );

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading } = latestUseSinglePlayerGameArgs;

    act(() => {
      // Final stage: 2 boards, both solved.
      setBoards([
        { solution: 'CURR1', guesses: [], isSolved: true, isDead: false },
        { solution: 'CURR2', guesses: [], isSolved: true, isDead: false },
      ]);
      setIsLoading(false);
    });

    // With mode="marathon", allSolved=true and marathonHasNext=false,
    // GameSinglePlayer should enable sharing.
    expect(latestViewProps.canShare).toBe(true);
  });
});

describe('GameSinglePlayer speedrun leaderboard submission', () => {
  beforeEach(() => {
    latestViewProps = null;
    latestUseSinglePlayerGameArgs = null;
    latestUseKeyboardArgs = null;
    mockSetTimedMessage.mockClear();
    mockUseAuth.mockReset();
    submitSpeedrunScoreMock.mockReset();
  });

  async function renderDailySpeedrun() {
    // Default auth: signed-in, verified user.
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'uid-speedrun',
        displayName: 'Speed Runner',
        email: 'speed@example.com',
      },
      isVerifiedUser: true,
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=daily']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="daily"
          boardsParam="1"
          speedrunEnabled={true}
        />
      </MemoryRouter>,
    );

    // Wait for component to initialize
    await waitFor(() => {
      expect(latestUseSinglePlayerGameArgs).not.toBeNull();
      expect(latestViewProps).not.toBeNull();
    });

    return latestUseSinglePlayerGameArgs;
  }

  it('submits daily speedrun score for verified user when all boards are solved', async () => {
    const { setBoards, setIsLoading, setAllowedSet } = await renderDailySpeedrun();

    vi.useFakeTimers();
    try {
      act(() => {
        setAllowedSet(new Set(['APPLE']));
        setBoards([
          {
            solution: 'APPLE',
            guesses: [],
            isSolved: false,
            isDead: false,
          },
        ]);
        setIsLoading(false);
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      const { handleVirtualKey } = latestViewProps;
      expect(typeof handleVirtualKey).toBe('function');

      act(() => {
        handleVirtualKey('A');
        handleVirtualKey('P');
        handleVirtualKey('P');
        handleVirtualKey('L');
        handleVirtualKey('E');
        handleVirtualKey('ENTER');
      });

      expect(submitSpeedrunScoreMock).toHaveBeenCalledTimes(1);
      const [userId, userName, modeArg, numBoardsArg, timeMsArg] =
        submitSpeedrunScoreMock.mock.calls[0];

      expect(userId).toBe('uid-speedrun');
      expect(userName).toBe('Speed Runner');
      expect(modeArg).toBe('daily');
      expect(numBoardsArg).toBe(1);
      expect(typeof timeMsArg).toBe('number');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not submit speedrun score when user is not verified', async () => {
    vi.useFakeTimers();
    mockUseAuth.mockReturnValue({
      user: {
        uid: 'uid-unverified',
        displayName: 'Unverified',
        email: 'unverified@example.com',
      },
      isVerifiedUser: false,
    });

    render(
      <MemoryRouter
        initialEntries={['/game?mode=daily']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GameSinglePlayer
          mode="daily"
          boardsParam="1"
          speedrunEnabled={true}
        />
      </MemoryRouter>,
    );

    expect(latestUseSinglePlayerGameArgs).not.toBeNull();
    const { setBoards, setIsLoading, setAllowedSet } = latestUseSinglePlayerGameArgs;

    act(() => {
      setAllowedSet(new Set(['APPLE']));
      setBoards([
        {
          solution: 'APPLE',
          guesses: [],
          isSolved: false,
          isDead: false,
        },
      ]);
      setIsLoading(false);
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    const { handleVirtualKey } = latestViewProps;

    act(() => {
      handleVirtualKey('A');
      handleVirtualKey('P');
      handleVirtualKey('P');
      handleVirtualKey('L');
      handleVirtualKey('E');
      handleVirtualKey('ENTER');
    });

    vi.useRealTimers();
    expect(submitSpeedrunScoreMock).not.toHaveBeenCalled();
  });
});
