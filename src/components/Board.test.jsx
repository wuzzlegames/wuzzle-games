import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Board from './Board';

function makeBoard({ guesses = [], isSolved = false, isDead = false, lastRevealId = null } = {}) {
  return { guesses, isSolved, isDead, lastRevealId };
}

describe('Board', () => {
  it('renders basic board header and aria label', () => {
    const board = makeBoard();

    render(
      <Board
        board={board}
        index={0}
        selected={true}
        onToggleSelect={() => {}}
        currentGuess="HELLO"
        invalidCurrentGuess={false}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    expect(screen.getByText('Board 1 (focused)')).toBeInTheDocument();
    expect(screen.getByText('0/6')).toBeInTheDocument();

    const container = screen.getByRole('button', { name: /board 1/i });
    expect(container).toHaveClass('boardCardSelected');
  });

  it('shows solved and failed labels based on board state', () => {
    const solved = makeBoard({ guesses: [{ word: 'HELLO', colors: [] }], isSolved: true });
    const failed = makeBoard({ guesses: Array.from({ length: 6 }, () => ({ word: 'AAAAA', colors: [] })), isDead: true });

    const { rerender } = render(
      <Board
        board={solved}
        index={0}
        selected={false}
        onToggleSelect={() => {}}
        currentGuess=""
        invalidCurrentGuess={false}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    expect(screen.getByText('Solved')).toBeInTheDocument();

    rerender(
      <Board
        board={failed}
        index={1}
        selected={false}
        onToggleSelect={() => {}}
        currentGuess=""
        invalidCurrentGuess={false}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('calls onToggleSelect when clicked or when Enter/Space pressed', () => {
    const board = makeBoard();
    const onToggleSelect = vi.fn();

    render(
      <Board
        board={board}
        index={0}
        selected={false}
        onToggleSelect={onToggleSelect}
        currentGuess=""
        invalidCurrentGuess={false}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    const container = screen.getByRole('button', { name: /board 1/i });

    fireEvent.click(container);
    expect(onToggleSelect).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(container, { key: 'Enter' });
    fireEvent.keyDown(container, { key: ' ' });
    expect(onToggleSelect).toHaveBeenCalledTimes(3);
  });

  it('highlights invalid current row when invalidCurrentGuess is true', () => {
    const board = makeBoard({ guesses: [] });

    const { container, rerender } = render(
      <Board
        board={board}
        index={0}
        selected={false}
        onToggleSelect={() => {}}
        currentGuess="HELLO"
        invalidCurrentGuess={false}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    // In non-collapsed mode, the current row is always present when hasCurrentRow is true,
    // so the invalid styling should be applied to exactly one row (the current one).
    const rowsBefore = container.querySelectorAll('.boardRow');
    expect(rowsBefore.length).toBeGreaterThan(0);

    // Capture the style of the last row's first cell before invalidation
    const beforeLastRowCells = rowsBefore[rowsBefore.length - 1].querySelectorAll('.cell');
    const beforeBorder = beforeLastRowCells[0].style.borderColor;
    const beforeBg = beforeLastRowCells[0].style.backgroundColor;

    rerender(
      <Board
        board={board}
        index={0}
        selected={false}
        onToggleSelect={() => {}}
        currentGuess="HELLO"
        invalidCurrentGuess={true}
        maxTurns={6}
        isUnlimited={false}
        collapse={false}
      />
    );

    const rowsAfter = container.querySelectorAll('.boardRow');
    expect(rowsAfter.length).toBe(rowsBefore.length);

    // The last row (current guess row) should have different styling once invalid
    const lastRowCells = rowsAfter[rowsAfter.length - 1].querySelectorAll('.cell');
    expect(lastRowCells.length).toBeGreaterThan(0);
    const afterBorder = lastRowCells[0].style.borderColor;
    const afterBg = lastRowCells[0].style.backgroundColor;

    expect(afterBorder === beforeBorder && afterBg === beforeBg).toBe(false);
  });
});
