import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

let lastOnValueCallback = null;

const refMock = vi.fn((db, path) => ({ db, path }));
const pushMock = vi.fn((refObj) => ({ key: 'auto-id', ref: refObj }));
const setMock = vi.fn();
const updateMock = vi.fn();

const queryMock = vi.fn((refObj) => refObj);
const limitToLastMock = vi.fn((n) => ({ limit: n }));

vi.mock('firebase/database', () => ({
  ref: (...args) => refMock(...args),
  onValue: (refObj, cb) => {
    lastOnValueCallback = cb;
    return () => {};
  },
  push: (...args) => pushMock(...args),
  set: (...args) => setMock(...args),
  update: (...args) => updateMock(...args),
  query: (...args) => queryMock(...args),
  limitToLast: (...args) => limitToLastMock(...args),
}));

vi.mock('../../config/firebase', () => ({
  database: {},
}));

const useAuthMock = vi.fn(() => ({ user: null }));
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

import CommentsSection from './CommentsSection';

const emitCommentsSnapshot = (data) => {
  if (!lastOnValueCallback) {
    throw new Error('onValue callback not registered');
  }
  const snapshot = {
    exists: () => !!data && Object.keys(data).length > 0,
    val: () => data,
  };
  act(() => {
    lastOnValueCallback(snapshot);
  });
};

