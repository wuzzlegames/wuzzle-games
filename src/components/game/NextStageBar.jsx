import React from "react";

export default function NextStageBar({ marathonNextBoards, onNextStage }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 190,
        right: 20,
        zIndex: 1200,
        padding: 0,
        background: "transparent",
        borderTop: "none"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={onNextStage}
          style={{
            marginLeft: "auto",
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#B1A04C",
            color: "#212121",
            fontWeight: "bold",
            cursor: "pointer",
            letterSpacing: 1,
            textTransform: "uppercase"
          }}
        >
          Next: {marathonNextBoards} boards
        </button>
      </div>
    </div>
  );
}
