import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPendingLeaderboardOnLogin, getAndClearPendingLeaderboard, addPendingLeaderboard } from './pendingLeaderboard';

const submitSpeedrunScoreMock = vi.fn();
vi.mock('../hooks/useLeaderboard', () => ({
  submitSpeedrunScore: (...args) => submitSpeedrunScoreMock(...args),
}));

vi.mock('./dailyWords', () => ({
  getCurrentDateString: () => '2025-02-25',
}));

const stored = {};
vi.mock('./persist', () => ({
  loadJSON: (key, fallback) => {
    const raw = stored[key];
    if (raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  saveJSON: (key, value) => {
    stored[key] = JSON.stringify(value);
  },
}));

describe('pendingLeaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored['mw:pendingLeaderboard'] = undefined;
  });

  it('flushPendingLeaderboardOnLogin calls submitSpeedrunScore with skipDateScoped true for past-day daily entry', async () => {
    addPendingLeaderboard({
      mode: 'daily',
      numBoards: 2,
      timeMs: 30_000,
      dateKey: '2025-02-20',
    });
    submitSpeedrunScoreMock.mockResolvedValue(undefined);

    await flushPendingLeaderboardOnLogin({
      uid: 'user1',
      displayName: 'Test User',
    });

    expect(submitSpeedrunScoreMock).toHaveBeenCalledTimes(1);
    expect(submitSpeedrunScoreMock).toHaveBeenCalledWith(
      'user1',
      'Test User',
      'daily',
      2,
      30_000,
      '2025-02-20',
      { skipDateScoped: true }
    );
  });

  it('flushPendingLeaderboardOnLogin calls submitSpeedrunScore without skipDateScoped for today daily entry', async () => {
    addPendingLeaderboard({
      mode: 'daily',
      numBoards: 1,
      timeMs: 15_000,
      dateKey: '2025-02-25',
    });
    submitSpeedrunScoreMock.mockResolvedValue(undefined);

    await flushPendingLeaderboardOnLogin({
      uid: 'user2',
      email: 'u@example.com',
    });

    expect(submitSpeedrunScoreMock).toHaveBeenCalledTimes(1);
    expect(submitSpeedrunScoreMock).toHaveBeenCalledWith(
      'user2',
      'u@example.com',
      'daily',
      1,
      15_000,
      '2025-02-25'
    );
    expect(submitSpeedrunScoreMock.mock.calls[0][6]).toBeUndefined();
  });

  it('flushPendingLeaderboardOnLogin calls submitSpeedrunScore without skipDateScoped for marathon', async () => {
    addPendingLeaderboard({
      mode: 'marathon',
      numBoards: 2,
      timeMs: 60_000,
      dateKey: '2025-02-20',
    });
    submitSpeedrunScoreMock.mockResolvedValue(undefined);

    await flushPendingLeaderboardOnLogin({ uid: 'user3', displayName: 'Marathon' });

    expect(submitSpeedrunScoreMock).toHaveBeenCalledTimes(1);
    expect(submitSpeedrunScoreMock).toHaveBeenCalledWith(
      'user3',
      'Marathon',
      'marathon',
      2,
      60_000,
      '2025-02-20'
    );
    expect(submitSpeedrunScoreMock.mock.calls[0][6]).toBeUndefined();
  });
});
