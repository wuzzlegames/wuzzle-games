import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';

const setupUseAuthMock = (overrides = {}) => {
  const defaultMocks = {
    signInWithGoogle: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithEmail: vi.fn(),
    loading: false,
  };
  const value = { ...defaultMocks, ...overrides };
  useAuth.mockReturnValue(value);
  return value;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthModal', () => {
  it('shows validation error and does not call auth when email/password are empty', async () => {
    const mocks = setupUseAuthMock();

    const onRequestClose = vi.fn();
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onRequestClose={onRequestClose} onSignUpComplete={vi.fn()} />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.click(submitButton);

    expect(await screen.findByText(/please enter both email and password/i)).toBeInTheDocument();
    expect(mocks.signInWithEmail).not.toHaveBeenCalled();
    expect(mocks.signUpWithEmail).not.toHaveBeenCalled();
    expect(onRequestClose).not.toHaveBeenCalled();
  });

  it('sign-up flow calls signUpWithEmail, then onSignUpComplete and closes modal, clearing fields', async () => {
    const signUpWithEmail = vi.fn().mockResolvedValue(undefined);
    setupUseAuthMock({ signUpWithEmail });

    const onRequestClose = vi.fn();
    const onSignUpComplete = vi.fn();
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onRequestClose={onRequestClose} onSignUpComplete={onSignUpComplete} />);

    // Toggle to sign-up mode
    const toggleButton = screen.getByRole('button', { name: /don't have an account\? sign up/i });
    await user.click(toggleButton);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(emailInput, 'signup@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /create account/i });

    await user.click(submitButton);

    expect(signUpWithEmail).toHaveBeenCalledTimes(1);
    expect(signUpWithEmail).toHaveBeenCalledWith('signup@example.com', 'password123');
    expect(onSignUpComplete).toHaveBeenCalledWith('signup@example.com');
    expect(onRequestClose).toHaveBeenCalledTimes(1);

    // Fields should be cleared after successful submit
    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });

  it('sign-in flow calls signInWithEmail and shows error banner on failure', async () => {
    const error = new Error('Bad credentials');
    const signInWithEmail = vi.fn().mockRejectedValue(error);
    setupUseAuthMock({ signInWithEmail });

    const onRequestClose = vi.fn();
    const onSignUpComplete = vi.fn();
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onRequestClose={onRequestClose} onSignUpComplete={onSignUpComplete} />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(emailInput, 'signin@example.com');
    await user.type(passwordInput, 'wrong');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(signInWithEmail).toHaveBeenCalledTimes(1);
    expect(signInWithEmail).toHaveBeenCalledWith('signin@example.com', 'wrong');

    expect(await screen.findByText(/bad credentials/i)).toBeInTheDocument();
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(onSignUpComplete).not.toHaveBeenCalled();
  });

  it('google sign-in calls signInWithGoogle and shows error on failure', async () => {
    const error = new Error('Google sign-in failed');
    const signInWithGoogle = vi.fn().mockRejectedValue(error);
    setupUseAuthMock({ signInWithGoogle });

    const onRequestClose = vi.fn();
    const user = userEvent.setup();

    render(<AuthModal isOpen={true} onRequestClose={onRequestClose} onSignUpComplete={vi.fn()} />);

    const googleButton = screen.getByRole('button', { name: /continue with google/i });

    await user.click(googleButton);

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(onRequestClose).not.toHaveBeenCalled();
    expect(await screen.findByText(/google sign-in failed/i)).toBeInTheDocument();
  });
});