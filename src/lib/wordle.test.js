import { describe, it, expect } from 'vitest';
import {
  WORD_LENGTH,
  scoreGuess,
  buildLetterMapFromGuesses,
  getMaxTurns,
  getTurnsUsed,
  formatElapsed,
  colorForStatus,
  colorForMiniCell,
} from './wordle.js';

describe('scoreGuess', () => {
  it('marks all letters green for an exact match', () => {
    const result = scoreGuess('APPLE', 'APPLE');
    expect(result).toEqual(Array(WORD_LENGTH).fill('green'));
  });

  it('marks all letters grey when none are in the solution', () => {
    const result = scoreGuess('ZZZZZ', 'APPLE');
    expect(result).toEqual(Array(WORD_LENGTH).fill('grey'));
  });

  it('handles mixed greens, yellows and greys with duplicates', () => {
    // solution has 2 Ps and 1 A, 1 L; guess has multiple P/A/L
    const result = scoreGuess('PAPAL', 'APPLE');
    // Expected from implementation: [yellow, yellow, green, grey, yellow]
    expect(result).toEqual(['yellow', 'yellow', 'green', 'grey', 'yellow']);
  });
});

describe('buildLetterMapFromGuesses', () => {
  it('keeps the highest priority status per letter (green > yellow > grey)', () => {
    const guesses = [
      { word: 'APPLE', colors: ['grey', 'grey', 'grey', 'yellow', 'grey'] },
      { word: 'ALERT', colors: ['green', 'grey', 'grey', 'grey', 'grey'] },
    ];

    const map = buildLetterMapFromGuesses(guesses);

    // A appeared yellow then green -> final should be green
    expect(map.A).toBe('green');
    // L appeared yellow once
    expect(map.L).toBe('yellow');
    // E only grey -> stays grey
    expect(map.E).toBe('grey');
  });

  it('returns empty map when no guesses', () => {
    expect(buildLetterMapFromGuesses([])).toEqual({});
  });
});

describe('getMaxTurns', () => {
  it('returns known milestone values', () => {
    expect(getMaxTurns(1)).toBe(6);
    expect(getMaxTurns(8)).toBe(12);
    expect(getMaxTurns(16)).toBe(21);
    expect(getMaxTurns(32)).toBe(37);
  });

  it('scales linearly between milestones without exceeding next milestone - 1', () => {
    // Between 1 and 8
    expect(getMaxTurns(2)).toBe(7); // 6 + 1
    expect(getMaxTurns(7)).toBe(11); // capped at next.turns - 1 (12 - 1)
  });

  it('grows beyond highest milestone', () => {
    const turns32 = getMaxTurns(32);
    const turns40 = getMaxTurns(40);
    expect(turns40).toBe(turns32 + (40 - 32));
  });
});

describe('getTurnsUsed', () => {
  it('returns 0 for no boards', () => {
    expect(getTurnsUsed([])).toBe(0);
  });

  it('returns the maximum guesses length across boards', () => {
    const boards = [
      { guesses: [{}, {}] },            // 2 guesses
      { guesses: [{}, {}, {}, {}] },    // 4 guesses
      { guesses: [{}, {}] },            // 2 guesses
    ];
    expect(getTurnsUsed(boards)).toBe(4);
  });
});

describe('formatElapsed', () => {
  it('formats 0ms as 00:00.0', () => {
    expect(formatElapsed(0)).toBe('00:00.0');
  });

  it('formats under a second correctly', () => {
    expect(formatElapsed(999)).toBe('00:00.9');
  });

  it('formats seconds and minutes with leading zeros', () => {
    expect(formatElapsed(12_345)).toBe('00:12.3'); // 12.3s
    expect(formatElapsed(65_432)).toBe('01:05.4'); // 1m 5.4s
  });

  it('never returns negative time', () => {
    expect(formatElapsed(-500)).toBe('00:00.0');
  });
});

describe('colorForStatus', () => {
  it('returns expected hex colors for tile statuses', () => {
    expect(colorForStatus('green')).toBe('#50a339');
    expect(colorForStatus('yellow')).toBe('#B1A04C');
    expect(colorForStatus('grey')).toBe('#3A3A3C');
    expect(colorForStatus('none')).toBe('#3A3A3C');
    expect(colorForStatus('unknown')).toBe('#3A3A3C');
  });
});

describe('colorForMiniCell', () => {
  it('returns expected hex colors for mini-cell statuses', () => {
    expect(colorForMiniCell('green')).toBe('#50a339');
    expect(colorForMiniCell('yellow')).toBe('#B1A04C');
    expect(colorForMiniCell('grey')).toBe('#3A3A3C');
    expect(colorForMiniCell('none')).toBe('#212121');
    expect(colorForMiniCell('unknown')).toBe('#212121');
  });
});
