import React from "react";

export default function GameStatusBar({
  numBoards,
  speedrunEnabled,
  isMarathonSpeedrun,
  formatElapsed,
  stageElapsedMs,
  displayTotalMs,
  turnsUsed,
  maxTurns,
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #3a3a3c",
        background: "#372F41",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* Left: boards count */}
      <div
        style={{
          fontSize: 12,
          color: "#d7dadc",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        Boards:{" "}
        <span style={{ fontWeight: "bold" }}>{numBoards}</span>
      </div>

      {/* Center: big timer for speedrun, guesses used for standard */}
      <div style={{ flex: 1, textAlign: "center" }}>
        {speedrunEnabled ? (
          <div
            style={{
              fontSize: 22,
              fontWeight: "bold",
              letterSpacing: 1,
              color: "#ffffff",
            }}
          >
            {isMarathonSpeedrun ? (
              <>
                {formatElapsed(stageElapsedMs || 0)}
                <span
                  style={{
                    display: "block",
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: "normal",
                    color: "#a1a1aa",
                  }}
                >
                  Total {formatElapsed(displayTotalMs || 0)}
                </span>
              </>
            ) : (
              <>{formatElapsed(stageElapsedMs || 0)}</>
            )}
          </div>
        ) : (
          <div
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            Guesses: {turnsUsed}/{maxTurns}
          </div>
        )}
      </div>

      {/* Right: guesses descriptor */}
      <div
        style={{
          fontSize: 12,
          color: "#d7dadc",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          textAlign: "right",
        }}
      >
        Guesses:{" "}
        <span style={{ fontWeight: "bold" }}>
          {speedrunEnabled ? "Unlimited" : maxTurns}
        </span>
      </div>
    </div>
  );
}
