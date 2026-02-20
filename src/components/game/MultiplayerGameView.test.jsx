import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import MultiplayerGameView from './MultiplayerGameView';

// Stub header and auth modal so we can focus on the multiplayer auth-gating UI.
vi.mock('../SiteHeader', () => ({
  default: () => <header data-testid="site-header" />, // eslint-disable-line react/display-name
}));

vi.mock('../AuthModal', () => ({
  default: ({ isOpen, onRequestClose }) => (
    // Minimal stub that lets us assert it opened; close is unused but kept for API compatibility.
    isOpen ? (
      <div data-testid="auth-modal" onClick={onRequestClose}>
        AUTH MODAL
      </div>
    ) : null
  ), // eslint-disable-line react/display-name
}));

vi.mock('../../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

vi.mock('../../lib/wordle', () => ({
  KEYBOARD_HEIGHT: 200,
  WORD_LENGTH: 5,
  formatElapsed: (ms) => `${(ms / 1000).toFixed(1)}s`,
  scoreGuess: (word, solution) => {
    // Simple mock: return all greens if word matches solution, otherwise mix
    if (word.toLowerCase() === solution.toLowerCase()) {
      return ['green', 'green', 'green', 'green', 'green'];
    }
    // For OTHER vs apple, return some yellows/greys
    return ['grey', 'grey', 'grey', 'grey', 'grey'];
  },
  getGreenPattern: (guesses) => {
    // Return a simple pattern based on guesses
    const pattern = Array(5).fill(false);
    if (guesses && guesses.length > 0) {
      const lastGuess = guesses[guesses.length - 1];
      if (lastGuess && lastGuess.colors) {
        lastGuess.colors.forEach((color, i) => {
          if (color === 'green') pattern[i] = true;
        });
      }
    }
    return pattern;
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const baseProps = {
  mode: 'multiplayer',
  gameCode: '123456',
  multiplayerGame: { gameState: null, error: null, loading: false },
  isLoading: false,
  maxTurns: 6,
  currentGuess: '',
  invalidCurrentGuess: false,
  revealId: 0,
  boardRefs: { current: {} },
  boards: [],
  selectedBoardIndex: null,
  setSelectedBoardIndex: () => {},
  friendRequestSent: false,
  onAddFriendRequest: () => {},
  onShareCode: () => {},
  onReady: () => {},
  onStartGame: () => {},
  onOpenFeedback: () => {},
  onRematch: () => {},
  setShowFeedbackModal: () => {},
  setTimedMessage: () => {},
  multiplayerNowMs: 0,
  initialNumBoards: 1,
  onChangeMode: () => {},
  friends: [],
  onCancelChallenge: () => {},
  onUpdateConfig: () => {},
  onInviteFriend: () => {},
  isVerifiedUser: true,
};

describe('MultiplayerGameView unauthenticated multiplayer gating', () => {
  it('shows the sign-in required screen for unsigned users with correct copy and buttons', async () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <MultiplayerGameView
          {...baseProps}
          authUser={null}
          authLoading={false}
          onBack={onBack}
          />
        </Suspense>
      </MemoryRouter>,
    );

    // Wait for any lazy AuthModal/Suspense work to settle
    await screen.findByText('Sign in to play Multiplayer Mode');

    // Heading and message
    expect(screen.getByText('Sign in to play Multiplayer Mode')).toBeInTheDocument();
    expect(
      screen.getByText('A Wuzzle Games account is required to host or join multiplayer rooms.'),
    ).toBeInTheDocument();

    // Buttons
    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    const backButton = screen.getByRole('button', { name: 'Back to Home' });
    expect(signInButton).toBeInTheDocument();
    expect(backButton).toBeInTheDocument();

    // Back should call onBack handler
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('opens the AuthModal when Sign In is clicked', async () => {
    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <MultiplayerGameView
          {...baseProps}
          authUser={null}
          authLoading={false}
          onBack={vi.fn()}
          />
        </Suspense>
      </MemoryRouter>,
    );

    const signInButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(signInButton);

    const modal = await screen.findByTestId('auth-modal');
    expect(modal).toBeInTheDocument();
  });
});

describe('MultiplayerGameView connection / error handling', () => {
  it('shows an error screen instead of endless "Connecting to game" when hook reports an error', () => {
    const onBack = vi.fn();

    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <MultiplayerGameView
          {...baseProps}
          authUser={{ uid: 'user-1' }}
          authLoading={false}
          onBack={onBack}
          multiplayerGame={{ gameState: null, error: 'Game not found or has expired.', loading: false }}
          />
        </Suspense>
      </MemoryRouter>,
    );

    // "Game not found or has expired." is treated as room-closed, so UI shows that message
    expect(screen.getByText('The host has left the room')).toBeInTheDocument();
    const homeButton = screen.getByRole('button', { name: 'Go home' });
    expect(homeButton).toBeInTheDocument();
  });
});

describe('MultiplayerGameView waiting room', () => {
  it('renders waiting room instead of connecting when gameState.status="waiting"', () => {
    const gameState = {
      status: 'waiting',
      hostId: 'host-uid',
      guestId: null,
      hostName: 'Host',
      createdAt: 1_000,
      configBoards: 4,
      maxPlayers: 5,
      roomName: 'My Room',
      players: {
        'host-uid': { id: 'host-uid', name: 'Host', isHost: true, ready: true, guesses: [] },
      },
    };

    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <MultiplayerGameView
          {...baseProps}
          authUser={{ uid: 'host-uid' }}
          authLoading={false}
          onBack={vi.fn()}
          multiplayerGame={{ gameState, error: null, loading: false }}
          waitingNowMs={gameState.createdAt + 5_000}
          initialNumBoards={1}
          />
        </Suspense>
      </MemoryRouter>,
    );

    // The waiting room should show the room name heading and game code box,
    // not the generic "Connecting to game..." loader.
    expect(screen.getByText('My Room')).toBeInTheDocument();
    expect(screen.getByText('Game Code:')).toBeInTheDocument();
  });
});

describe('MultiplayerGameView in active multiplayer game', () => {
  it('shows per-user per-board room progress summary instead of opponent boards', () => {
    const gameState = {
      status: 'playing',
      speedrun: false,
      hostId: 'host-uid',
      guestId: 'guest-uid',
      hostName: 'Host',
      guestName: 'Guest',
      solutions: ['apple'],
      hostGuesses: ['APPLE'],
      guestGuesses: ['OTHER'],
      createdAt: 1_000,
      players: {
        'host-uid': { id: 'host-uid', name: 'Host', isHost: true, ready: true, guesses: ['APPLE'] },
        'guest-uid': { id: 'guest-uid', name: 'Guest', isHost: false, ready: true, guesses: ['OTHER'] },
      },
    };

    render(
      <MemoryRouter>
        <Suspense fallback={null}>
          <MultiplayerGameView
          {...baseProps}
          authUser={{ uid: 'host-uid' }}
          authLoading={false}
          multiplayerGame={{ gameState, error: null, loading: false }}
          boards={[
            {
              solution: 'apple',
              guesses: [],
              isSolved: false,
              isDead: false,
              lastRevealId: null,
            },
          ]}
          maxTurns={6}
          waitingNowMs={gameState.createdAt + 5000}
          />
        </Suspense>
      </MemoryRouter>,
    );

    // Summary header
    expect(screen.getByText('Room progress (per board)')).toBeInTheDocument();

    // Host row shows "(You)" label and correct per-board stats for a solved word.
    expect(screen.getByText(/Host \(You\)/i)).toBeInTheDocument();

    // There should be a per-board summary chip for each player.
    const perBoardSummaries = screen.getAllByText(/Board 1: 1 guess/i);
    expect(perBoardSummaries.length).toBeGreaterThanOrEqual(2);

    // Host summary should include the full solved stats.
    expect(screen.getByText(/Green 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Solved/i)).toBeInTheDocument();

    // Guest row is also present in the summary, with different stats.
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByText(/Green 0/i)).toBeInTheDocument();
  });
});
