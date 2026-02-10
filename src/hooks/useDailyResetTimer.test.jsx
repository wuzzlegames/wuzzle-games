import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyResetTimer } from './useDailyResetTimer';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDailyResetTimer', () => {
  it('returns a non-empty countdown string and updates over time', () => {
    // Freeze time at 23:30 local so there is 30m until midnight
    const baseDate = new Date();
    baseDate.setHours(23, 30, 0, 0);
    vi.setSystemTime(baseDate);

    const { result } = renderHook(() => useDailyResetTimer());

    // Initial value should be a non-empty string like "30m 0s"
    expect(typeof result.current).toBe('string');
    expect(result.current.length).toBeGreaterThan(0);

    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const second = result.current;
    // After 2 seconds, countdown string should have changed
    expect(second).not.toBe(first);
  });
});
