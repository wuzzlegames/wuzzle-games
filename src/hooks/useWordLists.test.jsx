import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('./useWordLists', async (orig) => {
  // This mock factory is only to allow us to import the real implementation below
  // while still being able to spy on global fetch. We immediately re-export the
  // original module.
  const real = await orig();
  return real;
});

import { useWordLists } from './useWordLists';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useWordLists', () => {
  it('loads word lists on first use and exposes loading, answerWords, and allowedSet', async () => {
    const answersText = 'apple\nberry\nshorter';
    const guessesText = 'apple\nberry';

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => answersText })
      .mockResolvedValueOnce({ ok: true, text: async () => guessesText });

    const { result } = renderHook(() => useWordLists());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.answerWords).toEqual(['APPLE', 'BERRY']);

    // allowedSet should contain the uppercase guesses from the second file
    expect(result.current.allowedSet.has('APPLE')).toBe(true);
    expect(result.current.allowedSet.has('BERRY')).toBe(true);
  });

  it('reuses cached data on subsequent calls without refetching', async () => {
    const answersText = 'alpha\nbeta';
    const guessesText = 'gamma\ndelta';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => answersText })
      .mockResolvedValueOnce({ ok: true, text: async () => guessesText });

    global.fetch = fetchMock;

    const first = renderHook(() => useWordLists());

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });

    // Second call should see cached data immediately and not trigger new fetches
    const second = renderHook(() => useWordLists());

    expect(second.result.current.loading).toBe(false);
  });
});
