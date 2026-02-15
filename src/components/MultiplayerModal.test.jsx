import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useAuth so we can control auth state per test
const useAuthMock = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

// Stub Modal/AuthModal so tests don't depend on actual modal implementation
vi.mock('./Modal', () => ({
  default: ({ isOpen, children }) => (isOpen ? <div data-testid="modal-root">{children}</div> : null),
}));

vi.mock('./AuthModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="auth-modal">AUTH</div> : null),
}));

// Mock react-router navigate
const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

import MultiplayerModal from './MultiplayerModal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MultiplayerModal', () => {
  it('shows sign-in prompt and opens AuthModal when user is not signed in', () => {
    useAuthMock.mockReturnValue({ user: null, isVerifiedUser: false });

    render(<MultiplayerModal isOpen onRequestClose={vi.fn()} />);

    expect(screen.getByText('Multiplayer Mode')).toBeInTheDocument();
    expect(screen.getByText('You need to sign in to play Multiplayer Mode.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
  });

  it('shows verify-email prompt when user is unverified and navigates to profile', () => {
    const onRequestClose = vi.fn();
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, isVerifiedUser: false });

    render(<MultiplayerModal isOpen onRequestClose={onRequestClose} />);

    expect(screen.getByText('Verify your email')).toBeInTheDocument();
    expect(
      screen.getByText(
        'You must verify your email address or sign in with Google to play Multiplayer Mode.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Profile' }));
    expect(onRequestClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/profile');
  });

  it('allows hosting with configuration when verified', () => {
    const onRequestClose = vi.fn();
    const onConfigOpen = vi.fn();
    const onConfigClose = vi.fn();

    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, isVerifiedUser: true });

    render(
      <MultiplayerModal
        isOpen
        onRequestClose={onRequestClose}
        onConfigOpen={onConfigOpen}
        onConfigClose={onConfigClose}
      />,
    );

    // Host flow: clicking Host opens config modal
    fireEvent.click(screen.getByRole('button', { name: 'Host' }));
    expect(onConfigOpen).toHaveBeenCalled();
    expect(screen.getByText('Multiplayer Game Configuration')).toBeInTheDocument();

    // Change number of boards and select speedrun variant
    const boardsSelect = screen.getByLabelText('Number of Boards');
    fireEvent.change(boardsSelect, { target: { value: '5' } });

    const variantSelect = screen.getByLabelText('Game Variant');
    fireEvent.change(variantSelect, { target: { value: 'speedrun' } });

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onConfigClose).toHaveBeenCalled();
    expect(onRequestClose).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      '/game?mode=multiplayer&host=true&variant=speedrun&boards=5&maxPlayers=2&isPublic=true',
    );
  });

  it('validates and joins by game code when verified', () => {
    const onRequestClose = vi.fn();
    useAuthMock.mockReturnValue({ user: { uid: 'u1' }, isVerifiedUser: true });

    const { getByPlaceholderText, getByRole } = render(
      <MultiplayerModal
        isOpen
        onRequestClose={onRequestClose}
      />,
    );

    navigateMock.mockClear();

    // Input non-6-digit code: button should remain disabled and not navigate
    const codeInput = getByPlaceholderText('000000');
    fireEvent.change(codeInput, { target: { value: '123' } });
    const joinButton = getByRole('button', { name: 'Join' });
    expect(joinButton).toBeDisabled();
    expect(navigateMock).not.toHaveBeenCalled();

    // Now enter 6 digits; button should be enabled and navigate called on click
    fireEvent.change(codeInput, { target: { value: '123456' } });
    expect(joinButton).not.toBeDisabled();
    fireEvent.click(joinButton);

    expect(navigateMock).toHaveBeenCalledWith('/game?mode=multiplayer&code=123456');
  });
});
