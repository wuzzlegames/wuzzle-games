import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeededRandom, selectDailyWord, selectDailyWords } from './dailyWords.js';

// Note: getCurrentDateString uses Date.now under the hood via new Date().
// We'll use vi.setSystemTime to make date-dependent behaviour deterministic.

describe('SeededRandom', () => {
  it('produces deterministic sequence for a given seed', () => {
    const rng1 = new SeededRandom(1234);
    const rng2 = new SeededRandom(1234);

    const seq1 = [rng1.next(), rng1.next(), rng1.next()];
    const seq2 = [rng2.next(), rng2.next(), rng2.next()];

    expect(seq1).toEqual(seq2);
  });
});

describe('selectDailyWord / selectDailyWords', () => {
  const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('selectDailyWord returns same word for same date and parameters', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    const date = '2024-01-01';

    const w1 = selectDailyWord(WORDS, date, 0, 'daily', false, null, 1);
    const w2 = selectDailyWord(WORDS, date, 0, 'daily', false, null, 1);

    expect(w1).toBe(w2);
  });

  it('selectDailyWords is deterministic for given date and parameters', () => {
    vi.setSystemTime(new Date('2024-02-02T00:00:00Z'));

    const first = selectDailyWords(WORDS, 3, 'daily', false, null);
    const second = selectDailyWords(WORDS, 3, 'daily', false, null);

    expect(first).toEqual(second);
  });

  it('selectDailyWords returns exactly numBoards words and avoids duplicates when possible', () => {
    vi.setSystemTime(new Date('2024-03-03T00:00:00Z'));

    const words = selectDailyWords(WORDS, 4, 'daily', false, null);
    expect(words).toHaveLength(4);
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
  });
});