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
  statusText
}) {
  if (numBoards <= 1) return null;

  return (
    <>
      {/* Floating board selector button - bottom left */}
      <button
        onClick={() => setShowBoardSelector(!showBoardSelector)}
        style={{
          position: "fixed",
          bottom: 190 + 20,
          left: 20,
          padding: "6px 12px",
          borderRadius: 6,
          backgroundColor: "#212121",
          border: "1px solid #ffffff",
          color: "#ffffff",
          fontSize: 11,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.7)",
          transition: "all 0.3s ease",
          outline: "none",
          whiteSpace: "nowrap"
        }}
        aria-label={showBoardSelector ? "Close board selection" : "Open board selection"}
      >
        {showBoardSelector ? "Close" : "Board Selection"}
      </button>

      {/* Board selector popup */}
      {showBoardSelector && (
        <div
          style={{
            position: "fixed",
            bottom: 190 + 90,
            left: 20,
            backgroundColor: "#372F41",
            borderRadius: 12,
            padding: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.8)",
            zIndex: 9998,
            border: "1px solid #3A3A3C",
            maxWidth: "90vw",
            minWidth: 200
          }}
        >
          <div className="flexColumn flexGap12">
            {/* Status text (only show if not speedrun mode) */}
            {!speedrunEnabled && statusText && (
              <div style={{ fontSize: 14, color: "#d7dadc", fontWeight: "bold", marginBottom: 4 }}>
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
                    key={index}
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
                      border: isSelected ? "2px solid #B1A04C" : "1px solid #3A3A3C",
                      background: isSolved
                        ? "#50a339"
                        : isDead
                        ? "#3A3A3C"
                        : isSelected
                        ? "#372F41"
                        : "transparent",
                      color: isSolved || isDead ? "#ffffff" : "#ffffff",
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
