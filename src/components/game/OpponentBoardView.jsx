import React from "react";

export default function OpponentBoardView({ opponentColors, maxTurns, opponentGuesses, solution, playerSolved, isActive = false, hideLetters = false, boardNumber = 1, isSpeedrun = false }) {
  const numGuesses = opponentColors ? opponentColors.length : 0;
  const rowsToShow = Math.min(numGuesses + 1, Math.max(maxTurns, numGuesses + 1));
  
  // Match tile sizing from TileRow component (for 1 board, tileSize = 32, tileMargin = 2)
  const tileSize = 32;
  const tileMargin = 2;
  const rowWidth = 5 * (tileSize + tileMargin * 2);
  
  // Check if opponent solved or failed
  const isSolved = opponentGuesses && solution && opponentGuesses.includes(solution);
  const isFailed = !isSolved && numGuesses >= maxTurns;
  
  // Show letters if player has solved their word AND we're not explicitly hiding them
  const showLetters = (playerSolved || false) && !hideLetters;

  return (
    <div
      style={{
        borderRadius: 8,
        border: isActive ? "2px solid #50a339" : "1px solid #3A3A3C",
        padding: 8,
        background: "#372F41",
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
        <span>{`Board ${boardNumber}`}</span>
        {!isSpeedrun && (
          <span>
            {isSolved
              ? "Solved"
              : isFailed
              ? "Failed"
              : `${numGuesses}/${maxTurns}`}
          </span>
        )}
      </div>
      {Array.from({ length: rowsToShow }).map((_, rowIdx) => {
        const colors = opponentColors && opponentColors[rowIdx] ? opponentColors[rowIdx] : [];
        
        return (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 4,
              minHeight: `${tileSize + 4}px`,
              flexShrink: 0,
              height: `${tileSize + 4}px`,
              width: "100%",
              maxWidth: `${rowWidth}px`,
              marginLeft: "auto",
              marginRight: "auto"
            }}
          >
            {Array.from({ length: 5 }).map((_, colIdx) => {
              const color = Array.isArray(colors) ? (colors[colIdx] || 0) : 0;
              // 0 = gray (not in word), 1 = yellow (wrong position), 2 = green (correct)
              const bgColor = color === 2 ? "#50a339" : color === 1 ? "#B1A04C" : "#3A3A3C";
              const borderColor = color === 0 ? "#3A3A3C" : color === 2 ? "#50a339" : "#B1A04C";
              const letter = showLetters && opponentGuesses && opponentGuesses[rowIdx] 
                ? opponentGuesses[rowIdx][colIdx]?.toUpperCase() || "" 
                : "";
              
              return (
                <div
                  key={colIdx}
                  style={{
                    width: tileSize,
                    height: tileSize,
                    margin: tileMargin,
                    background: bgColor,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxSizing: "border-box"
                  }}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
