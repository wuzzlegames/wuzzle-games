import React from "react";

export default function GameToast({ message }) {
  if (!message) return null;

  const text = typeof message === "string" ? message : String(message);
  const lower = text.toLowerCase();

  const isError = /not in word list|failed|error|must |not your turn|cannot|can't/i.test(lower);

  const baseStyles = {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 20px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: "bold",
    boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
    zIndex: 3000,
    pointerEvents: "none",
    maxWidth: "90vw",
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backdropFilter: "blur(6px)",
  };

  const toneStyles = isError
    ? {
        backgroundColor: "#2b0004",
        color: "#ff6b6b",
        border: "1px solid #ff6b6b",
      }
    : {
        backgroundColor: "rgba(24,24,27,0.96)",
        color: "#e5e7eb",
        border: "1px solid #4b5563",
      };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...baseStyles,
        ...toneStyles,
      }}
    >
      {isError && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: "999px",
            border: "1px solid currentColor",
            fontSize: 11,
          }}
        >
          !
        </span>
      )}
      <span>{message}</span>
    </div>
  );
}
