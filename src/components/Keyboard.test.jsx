import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Keyboard from './Keyboard';

// Helper to create a minimal perBoardLetterMaps array
function makeLetterMaps(keys, status = 'none') {
  const map = {};
  keys.forEach((k) => {
    map[k] = status;
  });
  return [map];
}

describe('Keyboard', () => {
  it('renders letter and action keys and calls onVirtualKey when clicked', () => {
    const onVirtualKey = vi.fn();

    render(
      <Keyboard
        numBoards={1}
        selectedBoardIndex={0}
        perBoardLetterMaps={makeLetterMaps(['A', 'B'])}
        focusedLetterMap={{}}
        gridCols={1}
        gridRows={1}
        onVirtualKey={onVirtualKey}
      />
    );

    const aKey = screen.getByRole('button', { name: 'A' });
    fireEvent.click(aKey);

    const enterKey = screen.getByRole('button', { name: 'Enter' });
    fireEvent.click(enterKey);

    const backspaceKey = screen.getByRole('button', { name: 'Backspace' });
    fireEvent.click(backspaceKey);

    // Should have been called for each click with the raw key token
    expect(onVirtualKey).toHaveBeenCalledWith('A');
    expect(onVirtualKey).toHaveBeenCalledWith('ENTER');
    expect(onVirtualKey).toHaveBeenCalledWith('BACK');
  });

  it('shows per-board grid overlay when multiple boards and no focused board', () => {
    const onVirtualKey = vi.fn();

    const perBoardLetterMaps = [
      { A: 'green' },
      { A: 'yellow' },
      { A: 'none' },
    ];

    render(
      <Keyboard
        numBoards={3}
        selectedBoardIndex={null}
        perBoardLetterMaps={perBoardLetterMaps}
        focusedLetterMap={{}}
        gridCols={3}
        gridRows={2}
        onVirtualKey={onVirtualKey}
      />
    );

    const aKey = screen.getByRole('button', { name: 'A' });
    const overlay = aKey.querySelector('.keyOverlayGrid');
    expect(overlay).not.toBeNull();

    const miniCells = overlay.querySelectorAll('.keyOverlayCell');
    expect(miniCells.length).toBe(3);

    // Should also render padding cells to fill the grid
    const padCells = overlay.querySelectorAll('.keyOverlayPad');
    expect(padCells.length).toBeGreaterThan(0);
  });
});
