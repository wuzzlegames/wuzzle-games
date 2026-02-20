import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import MultiplayerChat from './MultiplayerChat';

function Wrapper({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

const mockOnValue = vi.fn();
const mockRef = vi.fn();
const mockPush = vi.fn();
const mockSet = vi.fn();
const mockQuery = vi.fn();
const mockLimitToLast = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (...args) => mockRef(...args),
  onValue: (...args) => mockOnValue(...args),
  push: (...args) => mockPush(...args),
  set: (...args) => mockSet(...args),
  query: (...args) => mockQuery(...args),
  limitToLast: (...args) => mockLimitToLast(...args),
}));

vi.mock('../../config/firebase', () => ({
  database: {},
}));

vi.mock('../../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

// MultiplayerChat renders user cards for message authors which can pull in useAuth.
// Mock it to avoid requiring a Router + Firebase Auth setup in these unit tests.
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, friends: [], sendFriendRequest: vi.fn() }),
}));

describe('MultiplayerChat', () => {
  let mockUnsubscribe;
  let mockOnValueCallback;
  const mockAuthUser = {
    uid: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    mockOnValueCallback = null;

    mockOnValue.mockImplementation((ref, callback) => {
      mockOnValueCallback = callback;
      return mockUnsubscribe;
    });
    mockRef.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockLimitToLast.mockReturnValue({});
  });

  it('renders chat toggle button when gameCode and authUser are provided', () => {
    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    const toggleButton = screen.getByRole('button');
    expect(toggleButton).toBeInTheDocument();
  });

  it('does not render chat when gameCode is missing', () => {
    render(<MultiplayerChat gameCode={null} authUser={mockAuthUser} />, { wrapper: Wrapper });

    const toggleButton = screen.queryByRole('button');
    expect(toggleButton).not.toBeInTheDocument();
  });

  it('opens and closes chat panel when toggle button is clicked', () => {
    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    const toggleButton = screen.getByRole('button');
    
    // Chat should be closed initially
    expect(screen.queryByPlaceholderText(/Type a message/i)).not.toBeInTheDocument();

    // Open chat
    fireEvent.click(toggleButton);
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();

    // Close chat
    fireEvent.click(toggleButton);
    expect(screen.queryByPlaceholderText(/Type a message/i)).not.toBeInTheDocument();
  });

  it('displays messages from Firebase', async () => {
    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    // Open chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    // Simulate Firebase message data
    const snapshot = {
      exists: () => true,
      val: () => ({
        'msg1': {
          uid: 'user-2',
          name: 'Other User',
          text: 'Hello!',
          createdAt: Date.now() - 1000,
        },
        'msg2': {
          uid: 'user-1',
          name: 'Test User',
          text: 'Hi there!',
          createdAt: Date.now(),
        },
      }),
    };

    act(() => {
      mockOnValueCallback(snapshot);
    });

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('sends message when Enter is pressed', async () => {
    const mockPushRef = {};
    mockPush.mockReturnValue(mockPushRef);
    mockSet.mockResolvedValue(undefined);

    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    // Open chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(mockPushRef, expect.objectContaining({
        text: 'Test message',
        uid: 'user-1',
        name: 'Test User',
      }));
    });
  });

  it('does not send empty messages', async () => {
    mockPush.mockReturnValue({});
    mockSet.mockResolvedValue(undefined);

    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    const input = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(input, { target: { value: '   ' } }); // Only whitespace
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  it('shows unread message count badge when chat is closed', async () => {
    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    // Wait a bit for the component to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Simulate messages arriving while chat is closed
    // Use a timestamp that's definitely after the initialization
    const messageTime = Date.now() + 1000;
    const snapshot = {
      exists: () => true,
      val: () => ({
        'msg1': {
          uid: 'user-2',
          name: 'Other User',
          text: 'New message!',
          createdAt: messageTime,
        },
      }),
    };

    act(() => {
      if (mockOnValueCallback) {
        mockOnValueCallback(snapshot);
      }
    });

    await waitFor(() => {
      const badge = screen.queryByText('1');
      expect(badge).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('clears unread count when chat is opened', async () => {
    render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    // Wait a bit for the component to initialize
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Add unread message with timestamp after initialization
    const messageTime = Date.now() + 1000;
    const snapshot = {
      exists: () => true,
      val: () => ({
        'msg1': {
          uid: 'user-2',
          name: 'Other User',
          text: 'New message!',
          createdAt: messageTime,
        },
      }),
    };

    act(() => {
      if (mockOnValueCallback) {
        mockOnValueCallback(snapshot);
      }
    });

    await waitFor(() => {
      expect(screen.queryByText('1')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Open chat
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  it('unsubscribes from Firebase on unmount', () => {
    const { unmount } = render(<MultiplayerChat gameCode="TEST123" authUser={mockAuthUser} />, { wrapper: Wrapper });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
