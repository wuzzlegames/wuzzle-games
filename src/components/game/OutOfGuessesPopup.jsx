import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSubscription } from "../../hooks/useSubscription";
import SubscribeModal from "../SubscribeModal";

export default function OutOfGuessesPopup({
  maxTurns,
  mode,
  marathonHasNext,
  onExit,
  onContinue,
  onNextStage,
  freezeStageTimer,
  setShowOutOfGuesses,
  setShowPopup
}) {
  const { user } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);

  const handleNextStage = () => {
    freezeStageTimer();
    setShowOutOfGuesses(false);
    setShowPopup(false);
    onNextStage();
  };

  const handleOpenSubscribe = () => {
    setShowSubscribeModal(true);
  };

  const handleCloseSubscribe = () => {
    setShowSubscribeModal(false);
  };

  const handleSubscriptionComplete = () => {
    setShowSubscribeModal(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2100
      }}
    >
      <div
        style={{
          backgroundColor: "#372F41",
          borderRadius: 16,
          padding: 24,
          maxWidth: 520,
          width: "92vw",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)"
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 10, fontSize: 20, fontWeight: "bold" }}>
          All guesses used
        </h2>

        <div style={{ marginBottom: 16, fontSize: 14, color: "#d7dadc", lineHeight: 1.4 }}>
          You reached the max turns ({maxTurns}). Do you want to end the game, continue with unlimited guesses?
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={onExit}
            style={{
              flex: 1,
              minWidth: 160,
              padding: "12px 0",
              borderRadius: 10,
              border: "1px solid #3A3A3C",
              background: "transparent",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase"
            }}
          >
            End Game
          </button>

          <button
            onClick={onContinue}
            style={{
              flex: 1,
              minWidth: 160,
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: "#B1A04C",
              color: "#212121",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase"
            }}
          >
            Continue
          </button>

          {user && showSubscriptionGate && (
            <button
              onClick={handleOpenSubscribe}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "12px 0",
                borderRadius: 10,
                border: "none",
                background: "#e56b6f",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                letterSpacing: 1,
                textTransform: "uppercase"
              }}
            >
              Subscribe
            </button>
          )}
        </div>
      </div>

      <SubscribeModal
        isOpen={showSubscribeModal}
        onRequestClose={handleCloseSubscribe}
        onSubscriptionComplete={handleSubscriptionComplete}
      />
    </div>
  );
}
