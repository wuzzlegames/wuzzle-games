import React, { memo, useMemo } from "react";
import { getGreenPattern, WORD_LENGTH } from "../lib/wordle";

function Board({
  board,
  index,
  selected,
  onToggleSelect,
  currentGuess,
  invalidCurrentGuess,
  maxTurns,
  isUnlimited,
  collapse
}) {
  const safeGuesses = Array.isArray(board?.guesses) ? board.guesses : [];
  const greenPattern = useMemo(() => getGreenPattern(safeGuesses), [safeGuesses]);

  const guessCount = safeGuesses.length;

  const hasCurrentRow =
    !board.isSolved && (isUnlimited || !board.isDead) && currentGuess != null;

  // Full mode: show up to maxTurns rows (like original).
  // Collapsed mode (many boards): show only last guess + current row (if applicable).
  const rowIndices = useMemo(() => {
    if (!collapse) {
      const rowsToShow = Math.min(guessCount + 1, Math.max(maxTurns || 0, guessCount + 1));
      return Array.from({ length: rowsToShow }, (_, i) => i);
    }

    const indices = [];
    if (guessCount > 0) indices.push(guessCount - 1); // last submitted row
    if (hasCurrentRow) indices.push(guessCount); // active row
    if (indices.length === 0) indices.push(0); // empty board state
    return indices;
  }, [collapse, guessCount, maxTurns, hasCurrentRow]);

  return (
    <div
      className={`boardCard ${selected ? "boardCardSelected" : ""}`}
      onClick={onToggleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onToggleSelect();
      }}
      aria-label={`Board ${index + 1}${selected ? ", focused" : ""}`}
    >
      <div className="boardHeader">
        <span>
          Board {index + 1}
          {selected ? " (focused)" : ""}
        </span>
        <span>
          {board.isSolved
            ? "Solved"
            : !isUnlimited && board.isDead
            ? "Failed"
            : `${guessCount}/${maxTurns}`}
        </span>
      </div>

      {rowIndices.map((rowIdx) => {
        const row = safeGuesses[rowIdx];

        const isCurrentRow =
          !row &&
          hasCurrentRow &&
          rowIdx === safeGuesses.length;

        const isInvalidRow = isCurrentRow && invalidCurrentGuess;

        return (
          <div className="boardRow" key={rowIdx}>
            {Array.from({ length: WORD_LENGTH }).map((_, colIdx) => {
              const typedChar = isCurrentRow ? currentGuess[colIdx] || "" : "";

              const displayChar = row
                ? row.word[colIdx]
                : typedChar
                ? typedChar
                : isCurrentRow
                ? greenPattern[colIdx] || ""
                : "";

              const isPlaceholder =
                !row && isCurrentRow && !typedChar && !!greenPattern[colIdx];

              const color = row ? row.colors[colIdx] : undefined;

              let bg = "var(--c-bg)";
              if (color === "green") bg = "var(--c-correct)";
              else if (color === "yellow") bg = "var(--c-present)";
              else if (color === "grey") bg = "var(--c-absent)";

              let borderColor = row ? "transparent" : isCurrentRow ? "var(--c-border-strong)" : "var(--c-border)";

              if (isInvalidRow) {
                borderColor = "var(--c-error)";
                bg = "var(--c-panel)";
              }

              return (
                <div
                  key={colIdx}
                  className="cell"
                  style={{
                    backgroundColor: bg,
                    borderColor,
                    color: isInvalidRow ? "var(--c-error)" : "var(--c-bg)",
                    opacity: isPlaceholder ? 0.65 : 1,
                  }}
                >
                  {displayChar}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default memo(Board);
