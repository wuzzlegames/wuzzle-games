import React from "react";

export default function BoardSelector({
  numBoards,
  showBoardSelector,
  setShowBoardSelector,
  boards,
  selectedBoardIndex,
  setSelectedBoardIndex,
  boardRefs,
  isUnlimited,
  speedrunEnabled,
  statusText,
  turnsUsed,
  maxTurns
}) {
  if (numBoards <= 1) return null;

  const guessesLabel =
    Number.isFinite(turnsUsed) && Number.isFinite(maxTurns)
      ? `Guesses used: ${turnsUsed}/${maxTurns}`
      : null;

  return (
    <>
      {/* Floating board selector button - bottom left */}
      <button
        onClick={() => setShowBoardSelector(!showBoardSelector)}
        style={{
          position: "fixed",
          bottom: 190 + 20,
          left: 20,
          padding: "8px 12px",
          borderRadius: 6,
          backgroundColor: "var(--c-bg)",
          border: "1px solid var(--c-text-strong)",
          color: "var(--c-text-strong)",
          fontSize: 11,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px var(--c-bg)",
          transition: "all 0.3s ease",
          outline: "none",
          whiteSpace: "normal",
          textAlign: "center"
        }}
        aria-label={showBoardSelector ? "Close board selection" : "Open board selection"}
      >
        {showBoardSelector ? (
          "Close"
        ) : (
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            {guessesLabel && <span>{guessesLabel}</span>}
            <span>Select a board</span>
          </span>
        )}
      </button>

      {/* Board selector popup */}
      {showBoardSelector && (
        <div
          style={{
            position: "fixed",
            bottom: 190 + 90,
            left: 20,
            backgroundColor: "var(--c-panel)",
            borderRadius: 12,
            padding: "16px",
            boxShadow: "0 4px 20px var(--c-bg)",
            zIndex: 9998,
            border: "1px solid var(--c-border)",
            maxWidth: "90vw",
            minWidth: 200
          }}
        >
          <div className="flexColumn flexGap12">
            {/* Status text (only show if not speedrun mode) */}
            {!speedrunEnabled && statusText && (
              <div style={{ fontSize: 14, color: "var(--c-text)", fontWeight: "bold", marginBottom: 4 }}>
                {statusText}
              </div>
            )}
            
            {/* Board number buttons */}
            <div className="flexRow flexGap6 flexWrap itemsCenter">
              {boards.map((board, index) => {
                const isSelected = selectedBoardIndex === index;
                const isSolved = board.isSolved;
                const isDead = !isUnlimited && board.isDead;
                
                return (
                  <button
                    key={board.solution ?? `board-${index}`}
                    onClick={() => {
                      setSelectedBoardIndex(index);
                      setShowBoardSelector(false);
                      const boardElement = boardRefs.current[index];
                      if (boardElement) {
                        boardElement.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      border: isSelected ? "2px solid var(--c-present)" : "1px solid var(--c-border)",
                      background: isSolved
                        ? "var(--c-correct)"
                        : isDead
                        ? "var(--c-border)"
                        : isSelected
                        ? "var(--c-panel)"
                        : "transparent",
                      color: isSolved || isDead ? "var(--c-text-strong)" : "var(--c-text-strong)",
                      fontSize: 13,
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      minWidth: 40,
                      textAlign: "center"
                    }}
                  >
                    B{index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
