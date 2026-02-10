import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// For these routing smoke tests we don't care about real auth behavior,
// so stub out useAuth/useDailyResetTimer to avoid async state updates that
// trigger React act() warnings from Firebase listeners and timers.
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    error: null,
    friends: [],
    friendRequests: [],
    incomingChallenges: [],
    sentChallenges: [],
    isVerifiedUser: false,
    signInWithGoogle: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithEmail: vi.fn(),
    signOut: vi.fn(),
    updateUsername: vi.fn(),
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    declineFriendRequest: vi.fn(),
    removeFriend: vi.fn(),
    sendChallenge: vi.fn(),
    acceptChallenge: vi.fn(),
    dismissChallenge: vi.fn(),
    cancelSentChallenge: vi.fn(),
    resendVerificationEmail: vi.fn(),
    linkGoogleAccount: vi.fn(),
  }),
}));

vi.mock('./hooks/useDailyResetTimer', () => ({
  useDailyResetTimer: () => '00:10:00',
}));

import App from './App';

describe('App routing', () => {
  it('renders Home on root path', async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={['/']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByRole('heading', { name: /daily/i })).toBeInTheDocument();
  });

  it('navigates unknown paths back to home', async () => {
    await act(async () => {
      render(
        <MemoryRouter
          initialEntries={['/unknown-path']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <App />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByRole('heading', { name: /daily/i })).toBeInTheDocument();
  });
});
