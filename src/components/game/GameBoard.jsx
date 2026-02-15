import React, { memo } from "react";
import TileRow from "./TileRow";

function GameBoard({
  board,
  index,
  numBoards,
  maxTurns,
  isUnlimited,
  currentGuess,
  invalidCurrentGuess,
  revealId,
  isSelected,
  onToggleSelect,
  boardRef,
  speedrunEnabled,
  // Optional: highlight this board when it's the active turn (multiplayer mode)
  isCurrentTurn = false,
}) {
  const safeGuesses = Array.isArray(board?.guesses) ? board.guesses : [];
  const guessCount = safeGuesses.length;

  // No extra empty row after solved
  const rowsToShow = board.isSolved
    ? guessCount
    : Math.min(guessCount + 1, Math.max(maxTurns || 0, guessCount + 1));

  // Only animate the last committed guess row (the one just added)
  const lastGuessRowIndex = safeGuesses.length - 1;

  return (
    <div
      ref={boardRef}
      onClick={onToggleSelect}
      style={{
        borderRadius: 8,
        border: isSelected
          ? "2px solid #B1A04C"
          : "1px solid #3A3A3C",
        padding: 8,
        background: "#372F41",
        cursor: "pointer",
        // When selected, use a yellow glow and do not stack a separate green effect
        boxShadow: isSelected ? "0 0 0 1px rgba(250,204,21,0.53)" : "none",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          fontSize: 12,
          color: "#d7dadc"
        }}
      >
        <span>
          Board {index + 1} {isSelected ? "· focused" : ""}
        </span>
        {!speedrunEnabled && (
          <span>
            {board.isSolved
              ? "Solved"
              : !isUnlimited && board.isDead
              ? "Failed"
              : `${guessCount}/${maxTurns}`}
          </span>
        )}
      </div>

      {Array.from({ length: rowsToShow }).map((_, rowIdx) => {
        const row = safeGuesses[rowIdx];
        const isJustRevealedRow = !!row && rowIdx === lastGuessRowIndex;

        return (
          <TileRow
            key={rowIdx}
            board={board}
            rowIdx={rowIdx}
            currentGuess={currentGuess}
            invalidCurrentGuess={invalidCurrentGuess}
            numBoards={numBoards}
            maxTurns={maxTurns}
            isUnlimited={isUnlimited}
            revealId={revealId}
            isJustRevealedRow={isJustRevealedRow}
          />
        );
      })}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent re-renders but board props haven't changed
export default memo(GameBoard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.board === nextProps.board &&
    prevProps.index === nextProps.index &&
    prevProps.numBoards === nextProps.numBoards &&
    prevProps.maxTurns === nextProps.maxTurns &&
    prevProps.isUnlimited === nextProps.isUnlimited &&
    prevProps.currentGuess === nextProps.currentGuess &&
    prevProps.invalidCurrentGuess === nextProps.invalidCurrentGuess &&
    prevProps.revealId === nextProps.revealId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.speedrunEnabled === nextProps.speedrunEnabled &&
    prevProps.isCurrentTurn === nextProps.isCurrentTurn
    // Note: onToggleSelect and boardRef are functions, so we skip them in comparison
    // They should be stable callbacks from the parent
  );
});
