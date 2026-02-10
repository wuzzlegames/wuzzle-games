import React from "react";
import Modal from "../Modal";

export default function MultiplayerRoomConfigModal({
  isOpen,
  onRequestClose,
  boardOptions,
  boardsDraft,
  onChangeBoardsDraft,
  speedrunDraft,
  onChangeSpeedrunDraft,
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
                border: "1px solid #3a3a3c",
                background: isHost ? "#1a1a1b" : "#121213",
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

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="checkbox"
              id="multiplayer-speedrun-config-checkbox"
              checked={speedrunDraft}
              onChange={(e) => onChangeSpeedrunDraft(e.target.checked)}
              disabled={!isHost}
              style={{ 
                cursor: isHost ? "pointer" : "not-allowed", 
                width: "18px", 
                height: "18px",
                opacity: isHost ? 1 : 0.6,
              }}
            />
            <label
              htmlFor="multiplayer-speedrun-config-checkbox"
              style={{ color: "#d7dadc", fontSize: 14, cursor: "pointer", margin: 0 }}
            >
              Speedrun Mode (Unlimited guesses, timed)
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              onClick={onRequestClose}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #3a3a3c",
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
                  background: "#6aaa64",
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
                  border: "1px solid #3a3a3c",
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
