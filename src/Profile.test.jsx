import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('./hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

vi.mock('./components/FeedbackModal', () => ({
  __esModule: true,
  default: ({ isOpen }) => (isOpen ? <div data-testid="feedback-modal" /> : null),
}));

vi.mock('./components/SiteHeader', () => ({
  __esModule: true,
  default: ({ onOpenFeedback }) => (
    <header>
      <button onClick={() => onOpenFeedback()}>Open Feedback</button>
    </header>
  ),
}));

import { useAuth } from './hooks/useAuth';
import Profile from './Profile';

const renderWithRouter = (ui, initialPath = '/profile') =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<div data-testid="home" />} />
        <Route path="/profile" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Profile', () => {
  it('redirects to home when no user and not loading', async () => {
    useAuth.mockReturnValue({
      user: null,
      loading: false,
      updateUsername: vi.fn(),
      error: null,
      isVerifiedUser: false,
      resendVerificationEmail: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    renderWithRouter(<Profile />);

    await waitFor(() => {
      expect(screen.getByTestId('home')).toBeInTheDocument();
    });
  });

  it('renders user info, hides actions initially, and shows them only when username changes', async () => {
    const updateUsername = vi.fn().mockResolvedValue(true);

    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com',
        displayName: 'Old Name',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      loading: false,
      updateUsername,
      error: null,
      isVerifiedUser: true,
      resendVerificationEmail: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText(/verified/i)).toBeInTheDocument();

    // Action buttons should be hidden before any username change
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/username/i);
    fireEvent.change(usernameInput, { target: { value: 'New Name' } });

    // Buttons should appear after username changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateUsername).toHaveBeenCalledWith('New Name');
    });
  });

  it('shows validation message when trying to save empty username', () => {
    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com',
        displayName: 'Old Name',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      loading: false,
      updateUsername: vi.fn(),
      error: null,
      isVerifiedUser: true,
      resendVerificationEmail: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    renderWithRouter(<Profile />);

    const usernameInput = screen.getByLabelText(/username/i);
    fireEvent.change(usernameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(screen.getByText(/username cannot be empty/i)).toBeInTheDocument();
  });

  it('reverts username and stays on profile when cancel is clicked', () => {
    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com',
        displayName: 'Old Name',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      loading: false,
      updateUsername: vi.fn(),
      error: null,
      isVerifiedUser: true,
      resendVerificationEmail: vi.fn(),
      linkGoogleAccount: vi.fn(),
    });

    renderWithRouter(<Profile />);

    const usernameInput = screen.getByLabelText(/username/i);
    expect(usernameInput).toHaveValue('Old Name');

    fireEvent.change(usernameInput, { target: { value: 'New Name' } });
    expect(usernameInput).toHaveValue('New Name');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Username should be reverted to initial value and we should not navigate home
    expect(usernameInput).toHaveValue('Old Name');
    expect(screen.queryByTestId('home')).not.toBeInTheDocument();
  });

  it('shows resend verification button for unverified password accounts', async () => {
    const resendVerificationEmail = vi.fn().mockResolvedValue(true);

    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com',
        displayName: 'User',
        emailVerified: false,
        providerData: [{ providerId: 'password' }],
      },
      loading: false,
      updateUsername: vi.fn(),
      error: null,
      isVerifiedUser: false,
      resendVerificationEmail,
      linkGoogleAccount: vi.fn(),
    });

    renderWithRouter(<Profile />);

    const resendButton = screen.getByRole('button', { name: /resend link/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(resendVerificationEmail).toHaveBeenCalled();
    });
  });

  it('shows Google link button when no google provider and handles friendly already-linked error', async () => {
    const linkGoogleAccount = vi.fn().mockRejectedValue({
      code: 'auth/provider-already-linked',
      message: 'Already linked',
    });

    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com',
        displayName: 'User',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      loading: false,
      updateUsername: vi.fn(),
      error: null,
      isVerifiedUser: true,
      resendVerificationEmail: vi.fn(),
      linkGoogleAccount,
    });

    renderWithRouter(<Profile />);

    const button = screen.getByRole('button', { name: /connect google account/i });
    fireEvent.click(button);

    // Message is computed inside component based on thrown error
    expect(await screen.findByText(/google account is already linked\./i)).toBeInTheDocument();
  });
});
