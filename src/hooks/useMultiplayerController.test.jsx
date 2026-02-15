import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../lib/wordLists', () => ({
  loadWordLists: vi.fn(async () => ({
    ANSWER_WORDS: ['APPLE', 'BERRY'],
    ALLOWED_GUESSES: ['APPLE', 'BERRY'],
  })),
}));

vi.mock('../lib/dailyWords', () => ({
  SeededRandom: function () {
    this.next = () => 0.5;
  },
}));

import { useMultiplayerController } from './useMultiplayerController';
import { loadWordLists } from '../lib/wordLists';
import * as wordleLib from '../lib/wordle';

beforeEach(() => {
  vi.clearAllMocks();
});

function createCommonProps(overrides = {}) {
  const multiplayerGame = overrides.multiplayerGame || {
    gameState: null,
    createGame: vi.fn(),
    joinGame: vi.fn(),
    switchTurn: vi.fn(),
    setWinner: vi.fn(),
    startGame: vi.fn(),
    setFriendRequestStatus: vi.fn(),
    setReady: vi.fn(),
    setNextGameConfig: vi.fn(),
  };

  return {
    isMultiplayer: true,
    isHost: true,
    gameCode: '123456',
    gameVariant: 'standard',
    boardsParam: null,
    numBoards: 1,
    authUser: { uid: 'host-uid' },
    isVerifiedUser: true,
    multiplayerGame,
    boards: [],
    setBoards: vi.fn(),
    maxTurns: 6,
    setMaxTurns: vi.fn(),
    allowedSet: new Set(),
    setAllowedSet: vi.fn(),
    setIsUnlimited: vi.fn(),
    setIsLoading: vi.fn(),
    setShowPopup: vi.fn(),
    setCurrentGuess: vi.fn(),
    setIsFlipping: vi.fn(),
    revealId: 0,
    isFlipping: false,
    navigate: vi.fn(),
    setTimedMessage: vi.fn(),
    endingGameRef: { current: false },
    popupClosedRef: { current: false },
    shouldShowPopupAfterFlipRef: { current: false },
    sendFriendRequest: vi.fn(),
    cancelSentChallenge: vi.fn(),
    maxMultiplayerBoards: 8,
    ...overrides,
  };
}

