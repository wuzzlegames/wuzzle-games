import React from "react";
import { WORD_LENGTH, getGreenPattern } from "../../lib/wordle";
import { bgForColor } from "../../lib/gameUtils";
import { FLIP_DELAY_PER_TILE } from "../../lib/gameConstants";

export default function TileRow({
  board,
  rowIdx,
  currentGuess,
  invalidCurrentGuess,
  numBoards,
  maxTurns,
  isUnlimited,
  revealId,
  isJustRevealedRow
}) {
  const safeGuesses = Array.isArray(board?.guesses) ? board.guesses : [];
  const row = safeGuesses[rowIdx];
  const guessCount = safeGuesses.length;

  const isCurrentRow =
    !row &&
    !board.isSolved &&
    (isUnlimited || !board.isDead) &&
    rowIdx === safeGuesses.length;

  const isInvalidRow = isCurrentRow && invalidCurrentGuess;

  const greenPattern = getGreenPattern(safeGuesses);

  // Tile sizing: keep consistent across devices (no viewport-based scaling).
  const tileSize = numBoards >= 16 ? 28 : 32;
  const tileGap = numBoards >= 16 ? 3 : 4;
  const tileFontSize = numBoards >= 16 ? 16 : 18;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: tileGap,
        marginBottom: 4,
        minHeight: `${tileSize + 4}px`,
        flexShrink: 0,
        height: `${tileSize + 4}px`,
        width: "100%",
      }}
    >
      {Array.from({ length: WORD_LENGTH }).map((__, colIdx) => {
        const typedChar = isCurrentRow ? currentGuess[colIdx] : "";

        const displayChar = row
          ? row.word[colIdx]
          : typedChar
          ? typedChar
          : isCurrentRow
          ? greenPattern[colIdx]
          : "";

        const isPlaceholder =
          !row && isCurrentRow && !typedChar && !!greenPattern[colIdx];

        const color = row ? row.colors[colIdx] : undefined;

        // Input/current row (no flip, no reveal coloring)
        if (!row) {
          let bg = "var(--c-bg)";
          let borderColor = isCurrentRow ? "var(--c-border-strong)" : "var(--c-border)";
          let fg = "var(--c-text-strong)";
          let opacity = isPlaceholder ? 0.65 : 1;

          if (isInvalidRow) {
            borderColor = "var(--c-error)";
            bg = "var(--c-panel)";
            fg = "var(--c-text)";
            opacity = 1;
          }

          return (
            <div
              key={colIdx}
              style={{
                width: tileSize,
                height: tileSize,
                borderRadius: 4,
                border: `2px solid ${borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: tileFontSize,
                backgroundColor: bg,
                textTransform: "uppercase",
                color: fg,
                opacity,
                flexShrink: 0,
                boxSizing: "border-box"
              }}
            >
              {displayChar}
            </div>
          );
        }

        // Revealed rows:
        // We only animate the newest revealed row *for the board update that just happened*.
        // To avoid already-solved boards re-flipping when OTHER boards finish, we track
        // the lastRevealId stored on the board and compare it to the global revealId.
        const shouldFlipThisRow =
          isJustRevealedRow &&
          board.lastRevealId != null &&
          board.lastRevealId === revealId;

        if (!shouldFlipThisRow) {
          const bg = bgForColor(color);
          return (
            <div
              key={colIdx}
              style={{
                width: tileSize,
                height: tileSize,
                borderRadius: 4,
                border: "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: tileFontSize,
                backgroundColor: bg,
                textTransform: "uppercase",
                color: "var(--c-text)",
                flexShrink: 0,
                boxSizing: "border-box"
              }}
            >
              {displayChar}
            </div>
          );
        }

        // Newest revealed row: flip only for active (unsolved) boards
        const frontBg = "var(--c-bg)";
        const frontBorder = "var(--c-border)";
        const backBg = bgForColor(color);

        // Tiles flip sequentially with a delay per tile
        const delayMs = colIdx * FLIP_DELAY_PER_TILE;

        return (
          <div
            key={colIdx}
            className="mw-tile"
            style={{
              width: tileSize,
              height: tileSize,
            }}
          >
            <div
              key={`${revealId}-${rowIdx}-${colIdx}`}
              className="mw-card mw-flip"
              style={{ animationDelay: `${delayMs}ms` }}
            >
              <div
                className="mw-face mw-front"
                style={{
                  backgroundColor: frontBg,
                  border: `2px solid ${frontBorder}`,
                  color: "var(--c-text-strong)",
                  fontSize: tileFontSize
                }}
              >
                {displayChar}
              </div>

              <div
                className="mw-face mw-back"
                style={{
                  backgroundColor: backBg,
                  border: "2px solid transparent",
                  color: "var(--c-text)",
                  fontSize: tileFontSize
                }}
              >
                {displayChar}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
