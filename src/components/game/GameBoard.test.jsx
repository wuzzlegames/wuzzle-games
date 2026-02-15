import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GameBoard from './GameBoard';

vi.mock('./TileRow', () => ({
  __esModule: true,
  default: ({ rowIdx }) => <div data-testid={`tile-row-${rowIdx}`} />,
}));

describe('GameBoard', () => {
  const baseBoard = {
    guesses: [],
    isSolved: false,
    isDead: false,
  };

  it('renders header with board index, focused label, and guess count', () => {
    const onToggleSelect = vi.fn();

    render(
      <GameBoard
        board={baseBoard}
        index={0}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess="HELLO"
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={true}
        onToggleSelect={onToggleSelect}
        boardRef={null}
        speedrunEnabled={false}
      />
    );

    expect(screen.getByText(/Board 1 · focused/)).toBeInTheDocument();
    expect(screen.getByText('0/6')).toBeInTheDocument();
  });

  it('shows Solved and Failed labels correctly when not in speedrun mode', () => {
    const solvedBoard = { ...baseBoard, guesses: [{ word: 'HELLO', colors: [] }], isSolved: true };
    const deadBoard = {
      ...baseBoard,
      guesses: Array.from({ length: 6 }, () => ({ word: 'AAAAA', colors: [] })),
      isDead: true,
    };

    const { rerender } = render(
      <GameBoard
        board={solvedBoard}
        index={1}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess=""
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={false}
        onToggleSelect={() => {}}
        boardRef={null}
        speedrunEnabled={false}
      />
    );

    expect(screen.getByText('Solved')).toBeInTheDocument();

    rerender(
      <GameBoard
        board={deadBoard}
        index={1}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess=""
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={false}
        onToggleSelect={() => {}}
        boardRef={null}
        speedrunEnabled={false}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('hides guess summary when speedrunEnabled is true', () => {
    render(
      <GameBoard
        board={baseBoard}
        index={0}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess="HELLO"
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={false}
        onToggleSelect={() => {}}
        boardRef={null}
        speedrunEnabled={true}
      />
    );

    // No "0/6" text should be visible in speedrun mode
    expect(screen.queryByText('0/6')).toBeNull();
  });

  it('applies selection border and calls onToggleSelect on click (no green turn border)', () => {
    const onToggleSelect = vi.fn();

    const { container, rerender } = render(
      <GameBoard
        board={baseBoard}
        index={0}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess=""
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={true}
        onToggleSelect={onToggleSelect}
        boardRef={null}
        speedrunEnabled={false}
        isCurrentTurn={true}
      />
    );

    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveStyle({ border: '2px solid #B1A04C' });

    fireEvent.click(containerDiv);
    expect(onToggleSelect).toHaveBeenCalledTimes(1);

    // When not selected, there should be no special green border anymore
    rerender(
      <GameBoard
        board={baseBoard}
        index={0}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess=""
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={false}
        onToggleSelect={onToggleSelect}
        boardRef={null}
        speedrunEnabled={false}
        isCurrentTurn={true}
      />
    );

    expect(container.firstChild).toHaveStyle({ border: '1px solid #3a3a3c' });
  });

  it('renders the correct number of TileRow children based on guesses and maxTurns', () => {
    const board = {
      guesses: [
        { word: 'HELLO', colors: [] },
        { word: 'WORLD', colors: [] },
      ],
      isSolved: false,
      isDead: false,
    };

    render(
      <GameBoard
        board={board}
        index={0}
        numBoards={1}
        maxTurns={6}
        isUnlimited={false}
        currentGuess=""
        invalidCurrentGuess={false}
        revealId={0}
        isSelected={false}
        onToggleSelect={() => {}}
        boardRef={null}
        speedrunEnabled={false}
      />
    );

    // guesses = 2, rowsToShow = min(guessCount + 1, maxTurns) = 3
    expect(screen.getAllByTestId(/tile-row-/)).toHaveLength(3);
  });
});
