import React from "react";
import Modal from "../Modal";

export default function MultiplayerRoomConfigModal({
  isOpen,
  onRequestClose,
  boardOptions,
  boardsDraft,
  onChangeBoardsDraft,
  variantDraft,
  onChangeVariantDraft,
  onSave,
  isHost = true,
}) {
  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div style={{ padding: "24px" }}>
        <h2
          style={{
            margin: 0,
            marginBottom: "24px",
            fontSize: 20,
            fontWeight: "bold",
            color: "#ffffff",
          }}
        >
          {isHost ? "Multiplayer Room Configuration" : "Next Game Configuration"}
        </h2>
        {!isHost && (
          <p style={{ margin: 0, marginBottom: "16px", fontSize: 14, color: "#818384" }}>
            View the configuration for the next rematch. Only the host can change these settings.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              htmlFor="multiplayer-boards-select"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#d7dadc",
                fontSize: 14,
              }}
            >
              Number of Boards
            </label>
            <select
              id="multiplayer-boards-select"
              value={boardsDraft}
              onChange={(e) => onChangeBoardsDraft(parseInt(e.target.value, 10))}
              disabled={!isHost}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #3A3A3C",
                background: isHost ? "#372F41" : "#212121",
                color: isHost ? "#ffffff" : "#818384",
                fontSize: 14,
                cursor: isHost ? "pointer" : "not-allowed",
                opacity: isHost ? 1 : 0.6,
              }}
            >
              {boardOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="multiplayer-variant-config-select"
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#d7dadc",
                fontSize: 14,
              }}
            >
              Game Variant
            </label>
            <select
              id="multiplayer-variant-config-select"
              value={variantDraft}
              onChange={(e) => onChangeVariantDraft(e.target.value)}
              disabled={!isHost}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #3A3A3C",
                background: isHost ? "#372F41" : "#212121",
                color: isHost ? "#ffffff" : "#818384",
                fontSize: 14,
                cursor: isHost ? "pointer" : "not-allowed",
                opacity: isHost ? 1 : 0.6,
              }}
            >
              <option value="standard">Standard (6 guesses)</option>
              <option value="speedrun">Speedrun (Unlimited guesses, timed)</option>
              <option value="solutionhunt">Solution Hunt (See possible words)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              onClick={onRequestClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #3A3A3C",
                background: "transparent",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            {isHost ? (
              <button
                onClick={onSave}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#e56b6f",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Save for Rematch
              </button>
            ) : (
              <div
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid #3A3A3C",
                  background: "transparent",
                  color: "#818384",
                  fontSize: 14,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                View Only
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
