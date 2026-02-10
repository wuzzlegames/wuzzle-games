import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let latestMultiplayerViewProps = null;
let latestKeyboardProps = null;
let latestUseKeyboardArgs = null;
const mockSubmitGuess = vi.fn();
const mockSetTimedMessage = vi.fn();

vi.mock('./MultiplayerGameView', () => ({
  __esModule: true,
  default: (props) => {
    latestMultiplayerViewProps = props;
    return <div data-testid="multiplayer-view" />;
  },
}));

vi.mock('../Keyboard', () => ({
  __esModule: true,
  default: (props) => {
    latestKeyboardProps = props;
    return <div data-testid="keyboard" />;
  },
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'user-1', displayName: 'User One' },
    sendFriendRequest: vi.fn(),
    isVerifiedUser: false,
    friends: [],
    cancelSentChallenge: vi.fn(),
  }),
}));

vi.mock('../../hooks/useMultiplayerGame', () => ({
  useMultiplayerGame: () => ({
    gameState: {
      status: 'playing',
      speedrun: false,
      hostId: 'user-1',
      guestId: 'user-2',
      currentTurn: 'host',
      solutions: ['APPLE'],
      hostGuesses: [],
      guestGuesses: [],
    },
    submitGuess: mockSubmitGuess,
    switchTurn: vi.fn(),
    requestRematch: vi.fn(),
    leaveGame: vi.fn(),
    expireGame: vi.fn(),
    updateConfig: vi.fn(),
  }),
}));

vi.mock('../../hooks/useKeyboard', () => ({
  useKeyboard: (args) => {
    latestUseKeyboardArgs = args;
  },
}));

let testAllowedSetInitialized = false;

vi.mock('../../hooks/useMultiplayerController', () => ({
  useMultiplayerController: (args = {}) => {
    // In tests, simulate a small allowed word list so that APPLE is valid
    // and OTHER is invalid. This lets us exercise both valid and invalid
    // guess paths without loading the real dictionaries.
    //
    // We schedule the state update via setTimeout(0) so that:
    //   - it does not run during render (avoiding React warnings), and
    //   - it is driven by fake timers, which we advance inside `act()`
    //     in the tests so the resulting state updates are properly
    //     wrapped in React's testing utilities.
    if (!testAllowedSetInitialized && typeof args.setAllowedSet === 'function') {
      testAllowedSetInitialized = true;
      setTimeout(() => {
        args.setAllowedSet(new Set(['APPLE']));
      }, 0);
    }

    return {
      friendRequestSent: false,
      hasPlayerSolvedAllMultiplayerBoards: false,
      isMultiplayerConfigModalOpen: false,
      multiplayerConfigBoardsDraft: 1,
      multiplayerConfigSpeedrunDraft: false,
      setIsMultiplayerConfigModalOpen: vi.fn(),
      setMultiplayerConfigBoardsDraft: vi.fn(),
      setMultiplayerConfigSpeedrunDraft: vi.fn(),
      handleMultiplayerReady: vi.fn(),
      handleMultiplayerStart: vi.fn(),
      handleCancelHostedChallenge: vi.fn(),
      handleAddFriendRequest: vi.fn(),
      openMultiplayerConfigFromEnd: vi.fn(),
      applyMultiplayerConfig: vi.fn(),
      handleRematchStart: vi.fn(),
      handleUpdateConfig: vi.fn(),
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
  useShare: () => ({
    handleShare: vi.fn(),
    handleShareCode: vi.fn(),
  }),
}));

vi.mock('../FeedbackModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="feedback-modal" /> : null),
}));

vi.mock('./GameToast', () => ({
  __esModule: true,
  default: () => <div data-testid="game-toast" />,
}));

vi.mock('./MultiplayerRoomConfigModal', () => ({
  __esModule: true,
  default: () => <div data-testid="config-modal" />,
}));

vi.mock('./BoardSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="board-selector" />,
}));

vi.mock('./GamePopup', () => ({
  __esModule: true,
  default: () => <div data-testid="game-popup" />,
}));

import GameMultiplayer from './GameMultiplayer';

