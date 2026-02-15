import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../../lib/wordle', () => ({
  WORD_LENGTH: 5,
  getGreenPattern: vi.fn(() => ['A', 'B', 'C', 'D', 'E']),
}));

vi.mock('../../lib/gameUtils', () => ({
  bgForColor: vi.fn((color) => {
    if (color === 'green') return '#50a339';
    if (color === 'yellow') return '#B1A04C';
    if (color === 'grey') return '#3A3A3C';
    return '#212121';
  }),
}));

import TileRow from './TileRow';
import { bgForColor } from '../../lib/gameUtils';

describe('TileRow', () => {
  const baseBoard = {
    guesses: [],
    isSolved: false,
    isDead: false,
    lastRevealId: null,
  };

  it('renders current input row with typed letters and placeholder pattern', () => {
    const board = { ...baseBoard, guesses: [] };

    const { container } = render(
      <TileRow
        board={board}
        rowIdx={0}
        currentGuess="AB"
        invalidCurrentGuess={false}
        numBoards={4}
        maxTurns={6}
        isUnlimited={false}
        revealId={0}
        isJustRevealedRow={false}
      />
    );

    // Ensure the typed letters appear somewhere in the row output
    const rowText = container.textContent;
    expect(rowText).toContain('A');
    expect(rowText).toContain('B');
  });

  it('marks current row as invalid when invalidCurrentGuess is true', () => {
    const board = { ...baseBoard, guesses: [] };

    const { container } = render(
      <TileRow
        board={board}
        rowIdx={0}
        currentGuess="ABCDE"
        invalidCurrentGuess={true}
        numBoards={4}
        maxTurns={6}
        isUnlimited={false}
        revealId={0}
        isJustRevealedRow={false}
      />
    );

    const tiles = container.querySelectorAll('div');
    const tileDivs = Array.from(tiles).filter((el) => el.style.border.includes('2px solid'));
    expect(tileDivs.length).toBeGreaterThan(0);
  });

  it('uses bgForColor for revealed rows when not flipping', () => {
    const board = {
      ...baseBoard,
      guesses: [
        { word: 'APPLE', colors: ['green', 'yellow', 'grey', 'grey', 'grey'] },
      ],
      lastRevealId: 1,
    };

    const { container } = render(
      <TileRow
        board={board}
        rowIdx={0}
        currentGuess=""
        invalidCurrentGuess={false}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        revealId={0}
        isJustRevealedRow={false}
      />
    );

    const tiles = container.querySelectorAll('div');
    const tileDivs = Array.from(tiles).filter((el) => el.style.width);
    expect(tileDivs.length).toBeGreaterThanOrEqual(5);

    // bgForColor should have been called for at least one tile color
    expect(bgForColor).toHaveBeenCalled();
  });
});
