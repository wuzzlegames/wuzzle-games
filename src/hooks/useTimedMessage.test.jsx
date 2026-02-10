import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimedMessage } from './useTimedMessage';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useTimedMessage', () => {
  it('sets and auto-clears the message after the given timeout', () => {
    const { result } = renderHook(() => useTimedMessage());

    act(() => {
      result.current.setTimedMessage('Hello', 1000);
    });

    expect(result.current.message).toBe('Hello');

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.message).toBe('Hello');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.message).toBe('');
  });

  it('clears previous timers when setTimedMessage is called again', () => {
    const { result } = renderHook(() => useTimedMessage());

    act(() => {
      result.current.setTimedMessage('First', 1000);
    });

    act(() => {
      vi.advanceTimersByTime(500);
      result.current.setTimedMessage('Second', 1000);
    });

    act(() => {
      vi.advanceTimersByTime(600);
    });
    // After 1100ms total, second timer still running (only 600ms for second)
    expect(result.current.message).toBe('Second');

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.message).toBe('');
  });
});