describe('GameMultiplayer partial and full guess handling on Enter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    latestMultiplayerViewProps = null;
    latestKeyboardProps = null;
    latestUseKeyboardArgs = null;
    mockSubmitGuess.mockClear();
    mockSetTimedMessage.mockClear();
    // Ensure each test gets a fresh allowed word set initialization so that
    // APPLE is treated as a valid word when the dictionary mock updates
    // GameMultiplayer's `allowedSet` state.
    testAllowedSetInitialized = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderGame() {
    render(
      <MemoryRouter
        initialEntries={['/game/multiplayer/123?mode=multiplayer&host=true']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/game/multiplayer/:code" element={<GameMultiplayer />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(latestKeyboardProps).not.toBeNull();
    return latestKeyboardProps;
  }

  it('does nothing when Enter is pressed with 0 letters', () => {
    const { onVirtualKey } = renderGame();
    expect(typeof onVirtualKey).toBe('function');
    expect(latestMultiplayerViewProps.currentGuess).toBe('');

    act(() => {
      onVirtualKey('ENTER');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('');
    expect(mockSubmitGuess).not.toHaveBeenCalled();
  });

  it('clears currentGuess when Enter is pressed with fewer than 5 letters via virtual keyboard', () => {
    const { onVirtualKey } = renderGame();

    act(() => {
      onVirtualKey('A');
      onVirtualKey('B');
      onVirtualKey('C');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('ABC');

    act(() => {
      onVirtualKey('ENTER');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('');
    expect(mockSubmitGuess).not.toHaveBeenCalled();
  });

  it('submits a complete, valid 5-letter guess when Enter is pressed', async () => {
    const { onVirtualKey } = renderGame();

    // Ensure any deferred state (like the allowed word set) is applied
    // before simulating key presses.
    act(() => {
      vi.runAllTimers();
    });

    act(() => {
      onVirtualKey('A');
      onVirtualKey('P');
      onVirtualKey('P');
      onVirtualKey('L');
      onVirtualKey('E');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('APPLE');

    act(() => {
      onVirtualKey('ENTER');
      vi.runAllTimers();
    });

    // A complete 5-letter guess that is in the word list should be submitted.
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockSubmitGuess).toHaveBeenCalledTimes(1);
  });

  it('treats physical Enter via useKeyboard onEnter the same as virtual Enter', async () => {
    const { onVirtualKey } = renderGame();

    // Flush any pending timers so the keyboard hook is fully wired up.
    act(() => {
      vi.runAllTimers();
    });

    expect(latestUseKeyboardArgs).not.toBeNull();
    const { onEnter } = latestUseKeyboardArgs;
    expect(typeof onEnter).toBe('function');

    // Partial guess: 3 letters, then physical Enter -> clears guess and does not submit.
    act(() => {
      onVirtualKey('A');
      onVirtualKey('B');
      onVirtualKey('C');
      vi.runAllTimers();
    });
    expect(latestMultiplayerViewProps.currentGuess).toBe('ABC');

    mockSubmitGuess.mockClear();
    act(() => {
      onEnter();
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('');
    expect(mockSubmitGuess).not.toHaveBeenCalled();

    // Full 5-letter valid guess: physical Enter should submit just like virtual Enter.
    act(() => {
      onVirtualKey('A');
      onVirtualKey('P');
      onVirtualKey('P');
      onVirtualKey('L');
      onVirtualKey('E');
      vi.runAllTimers();
    });
    expect(latestMultiplayerViewProps.currentGuess).toBe('APPLE');

    mockSubmitGuess.mockClear();
    act(() => {
      onEnter();
      vi.runAllTimers();
    });

    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockSubmitGuess).toHaveBeenCalledTimes(1);
  });

  it('does not mark the row invalid while guess is shorter than WORD_LENGTH', () => {
    const { onVirtualKey } = renderGame();

    act(() => {
      onVirtualKey('A');
      onVirtualKey('B');
      onVirtualKey('C');
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('ABC');
    expect(latestMultiplayerViewProps.invalidCurrentGuess).toBe(false);
  });

  it('marks the current row invalid in the view when 5-letter guess is not in word list', () => {
    const { onVirtualKey } = renderGame();

    act(() => {
      onVirtualKey('O');
      onVirtualKey('T');
      onVirtualKey('H');
      onVirtualKey('E');
      onVirtualKey('R');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('OTHER');
    expect(latestMultiplayerViewProps.invalidCurrentGuess).toBe(true);
  });

  it('clears the guess when submitting an invalid 5-letter word', () => {
    const { onVirtualKey } = renderGame();

    act(() => {
      onVirtualKey('O');
      onVirtualKey('T');
      onVirtualKey('H');
      onVirtualKey('E');
      onVirtualKey('R');
      vi.runAllTimers();
    });

    expect(latestMultiplayerViewProps.currentGuess).toBe('OTHER');

    mockSetTimedMessage.mockClear();

    act(() => {
      onVirtualKey('ENTER');
      vi.runAllTimers();
    });

    // The guess is always cleared after attempting to submit an invalid word.
    expect(latestMultiplayerViewProps.currentGuess).toBe('');

    // When the local dictionary has loaded, we also surface a toast for invalid words.
    if (mockSetTimedMessage.mock.calls.length > 0) {
      expect(mockSetTimedMessage).toHaveBeenCalledWith('Not in word list.', 5000);
    }
  });
});