describe('useMultiplayerController', () => {
  it('computes friendRequestSent for host and guest correctly', () => {
    const gameState = {
      hostId: 'host-uid',
      players: {
        'host-uid': { id: 'host-uid', name: 'Host', isHost: true },
        'guest-uid': { id: 'guest-uid', name: 'Guest', isHost: false },
      },
      friendRequestFrom: 'host-uid',
      friendRequestStatus: 'pending',
    };

    const hostGame = { ...createCommonProps().multiplayerGame, gameState };

    const { result: hostView } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({ authUser: { uid: 'host-uid' }, multiplayerGame: hostGame })
      )
    );

    expect(hostView.current.friendRequestSent).toBe(true);

    const guestGame = { ...hostGame, gameState };

    const { result: guestView } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({ authUser: { uid: 'guest-uid' }, multiplayerGame: guestGame })
      )
    );

    expect(guestView.current.friendRequestSent).toBe(false);
  });

  it('handleMultiplayerReady toggles ready state via multiplayerGame.setReady', async () => {
    const setReady = vi.fn();
    const gameState = {
      hostId: 'host-uid',
      players: {
        'host-uid': { id: 'host-uid', name: 'Host', isHost: true, ready: false },
      },
    };

    const multiplayerGame = { ...createCommonProps().multiplayerGame, gameState, setReady };

    const { result } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({ authUser: { uid: 'host-uid' }, multiplayerGame })
      )
    );

    await act(async () => {
      await result.current.handleMultiplayerReady();
    });

    expect(setReady).toHaveBeenCalledWith('123456', true);
  });

  it('handleAddFriendRequest sends request and marks status pending in game state', async () => {
    const sendFriendRequest = vi.fn().mockResolvedValue(undefined);
    const setFriendRequestStatus = vi.fn().mockResolvedValue(undefined);

    const gameState = {
      hostId: 'host-uid',
    };

    const multiplayerGame = {
      ...createCommonProps().multiplayerGame,
      gameState,
      setFriendRequestStatus,
    };

    const { result } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          authUser: { uid: 'host-uid' },
          multiplayerGame,
          sendFriendRequest,
        })
      )
    );

    await act(async () => {
      await result.current.handleAddFriendRequest('Opponent', 'op-1');
    });

    expect(sendFriendRequest).toHaveBeenCalledWith('Opponent', 'op-1');
    expect(setFriendRequestStatus).toHaveBeenCalledWith('123456', 'pending');
  });

  it('applyMultiplayerConfig clamps boards and sets next config', async () => {
    const setTimedMessage = vi.fn();
    const setNextGameConfig = vi.fn().mockResolvedValue(undefined);
    const baseProps = createCommonProps({
      maxMultiplayerBoards: 4,
      setTimedMessage,
    });

    const { result } = renderHook(() =>
      useMultiplayerController({
        ...baseProps,
        multiplayerGame: {
          ...baseProps.multiplayerGame,
          setNextGameConfig,
        },
      })
    );

    // Set draft values - React should batch these updates
    act(() => {
      result.current.setMultiplayerConfigBoardsDraft(10);
      result.current.setMultiplayerConfigVariantDraft('speedrun');
    });

    // Wait for the hook to re-render with updated state
    // The useMemo return value should update when the draft state changes
    await waitFor(() => {
      expect(result.current.multiplayerConfigBoardsDraft).toBe(10);
      expect(result.current.multiplayerConfigVariantDraft).toBe('speedrun');
    }, { timeout: 1000 });

    // Now apply the config
    await act(async () => {
      await result.current.applyMultiplayerConfig();
    });

    // Should clamp boards from 10 to 4 (maxMultiplayerBoards)
    expect(setNextGameConfig).toHaveBeenCalledWith('123456', {
      numBoards: 4,
      variant: 'speedrun',
      speedrun: true,
      solutionHunt: false,
    });
    // Should show success message
    expect(setTimedMessage).toHaveBeenCalledWith(
      expect.stringContaining('Next rematch will use 4 board'),
      expect.any(Number) // Use any number since we're using constants now
    );
  });

  it('can call handleMultiplayerStart which loads word lists and starts a game', async () => {
    const startGame = vi.fn();
    const multiplayerGame = {
      ...createCommonProps().multiplayerGame,
      startGame,
    };

    const { result } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          multiplayerGame,
          numBoards: 2,
        })
      )
    );

    await act(async () => {
      await result.current.handleMultiplayerStart();
    });

    expect(loadWordLists).toHaveBeenCalled();
    expect(startGame).toHaveBeenCalled();
  });

  it('uses boardsParam to determine board count for the initial multiplayer round', async () => {
    const startGame = vi.fn();
    const multiplayerGame = {
      ...createCommonProps().multiplayerGame,
      startGame,
    };

    const { result } = renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          multiplayerGame,
          // Host selected 5 boards on the modal; numBoards is still 1 before the first round.
          boardsParam: '5',
          numBoards: 1,
          maxMultiplayerBoards: 8,
        })
      )
    );

    await act(async () => {
      await result.current.handleMultiplayerStart();
    });

    expect(loadWordLists).toHaveBeenCalled();
    expect(startGame).toHaveBeenCalledTimes(1);
    const [, solutionsArg] = startGame.mock.calls[0];
    expect(Array.isArray(solutionsArg)).toBe(true);
    expect(solutionsArg).toHaveLength(5);
  });

  it('clamps boardsParam to maxMultiplayerBoards and falls back to numBoards when missing', async () => {
    const startGame = vi.fn();
    const baseGame = {
      ...createCommonProps().multiplayerGame,
      startGame,
    };

    // Case 1: boardsParam larger than maxMultiplayerBoards should be clamped.
    let hook = renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          multiplayerGame: baseGame,
          boardsParam: '99',
          numBoards: 1,
          maxMultiplayerBoards: 4,
        })
      )
    );

    await act(async () => {
      await hook.result.current.handleMultiplayerStart();
    });

    expect(startGame).toHaveBeenCalledTimes(1);
    let [, solutionsArg] = startGame.mock.calls[0];
    expect(solutionsArg).toHaveLength(4);

    // Case 2: when boardsParam is null, fall back to numBoards.
    startGame.mockClear();

    hook = renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          multiplayerGame: baseGame,
          boardsParam: null,
          numBoards: 3,
          maxMultiplayerBoards: 8,
        })
      )
    );

    await act(async () => {
      await hook.result.current.handleMultiplayerStart();
    });

    expect(startGame).toHaveBeenCalledTimes(1);
    ;[, solutionsArg] = startGame.mock.calls[0];
    expect(solutionsArg).toHaveLength(3);
  });

  it('syncs multiplayer guesses into local boards using scoreGuess colors', async () => {
    const setBoards = vi.fn();
    const gameState = {
      status: 'playing',
      solutions: ['APPLE'],
      hostId: 'host-uid',
      speedrun: false,
      players: {
        'host-uid': { id: 'host-uid', name: 'Host', isHost: true, guesses: ['OTHER'] },
      },
    };

    const multiplayerGame = {
      ...createCommonProps().multiplayerGame,
      gameState,
    };

    const scoreSpy = vi.spyOn(wordleLib, 'scoreGuess');

    renderHook(() =>
      useMultiplayerController(
        createCommonProps({
          authUser: { uid: 'host-uid' },
          multiplayerGame,
          setBoards,
        })
      )
    );

    await waitFor(() => {
      expect(setBoards).toHaveBeenCalled();
    });

    // scoreGuess should be invoked with the host guess and board solution
    expect(scoreSpy).toHaveBeenCalledWith('OTHER', 'APPLE');

    const boardsArg = setBoards.mock.calls[0][0];
    expect(boardsArg).toHaveLength(1);
    const firstBoard = boardsArg[0];
    expect(firstBoard.guesses).toHaveLength(1);

    const guessEntry = firstBoard.guesses[0];
    const expectedColors = scoreSpy.mock.results[0]?.value;

    expect(guessEntry.word).toBe('OTHER');
    expect(Array.isArray(guessEntry.colors)).toBe(true);
    if (expectedColors) {
      expect(guessEntry.colors).toEqual(expectedColors);
    }
  });
});
