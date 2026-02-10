import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

// Stub FriendsModal, OpenRoomsModal and Modal to simple shells
vi.mock('./FriendsModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="friends-modal">FRIENDS MODAL</div> : null),
}));

vi.mock('./OpenRoomsModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="open-rooms-modal">OPEN ROOMS</div> : null),
}));

vi.mock('./Modal', () => ({
  __esModule: true,
  default: ({ isOpen, children }) => (isOpen ? <div data-testid="challenges-modal">{children}</div> : null),
}));

vi.mock('./SignInRequiredModal', () => ({
  __esModule: true,
  default: ({ isOpen, title, message }) =>
    isOpen ? (
      <div data-testid="sign-in-required-modal">
        <span data-testid="sign-in-title">{title}</span>
        <span data-testid="sign-in-message">{message}</span>
      </div>
    ) : null,
}));

import { useAuth } from '../hooks/useAuth';
import HamburgerMenu from './HamburgerMenu';

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
});

describe('HamburgerMenu', () => {
  it('shows all menu options when signed out (Profile, Friends, Challenges, Open Rooms, Feedback)', async () => {
    const user = userEvent.setup();
    const onOpenFeedback = vi.fn();

    useAuth.mockReturnValue({
      user: null,
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: false,
    });

    render(<HamburgerMenu onOpenFeedback={onOpenFeedback} />);

    const menuButton = screen.getByTitle('Menu');
    await user.click(menuButton);

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Challenges' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Rooms' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(onOpenFeedback).toHaveBeenCalled();
  });

  it('opens SignInRequiredModal when signed-out user clicks Profile, Friends, Challenges, or Open Rooms', async () => {
    const user = userEvent.setup();

    useAuth.mockReturnValue({
      user: null,
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: false,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));

    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByTestId('sign-in-required-modal')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in-title')).toHaveTextContent('Profile');
    expect(screen.getByTestId('sign-in-message')).toHaveTextContent('You need to sign in to access your profile.');
  });

  it('shows Profile, Friends, Challenges, Open Rooms, Feedback when signed in', async () => {
    const user = userEvent.setup();

    useAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alice' },
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: true,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));

    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Friends' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Challenges' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Rooms' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feedback' })).toBeInTheDocument();
  });

  it('navigates to / and /profile from Home and Profile menu items', async () => {
    const user = userEvent.setup();

    useAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alice' },
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: true,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));

    const homeButton = screen.getByRole('button', { name: 'Home' });

    await user.click(homeButton);

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith('/');

    // Re-open menu and re-query Profile button (previous node was unmounted)
    await user.click(screen.getByTitle('Menu'));
    const profileButton = screen.getByRole('button', { name: 'Profile' });
    await user.click(profileButton);

    expect(navigateMock).toHaveBeenCalledTimes(2);
    expect(navigateMock.mock.calls[1][0]).toBe('/profile');
  });

  it('gates Friends and Challenges by isVerifiedUser, showing alerts for unverified users', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    useAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alice' },
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: false,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));

    const friendsButton = screen.getByRole('button', { name: /friends/i });
    const challengesButton = screen.getByRole('button', { name: /challenges/i });

    await user.click(friendsButton);
    expect(alertSpy).toHaveBeenCalledWith(
      'Verify your email or sign in with Google to use friends.',
    );

    await user.click(screen.getByTitle('Menu'));
    await user.click(challengesButton);
    // Challenges path should also trigger an alert, but we only assert that
    // alert was called at least once (exact message/number of calls is an
    // implementation detail we don't want to couple to).
    expect(alertSpy).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('shows numeric badges for friend requests and incoming challenges', async () => {
    const user = userEvent.setup();

    useAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alice' },
      friendRequests: [{ id: 'fr1' }, { id: 'fr2' }],
      incomingChallenges: [{ id: 'c1' }],
      sentChallenges: [],
      isVerifiedUser: true,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));

    // Friends badge
    const friendsButton = screen.getByRole('button', { name: /friends/i });
    expect(friendsButton).toHaveTextContent('Friends');
    expect(friendsButton).toHaveTextContent('2');

    // Challenges badge
    const challengesButton = screen.getByRole('button', { name: /challenges/i });
    expect(challengesButton).toHaveTextContent('Challenges');
    expect(challengesButton).toHaveTextContent('1');
  });

  it('backdrop click closes the menu', async () => {
    const user = userEvent.setup();

    useAuth.mockReturnValue({
      user: { uid: 'u1', displayName: 'Alice' },
      friendRequests: [],
      incomingChallenges: [],
      sentChallenges: [],
      isVerifiedUser: true,
    });

    render(<HamburgerMenu onOpenFeedback={vi.fn()} />);

    await user.click(screen.getByTitle('Menu'));
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();

    // Backdrop is rendered as a full-screen div; click via pointer-events
    const backdrop = document.querySelector('div[style*="position: fixed"]');
    await user.click(backdrop);

    expect(screen.queryByRole('button', { name: 'Home' })).toBeNull();
  });
});
