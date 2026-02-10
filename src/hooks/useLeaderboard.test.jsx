import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let lastOnValueCallback = null;
let lastOnValueErrorCallback = null;

const refMock = vi.fn((db, path) => ({ db, path }));
const queryMock = vi.fn((refObj, ...rest) => ({ ref: refObj, args: rest }));
const limitToLastMock = vi.fn((n) => ({ type: 'limitToLast', n }));
const pushMock = vi.fn(() => ({ key: 'new-key' }));
const setMock = vi.fn();

vi.mock('firebase/database', () => ({
  ref: (...args) => refMock(...args),
  query: (...args) => queryMock(...args),
  limitToLast: (...args) => limitToLastMock(...args),
  onValue: (q, cb, errCb) => {
    lastOnValueCallback = cb;
    lastOnValueErrorCallback = errCb;
    return () => {};
  },
  push: (...args) => pushMock(...args),
  set: (...args) => setMock(...args),
}));

vi.mock('../config/firebase', () => ({
  database: {},
}));

import { useLeaderboard, submitSpeedrunScore } from './useLeaderboard';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_700_000_000_000); // fixed base time
  lastOnValueCallback = null;
  lastOnValueErrorCallback = null;
  refMock.mockClear();
  queryMock.mockClear();
  limitToLastMock.mockClear();
  pushMock.mockClear();
  setMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function triggerSnapshot(data) {
  if (!lastOnValueCallback) throw new Error('onValue callback not registered');
  const snapshot = { val: () => data };
  act(() => {
    lastOnValueCallback(snapshot);
  });
}

function triggerError(err) {
  if (!lastOnValueErrorCallback) throw new Error('onValue error callback not registered');
  act(() => {
    lastOnValueErrorCallback(err);
  });
}

describe('useLeaderboard', () => {
  it('filters to current-day timestamps, applies numBoards filter, and sorts correctly', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const raw = {
      a: { userId: 'u1', userName: 'A', numBoards: 3, timeMs: 9000, timestamp: now },
      b: { userId: 'u2', userName: 'B', numBoards: 3, timeMs: 12000, timestamp: now - 1000 },
      c: { userId: 'u3', userName: 'C', numBoards: 3, timeMs: 11000, timestamp: now + 1000 },
      d: { userId: 'u4', userName: 'D', numBoards: 3, timeMs: 11000, timestamp: now + 2000 },
      e: { userId: 'u5', userName: 'E', numBoards: 2, timeMs: 8000, timestamp: now - dayMs }, // previous day
      f: { userId: 'u6', userName: 'F', numBoards: 3, timeMs: 5000, timestamp: now + dayMs },  // next day
    };

    const { result, rerender } = renderHook(({ mode, boards }) => useLeaderboard(mode, boards, 10), {
      initialProps: { mode: 'daily', boards: null },
    });

    // Simulate initial data load
    triggerSnapshot(raw);

    // Current-day filter should remove e and f. Sort by timeMs ascending (faster first), then timestamp for ties.
    expect(result.current.entries.map((e) => e.userName)).toEqual([
      'A', // timeMs 9000
      'C', // timeMs 11000, earlier timestamp
      'D', // timeMs 11000, later timestamp
      'B', // timeMs 12000
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    // Now apply numBoards filter = 3 via rerender
    rerender({ mode: 'daily', boards: 3 });
    // Effect re-runs and registers a new onValue callback; trigger again
    triggerSnapshot(raw);

    const filtered = result.current.entries;
    expect(filtered.every((e) => e.numBoards === 3)).toBe(true);
    // Same ordering within that filter
    expect(filtered.map((e) => e.userName)).toEqual(['A', 'C', 'D', 'B']);
  });

  it('sets error and stops loading when onValue error callback is invoked', () => {
    const { result } = renderHook(() => useLeaderboard('daily', null, 10));

    const err = new Error('boom');
    triggerError(err);

    expect(result.current.error).toBe('boom');
    expect(result.current.loading).toBe(false);
  });

  it('drops entries with non-numeric or missing timeMs', () => {
    const now = Date.now();
    const raw = {
      good: {
        userId: 'u1',
        userName: 'Good',
        numBoards: 3,
        timeMs: 5000,
        timestamp: now,
      },
      badTime: {
        userId: 'u2',
        userName: 'BadTime',
        numBoards: 3,
        timeMs: 'not-a-number',
        timestamp: now,
      },
      missingTime: {
        userId: 'u3',
        userName: 'MissingTime',
        numBoards: 3,
        // no timeMs
        timestamp: now,
      },
      valid: {
        userId: 'u4',
        userName: 'Valid',
        numBoards: 3,
        timeMs: 8000,
        timestamp: now,
      },
    };

    const { result } = renderHook(() => useLeaderboard('daily', null, 10));
    triggerSnapshot(raw);

    // Entries with invalid or missing timeMs should be dropped.
    expect(result.current.entries.map((e) => e.userName)).toEqual(['Good', 'Valid']);
  });
});

describe('submitSpeedrunScore', () => {
  it('throws when userId is missing', async () => {
    await expect(
      submitSpeedrunScore(null, 'Name', 'daily', 3, 1234),
    ).rejects.toThrow(/must be signed in/i);

    await expect(
      submitSpeedrunScore('', 'Name', 'daily', 3, 1234),
    ).rejects.toThrow(/must be signed in/i);
  });

  it('pushes and sets correct payload and returns entry key', async () => {
    vi.setSystemTime(1_700_000_123_000);

    const resultKey = await submitSpeedrunScore(
      'uid123',
      'Alice',
      'daily',
      4,
      12_345,
    );

    // Correct ref path
    expect(refMock).toHaveBeenCalledWith(expect.anything(), 'leaderboard/daily');

    // push called with that ref and returned our mock entryRef
    const pushArgs = pushMock.mock.calls[0];
    expect(pushArgs[0]).toEqual({ db: {}, path: 'leaderboard/daily' });

    // set called with entryRef and payload (no score field)
    expect(setMock).toHaveBeenCalledTimes(1);
    const [entryRefArg, entryArg] = setMock.mock.calls[0];
    expect(entryRefArg).toEqual({ key: 'new-key' });
    expect(entryArg).toEqual({
      userId: 'uid123',
      userName: 'Alice',
      numBoards: 4,
      timeMs: 12_345,
      timestamp: 1_700_000_123_000,
    });
    expect(entryArg).not.toHaveProperty('score');

    expect(resultKey).toBe('new-key');
  });

  it('defaults userName to "Anonymous" when falsy', async () => {
    vi.setSystemTime(1_700_000_200_000);

    await submitSpeedrunScore('uid456', '', 'marathon', 2, 5_000);

    const [, lastEntry] = setMock.mock.calls[setMock.mock.calls.length - 1];
    expect(lastEntry.userName).toBe('Anonymous');
    expect(lastEntry.userId).toBe('uid456');
    expect(lastEntry.numBoards).toBe(2);
    expect(lastEntry.timeMs).toBe(5_000);
    expect(lastEntry).not.toHaveProperty('score');
  });
});
