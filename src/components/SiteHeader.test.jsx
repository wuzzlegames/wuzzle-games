import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false, error: null }),
}));

vi.mock('../hooks/useNotificationSeen', () => ({
  useNotificationSeen: vi.fn(),
  getUnseenNotificationCount: vi.fn((friendRequests, incomingChallenges, notificationSeenAt) =>
    (friendRequests?.length || 0) + (incomingChallenges?.length || 0)
  ),
  getUnseenWithLabels: vi.fn(() => []),
  CHALLENGE_EXPIRY_MS: 30 * 60 * 1000,
}));

vi.mock('../hooks/useDailyResetTimer', () => ({
  useDailyResetTimer: vi.fn(),
}));

vi.mock('./NotificationsModal', () => ({
  default: ({ isOpen, onRequestClose }) =>
    isOpen ? (
      <div data-testid="notifications-modal">
        <button type="button" onClick={onRequestClose}>
          Close notifications
        </button>
      </div>
    ) : null,
}));

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
}));

import { useAuth } from '../hooks/useAuth';
import { useDailyResetTimer } from '../hooks/useDailyResetTimer';
import { useNotificationSeen } from '../hooks/useNotificationSeen';
import SiteHeader from './SiteHeader';

beforeEach(() => {
  vi.clearAllMocks();
  navigateMock.mockReset();
  useNotificationSeen.mockReturnValue({
    notificationSeenAt: null,
    markNotificationsSeen: vi.fn(),
    loading: false,
  });
});

describe('SiteHeader', () => {
  it('shows Sign In when user is null and opens AuthModal when clicked', async () => {
    useAuth.mockReturnValue({ user: null, signOut: vi.fn() });
    useDailyResetTimer.mockReturnValue('00:10:00');

    const user = userEvent.setup();

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();

    await user.click(signInButton);

    // AuthModal content should now be visible
    expect(await screen.findByText(/sign in to access your account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  });

  it('when user is present, shows Sign Out, Leaderboard, and UserCard linking to profile', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();

    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument();
  });

  it('home icon navigates to \/ and leaderboard button navigates to \/leaderboard', async () => {
    useAuth.mockReturnValue({ user: null, signOut: vi.fn() });
    useDailyResetTimer.mockReturnValue('00:10:00');
    const user = userEvent.setup();

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const homeButton = screen.getByRole('button', { name: /home/i });
    const leaderboardButton = screen.getByRole('button', { name: /leaderboard/i });

    await user.click(homeButton);
    await user.click(leaderboardButton);

    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(navigateMock).toHaveBeenCalledWith('/leaderboard');
  });

  it('UserCard (profile) button navigates to \/profile when user is present', async () => {
    const signOut = vi.fn();
    useAuth.mockReturnValue({
      user: { displayName: 'Bob', email: 'bob@example.com' },
      signOut,
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    const user = userEvent.setup();

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const profileButton = screen.getByRole('button', { name: /go to profile/i });
    await user.click(profileButton);

    expect(navigateMock).toHaveBeenCalledWith('/profile');
  });

  it('opens Challenges modal from hamburger and shows Sent and Received sections', async () => {
    const acceptChallenge = vi.fn();
    const dismissChallenge = vi.fn();
    const cancelSentChallenge = vi.fn();

    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [
        {
          id: 'inc1',
          fromUserName: 'Bob',
          boards: 2,
          speedrun: false,
          gameCode: '123456',
        },
      ],
      sentChallenges: [
        {
          id: 'sent1',
          toUserId: 'friend-1',
          toUserName: 'Carol',
          boards: 1,
          speedrun: true,
          gameCode: '654321',
        },
      ],
      isVerifiedUser: true,
      acceptChallenge,
      dismissChallenge,
      cancelSentChallenge,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    const user = userEvent.setup();

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    // Open Challenges modal via header Challenges icon (or open hamburger then click menu Challenges)
    const challengesButtons = screen.getAllByRole('button', { name: /challenges/i });
    await user.click(challengesButtons[0]);

    // Headings
    expect(screen.getByText(/sent/i)).toBeInTheDocument();
    expect(screen.getByText(/received/i)).toBeInTheDocument();

    // Sent card: Carol
    expect(screen.getByText(/Carol/i)).toBeInTheDocument();
    // Received card: Bob
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();

    // Dismiss button in Sent section should call cancelSentChallenge with game code
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    expect(cancelSentChallenge).toHaveBeenCalledTimes(1);
    expect(cancelSentChallenge).toHaveBeenCalledWith('654321');
  });

  it('shows notification icon when user is signed in and verified', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    expect(notificationsButton).toBeInTheDocument();
  });

  it('shows notification icon when user is signed in but not verified', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: false,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('opens NotificationsModal when notification icon is clicked', async () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    const user = userEvent.setup();
    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const notificationsButton = screen.getByRole('button', { name: /notifications/i });
    await user.click(notificationsButton);

    expect(screen.getByTestId('notifications-modal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close notifications/i })).toBeInTheDocument();
  });

  it('shows no badge on notification icon when unseen count is 0', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const notificationsButton = screen.getByRole('button', { name: /^Notifications$/ });
    expect(notificationsButton).toHaveAttribute('aria-label', 'Notifications');
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('shows unseen count badge and aria-label when count > 0', () => {
    useAuth.mockReturnValue({
      user: { displayName: 'Alice', email: 'alice@example.com' },
      signOut: vi.fn(),
      friendRequests: [{ id: 'req1', fromName: 'Bob' }, { id: 'req2', fromName: 'Carol' }],
      incomingChallenges: [],
      isVerifiedUser: true,
    });
    useDailyResetTimer.mockReturnValue('00:10:00');

    render(<SiteHeader onOpenFeedback={vi.fn()} onSignUpComplete={vi.fn()} />);

    const notificationsButton = screen.getByRole('button', { name: /notifications, 2 unread/i });
    expect(notificationsButton).toHaveAttribute('aria-label', 'Notifications, 2 unread');
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
