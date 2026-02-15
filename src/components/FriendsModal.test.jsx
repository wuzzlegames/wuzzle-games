import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useMultiplayerGame', () => ({
  useMultiplayerGame: vi.fn(),
}));

vi.mock('../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

vi.mock('../hooks/useTimedMessage', () => ({
  useTimedMessage: vi.fn(() => ({
    message: '',
    setTimedMessage: vi.fn(),
  })),
}));

vi.mock('./Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }) => (isOpen ? <div data-testid="modal-root">{children}</div> : null),
}));

vi.mock('./game/GameToast', () => ({
  __esModule: true,
  default: ({ message }) => (message ? <div data-testid="toast">{message}</div> : null),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import FriendsModal from './FriendsModal';
import { within } from '@testing-library/react';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FriendsModal', () => {
  it('shows verify-account message and close button when user is not verified', () => {
    useAuth.mockReturnValue({
      isVerifiedUser: false,
    });

    const onRequestClose = vi.fn();

    render(<FriendsModal isOpen onRequestClose={onRequestClose} />);

    expect(screen.getByText(/verify your account/i)).toBeInTheDocument();
    expect(
      screen.getByText(/friends are only available for verified accounts/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onRequestClose).toHaveBeenCalled();
  });

  it('renders friend requests and wires Accept/Decline actions', () => {
    const acceptFriendRequest = vi.fn();
    const declineFriendRequest = vi.fn();

    useAuth.mockReturnValue({
      isVerifiedUser: true,
      user: { uid: 'u1' },
      friends: [],
      friendRequests: [
        { id: 'req1', fromName: 'Alice' },
      ],
      incomingChallenges: [],
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend: vi.fn(),
      sendChallenge: vi.fn(),
    });

    render(<FriendsModal isOpen onRequestClose={vi.fn()} />);

    expect(screen.getByText(/friend requests \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(acceptFriendRequest).toHaveBeenCalledWith('req1', 'Alice');

    fireEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(declineFriendRequest).toHaveBeenCalledWith('req1');
  });

  it('renders friends list with Challenge and Remove actions', async () => {
    const removeFriend = vi.fn().mockResolvedValue(undefined);

    useAuth.mockReturnValue({
      isVerifiedUser: true,
      user: { uid: 'u1' },
      friends: [{ id: 'f1', name: 'Bob' }],
      friendRequests: [],
      incomingChallenges: [],
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
      removeFriend,
      sendChallenge: vi.fn().mockResolvedValue(true),
    });

    useMultiplayerGame.mockReturnValue({
      createGame: vi.fn().mockResolvedValue('123456'),
    });

    const { findAllByTestId } = render(<FriendsModal isOpen onRequestClose={vi.fn()} />);

    expect(screen.getByText(/friends \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Open challenge config modal
    fireEvent.click(screen.getByRole('button', { name: /challenge/i }));
    expect(screen.getByText(/multiplayer game configuration/i)).toBeInTheDocument();

    // Click Remove on friend row to open confirm modal
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.getByText(/remove friend\?/i)).toBeInTheDocument();

    // Confirm removal in the confirm modal (wrap in act so async handler state updates are flushed)
    const modalRoots = await findAllByTestId('modal-root');
    const confirmModal = modalRoots[modalRoots.length - 1];
    await act(async () => {
      fireEvent.click(within(confirmModal).getByRole('button', { name: /^remove$/i }));
      await Promise.resolve();
    });
    expect(removeFriend).toHaveBeenCalledWith('f1');
  });

  it('cancel in remove-friend confirm modal does not call removeFriend', async () => {
    const removeFriend = vi.fn();

    useAuth.mockReturnValue({
      isVerifiedUser: true,
      user: { uid: 'u1' },
      friends: [{ id: 'f1', name: 'Bob' }],
      friendRequests: [],
      incomingChallenges: [],
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
      removeFriend,
      sendChallenge: vi.fn(),
    });

    useMultiplayerGame.mockReturnValue({
      createGame: vi.fn(),
    });

    const { findAllByTestId } = render(<FriendsModal isOpen onRequestClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.getByText(/remove friend\?/i)).toBeInTheDocument();

    const modalRoots = await findAllByTestId('modal-root');
    const confirmModal = modalRoots[modalRoots.length - 1];
    fireEvent.click(within(confirmModal).getByRole('button', { name: /cancel/i }));

    expect(removeFriend).not.toHaveBeenCalled();
  });

  it('creates a challenge and navigates to multiplayer when sendChallenge succeeds', async () => {
    const sendChallenge = vi.fn().mockResolvedValue(true);
    const createGame = vi.fn().mockResolvedValue('654321');

    useAuth.mockReturnValue({
      isVerifiedUser: true,
      user: { uid: 'u1', displayName: 'Host' },
      friends: [{ id: 'f1', name: 'Bob' }],
      friendRequests: [],
      incomingChallenges: [],
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
      removeFriend: vi.fn(),
      sendChallenge,
    });

    useMultiplayerGame.mockReturnValue({
      createGame: createGame.mockResolvedValue({ code: '654321' }),
    });

    const { findAllByTestId } = render(<FriendsModal isOpen onRequestClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /^challenge$/i }));

    // Scope to the modal contents so we click the config "Challenge" button,
    // not the per-friend row button. The config modal is rendered as a nested
    // modal, so we take the last modal-root in the DOM.
    const modalRoots = await findAllByTestId('modal-root');
    const modalRoot = modalRoots[modalRoots.length - 1];
    const challengeButton = within(modalRoot).getByRole('button', { name: /^challenge$/i });
    fireEvent.click(challengeButton);

    await waitFor(() => {
      expect(createGame).toHaveBeenCalledWith({
        variant: 'standard',
        speedrun: false,
        solutionHunt: false,
        maxPlayers: 2,
        isPublic: false,
        boards: 1,
        challengeOnly: true,
      });
      expect(sendChallenge).toHaveBeenCalledWith('f1', 'Bob', '654321', 1, 'standard');
    });
  });
});
