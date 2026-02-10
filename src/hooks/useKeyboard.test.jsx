import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useKeyboard } from './useKeyboard';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useKeyboard hook', () => {
  it('invokes callbacks for Enter, Backspace, and letter keys when enabled', () => {
    const onEnter = vi.fn();
    const onBackspace = vi.fn();
    const onLetter = vi.fn();

    renderHook(() =>
      useKeyboard({
        disabled: false,
        onEnter,
        onBackspace,
        onLetter,
      })
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Backspace' });
      fireEvent.keyDown(window, { key: 'a' });
    });

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onLetter).toHaveBeenCalledWith('A');
  });

  it('does not call callbacks when disabled', () => {
    const onEnter = vi.fn();
    const onBackspace = vi.fn();
    const onLetter = vi.fn();

    renderHook(() =>
      useKeyboard({
        disabled: true,
        onEnter,
        onBackspace,
        onLetter,
      })
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: 'Backspace' });
      fireEvent.keyDown(window, { key: 'z' });
    });

    expect(onEnter).not.toHaveBeenCalled();
    expect(onBackspace).not.toHaveBeenCalled();
    expect(onLetter).not.toHaveBeenCalled();
  });

  it('uses the latest callback references after props change', () => {
    const firstEnter = vi.fn();
    const secondEnter = vi.fn();

    const { rerender } = renderHook(
      ({ onEnter }) =>
        useKeyboard({
          disabled: false,
          onEnter,
          onBackspace: () => {},
          onLetter: () => {},
        }),
      {
        initialProps: { onEnter: firstEnter },
      }
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });

    expect(firstEnter).toHaveBeenCalledTimes(1);
    expect(secondEnter).toHaveBeenCalledTimes(0);

    rerender({ onEnter: secondEnter });

    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });

    expect(firstEnter).toHaveBeenCalledTimes(1);
    expect(secondEnter).toHaveBeenCalledTimes(1);
  });
});