describe('CommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastOnValueCallback = null;
    // Reset auth mock to default (no user) unless overridden in a test
    useAuthMock.mockReturnValue({ user: null });
  });

  it('renders a time label for comments with createdAt', () => {
    render(<CommentsSection threadId="thread-1" />);

    const ts = new Date('2024-01-01T15:02:00Z').getTime();
    emitCommentsSnapshot({
      c1: {
        username: 'Alice',
        text: 'Hello world',
        createdAt: ts,
        userReactions: {},
      },
    });

    const expectedTime = new Date(ts).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });

  it('shows newest comments first based on createdAt', () => {
    render(<CommentsSection threadId="thread-1" />);

    const older = new Date('2024-01-01T10:00:00Z').getTime();
    const newer = new Date('2024-01-01T11:00:00Z').getTime();

    emitCommentsSnapshot({
      c1: {
        username: 'Old',
        text: 'First',
        createdAt: older,
        userReactions: {},
      },
      c2: {
        username: 'New',
        text: 'Second',
        createdAt: newer,
        userReactions: {},
      },
    });

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('New');
    expect(items[1]).toHaveTextContent('Old');
  });

  it('submits a new comment with createdAt and userReactions fields', async () => {
    useAuthMock.mockReturnValue({
      user: {
        uid: 'u1',
        displayName: 'Test User',
        email: 'user@example.com',
      },
    });

    render(<CommentsSection threadId="thread-1" />);

    // Seed empty comments so the list renders
    emitCommentsSnapshot({});

    const textarea = screen.getByRole('textbox', { name: /^comment$/i });
    fireEvent.change(textarea, { target: { value: 'Nice puzzle!' } });

    const submitButton = screen.getByRole('button', { name: /post comment/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(setMock).toHaveBeenCalled();
    });

    const [, payload] = setMock.mock.calls[0];
    expect(payload.username).toBe('Test User');
    expect(payload.text).toBe('Nice puzzle!');
    expect(typeof payload.createdAt).toBe('number');
    expect(payload).toHaveProperty('userReactions');
    expect(payload.userReactions).toEqual({});
  });

  it('derives reaction counts from per-user userReactions map', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'u1', displayName: 'User1' },
    });

    render(<CommentsSection threadId="thread-1" />);

    emitCommentsSnapshot({
      c1: {
        username: 'Alice',
        text: 'Hello',
        createdAt: Date.now(),
        userReactions: {
          u1: '👍',
          u2: '👍',
          u3: '❤️',
        },
      },
    });

    const thumbsButton = screen.getByRole('button', { name: /👍/ });
    const heartButton = screen.getByRole('button', { name: /❤️/ });

    expect(thumbsButton).toHaveTextContent('👍');
    expect(thumbsButton).toHaveTextContent('2');

    expect(heartButton).toHaveTextContent('❤️');
    expect(heartButton).toHaveTextContent('1');
  });

  it('allows a signed-in user to toggle and switch a single reaction', () => {
    useAuthMock.mockReturnValue({
      user: { uid: 'u1', displayName: 'User1' },
    });

    render(<CommentsSection threadId="thread-1" />);

    // Start with no reactions
    emitCommentsSnapshot({
      c1: {
        username: 'Bob',
        text: 'Great stage',
        createdAt: Date.now(),
        userReactions: {},
      },
    });

    const thumbsButton = screen.getByRole('button', { name: /👍/ });

    // First click adds 👍 reaction for u1
    fireEvent.click(thumbsButton);
    expect(updateMock).toHaveBeenCalledWith(
      { db: {}, path: 'comments/thread-1/c1' },
      { 'userReactions/u1': '👍' },
    );

    vi.clearAllMocks();

    // Now pretend server echoed back u1's 👍 reaction
    emitCommentsSnapshot({
      c1: {
        username: 'Bob',
        text: 'Great stage',
        createdAt: Date.now(),
        userReactions: { u1: '👍' },
      },
    });

    // Clicking the same emoji removes the reaction
    fireEvent.click(thumbsButton);
    expect(updateMock).toHaveBeenCalledWith(
      { db: {}, path: 'comments/thread-1/c1' },
      { 'userReactions/u1': null },
    );

    vi.clearAllMocks();

    // With an existing 👍, clicking a different emoji switches it
    emitCommentsSnapshot({
      c1: {
        username: 'Bob',
        text: 'Great stage',
        createdAt: Date.now(),
        userReactions: { u1: '👍' },
      },
    });

    const heartButton = screen.getByRole('button', { name: /❤️/ });
    fireEvent.click(heartButton);
    expect(updateMock).toHaveBeenCalledWith(
      { db: {}, path: 'comments/thread-1/c1' },
      { 'userReactions/u1': '❤️' },
    );
  });

  it('uses a stable guest client id for reactions when not signed in', () => {
    useAuthMock.mockReturnValue({ user: null });

    render(<CommentsSection threadId="thread-guest" />);

    emitCommentsSnapshot({
      c1: {
        username: 'Guest',
        text: 'Fun puzzle',
        createdAt: Date.now(),
        userReactions: {},
      },
    });

    const thumbsButton = screen.getByRole('button', { name: /👍/ });
    fireEvent.click(thumbsButton);

    expect(updateMock).toHaveBeenCalled();
    const [, updates] = updateMock.mock.calls[0];
    const keys = Object.keys(updates);
    expect(keys).toHaveLength(1);
    const key = keys[0];
    expect(key).toMatch(/^userReactions\/guest:/);
  });

  it('shows Share Result button when shareTextForComment is provided and pre-fills comment on click without posting', () => {
    render(
      <CommentsSection
        threadId="thread-1"
        shareTextForComment="Wuzzle Games - Daily\nGuesses: 2/6\nSolved!"
      />,
    );

    emitCommentsSnapshot({});

    const shareButton = screen.getByRole('button', { name: /share result/i });
    expect(shareButton).toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /^comment$/i });
    expect(textarea).toHaveValue('');

    fireEvent.click(shareButton);

    expect(textarea).toHaveValue(
      'Wuzzle Games - Daily\nGuesses: 2/6\nSolved!',
    );
    expect(setMock).not.toHaveBeenCalled();
  });

  it('does not show Share Result button when shareTextForComment is not provided', () => {
    render(<CommentsSection threadId="thread-1" />);
    emitCommentsSnapshot({});
    expect(screen.queryByRole('button', { name: /share result/i })).not.toBeInTheDocument();
  });
});
