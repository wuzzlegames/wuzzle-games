import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStageTimer } from './useStageTimer';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useStageTimer', () => {
  it('elapsedMs stays 0 when speedrun is disabled', () => {
    const { result } = renderHook(() => useStageTimer(false));
    expect(result.current.elapsedMs).toBe(0);
  });

  it('start and freeze track elapsed time when speedrun is enabled', () => {
    const { result } = renderHook(() => useStageTimer(true, 100));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // elapsedMs is derived from Date.now; with fake timers it should advance
    const elapsedBeforeFreeze = result.current.elapsedMs;
    expect(elapsedBeforeFreeze).toBeGreaterThanOrEqual(900);

    let frozen;
    act(() => {
      frozen = result.current.freeze();
    });

    expect(frozen).toBeGreaterThanOrEqual(900);
    expect(result.current.isFrozen).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // After freeze, elapsedMs should not increase
    expect(result.current.elapsedMs).toBeLessThanOrEqual(frozen + 50);
  });
});