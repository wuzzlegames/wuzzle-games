import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useLeaderboard', () => ({
  useLeaderboard: vi.fn(),
}));

vi.mock('../hooks/useUserBadges', () => ({
  useUserBadges: () => ({ userBadges: {}, loading: false, error: null }),
  useBadgesForUser: () => ({ userBadges: {}, loading: false }),
}));

vi.mock('./FeedbackModal', () => ({
  default: () => null,
}));

vi.mock('./SiteHeader', () => ({
  default: () => <header data-testid="site-header" />, // eslint-disable-line react/display-name
}));

import { useAuth } from '../hooks/useAuth';
import { useLeaderboard } from '../hooks/useLeaderboard';
import Leaderboard from './Leaderboard';

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: null });
  useLeaderboard.mockReturnValue({ entries: [], loading: false, error: null });
});

describe('Leaderboard component', () => {
  it('shows loading and empty states appropriately', async () => {
    // Loading state
    useLeaderboard.mockReturnValueOnce({ entries: [], loading: true, error: null });

    const { rerender } = render(<Leaderboard />);

    expect(await screen.findByText(/loading leaderboard/i)).toBeInTheDocument();
    expect(screen.queryByText(/no entries yet/i)).toBeNull();

    // Empty state after loading completes
    useLeaderboard.mockReturnValueOnce({ entries: [], loading: false, error: null });

    rerender(<Leaderboard />);

    expect(await screen.findByText(/no entries yet/i)).toBeInTheDocument();
  });

  it('toggles mode between daily and marathon and passes args to useLeaderboard', async () => {
    const { rerender } = render(<Leaderboard />);

    await screen.findByRole('heading', { name: /speedrun leaderboard/i });

    const modeSelect = screen.getAllByRole('combobox')[0];
    expect(modeSelect).toHaveValue('daily');

    // Initial call should be for daily mode, default boards=1, limit 100
    expect(useLeaderboard).toHaveBeenCalledWith('daily', 1, 100);

    fireEvent.change(modeSelect, { target: { value: 'marathon' } });

    // Re-render to reflect updated hook calls
    rerender(<Leaderboard />);

    expect(modeSelect).toHaveValue('marathon');
    const calls = useLeaderboard.mock.calls;
    expect(
      calls.some(([mode, boards, limit]) => mode === 'marathon' && boards === null && limit === 100)
    ).toBe(true);
  });

  it('shows boards filter only for daily mode and supports selecting board counts', async () => {
    render(<Leaderboard />);

    await screen.findByRole('heading', { name: /speedrun leaderboard/i });

    // Daily mode by default: boards filter visible
    const selects = screen.getAllByRole('combobox');
    const boardsSelect = selects[1];
    expect(boardsSelect).toBeInTheDocument();
    expect(boardsSelect).toHaveValue('1');
    expect(screen.getByRole('option', { name: '1' })).toBeInTheDocument();

    // Change to a specific board count
    fireEvent.change(boardsSelect, { target: { value: '4' } });

    // useLeaderboard should eventually be called with numBoards = 4
    const calls = useLeaderboard.mock.calls;
    expect(calls.some(([mode, boards]) => mode === 'daily' && boards === 4)).toBe(true);

    // Switch to solution hunt mode: boards filter should disappear
    const modeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(modeSelect, { target: { value: 'solutionhunt' } });

    // After switching away from daily, only one combobox (mode) should remain
    expect(screen.getAllByRole('combobox').length).toBe(1);
  });

  it('renders rows with correct rank, fields, and highlights current user', async () => {
    const entries = [
      { id: '1', userId: 'u1', userName: 'Alice', numBoards: 3, timeMs: 12_345 },
      { id: '2', userId: 'u2', userName: 'Bob', numBoards: 3, timeMs: 15_000 },
    ];

    useAuth.mockReturnValue({ user: { uid: 'u1' } });
    useLeaderboard.mockReturnValue({ entries, loading: false, error: null });

    render(<Leaderboard />);

    await screen.findByRole('heading', { name: /speedrun leaderboard/i });

    // Header row plus two data rows
    const rows = screen.getAllByText(/#\d/).map((el) => el.closest('.leaderboardRow'));
    expect(rows).toHaveLength(2);

    // First row: rank #1, Alice (You)
    expect(screen.getByText('#1')).toBeInTheDocument();
    const aliceCells = screen.getAllByText(/Alice/);
    expect(aliceCells.length).toBeGreaterThan(0);
    const aliceRow = screen.getByText('#1').closest('.leaderboardRow');
    expect(aliceRow).not.toBeNull();
    expect(aliceRow?.textContent).toMatch(/Alice/);
    expect(screen.getByText(/you\)/i)).toBeInTheDocument();
    expect(aliceRow?.className).toContain('leaderboardRowCurrent');

    // Second row: rank #2, Bob
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Time formatting (shared formatElapsed mm:ss.tenths): 12_345 -> 00:12.3, 15_000 -> 00:15.0
    expect(screen.getByText('00:12.3')).toBeInTheDocument();
    expect(screen.getByText('00:15.0')).toBeInTheDocument();
  });
});
