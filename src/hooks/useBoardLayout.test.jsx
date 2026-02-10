import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardLayout } from './useBoardLayout';
import * as wordleLib from '../lib/wordle';

vi.mock('../lib/wordle', () => ({
  buildLetterMapFromGuesses: vi.fn((guesses) => {
    // Simple mock that returns a map based on guess count
    const map = {};
    guesses.forEach((guess) => {
      if (guess && guess.word) {
        guess.word.split('').forEach((letter) => {
          map[letter] = 'gray';
        });
      }
    });
    return map;
  }),
}));

describe('useBoardLayout', () => {
  it('computes per-board letter maps from guesses', () => {
    const boards = [
      {
        guesses: [{ word: 'APPLE', colors: ['green', 'green', 'green', 'green', 'green'] }],
      },
      {
        guesses: [{ word: 'BERRY', colors: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow'] }],
      },
    ];

    const { result } = renderHook(() => useBoardLayout(boards, null, 2));

    expect(result.current.perBoardLetterMaps).toHaveLength(2);
    expect(wordleLib.buildLetterMapFromGuesses).toHaveBeenCalledTimes(2);
  });

  it('returns focused letter map when board is selected', () => {
    const boards = [
      {
        guesses: [{ word: 'APPLE', colors: ['green', 'green', 'green', 'green', 'green'] }],
      },
      {
        guesses: [{ word: 'BERRY', colors: ['yellow', 'yellow', 'yellow', 'yellow', 'yellow'] }],
      },
    ];

    const { result } = renderHook(() => useBoardLayout(boards, 0, 2));

    expect(result.current.focusedLetterMap).not.toBeNull();
    expect(result.current.focusedLetterMap).toEqual(result.current.perBoardLetterMaps[0]);
  });

  it('returns null focused letter map when no board is selected', () => {
    const boards = [
      {
        guesses: [{ word: 'APPLE', colors: ['green', 'green', 'green', 'green', 'green'] }],
      },
    ];

    const { result } = renderHook(() => useBoardLayout(boards, null, 1));

    expect(result.current.focusedLetterMap).toBeNull();
  });

  it('computes square-ish grid layout for boards', () => {
    const boards = Array.from({ length: 9 }, () => ({ guesses: [] }));

    const { result } = renderHook(() => useBoardLayout(boards, null, 9));

    // 9 boards should be 3x3
    expect(result.current.gridCols).toBe(3);
    expect(result.current.gridRows).toBe(3);
  });

  it('handles non-square board counts', () => {
    const boards = Array.from({ length: 5 }, () => ({ guesses: [] }));

    const { result } = renderHook(() => useBoardLayout(boards, null, 5));

    // 5 boards: sqrt(5) ≈ 2.23, ceil = 3, so 3 cols, 2 rows
    expect(result.current.gridCols).toBe(3);
    expect(result.current.gridRows).toBe(2);
  });

  it('handles empty boards array', () => {
    const { result } = renderHook(() => useBoardLayout([], null, 0));

    expect(result.current.perBoardLetterMaps).toEqual([]);
    expect(result.current.gridCols).toBeGreaterThan(0);
    expect(result.current.gridRows).toBeGreaterThan(0);
  });

  it('uses numBoards when provided instead of boards length', () => {
    const boards = [{ guesses: [] }];

    const { result } = renderHook(() => useBoardLayout(boards, null, 16));

    // Should use numBoards (16) for grid calculation
    expect(result.current.gridCols).toBe(4); // sqrt(16) = 4
    expect(result.current.gridRows).toBe(4);
  });
});
