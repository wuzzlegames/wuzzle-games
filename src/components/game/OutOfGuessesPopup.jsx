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
        backgroundColor: "var(--c-bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2100
      }}
    >
      <div
        style={{
          backgroundColor: "var(--c-panel)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 520,
          width: "92vw",
          textAlign: "center",
          boxShadow: "0 20px 60px var(--c-bg)"
        }}
      >
        <h2 style={{ margin: 0, marginBottom: 10, fontSize: 20, fontWeight: "bold" }}>
          All guesses used
        </h2>

        <div style={{ marginBottom: 16, fontSize: 14, color: "var(--c-text)", lineHeight: 1.4 }}>
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
              border: "1px solid var(--c-border)",
              background: "transparent",
              color: "var(--c-text-strong)",
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
              background: "var(--c-present)",
              color: "var(--c-text)",
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
                background: "var(--c-accent-1)",
                color: "var(--c-text-strong)",
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
