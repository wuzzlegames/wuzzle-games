import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { CHALLENGE_EXPIRY_MS } from "../hooks/useNotificationSeen";
import Modal from "./Modal";
import UserCardWithBadges from "./UserCardWithBadges";

function isChallengeExpired(ch) {
  const createdAt = ch?.createdAt || 0;
  return createdAt + CHALLENGE_EXPIRY_MS < Date.now();
}

export default function ChallengesModal({ isOpen, onRequestClose }) {
  const navigate = useNavigate();
  const {
    sentChallenges,
    incomingChallenges,
    acceptChallenge,
    dismissChallenge,
    cancelSentChallenge,
  } = useAuth();

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div
        style={{
          padding: "24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: 20,
            fontWeight: "bold",
            color: "var(--c-text-strong)",
          }}
        >
          Challenges
        </h2>

        {(!sentChallenges || sentChallenges.length === 0) && (!incomingChallenges || incomingChallenges.length === 0) ? (
          <div
            style={{
              padding: "24px 8px 16px",
              color: "var(--c-text)",
              fontSize: 14,
            }}
          >
            You have no challenges right now.
          </div>
        ) : (
          <>
            {/* Sent challenges */}
            <h3
              style={{
                margin: "8px 0 8px",
                fontSize: 14,
                fontWeight: "bold",
                color: "var(--c-text)",
                textAlign: "left",
              }}
            >
              Sent
            </h3>
            {(!sentChallenges || sentChallenges.length === 0) ? (
              <div
                style={{
                  padding: "8px 0 12px",
                  color: "var(--c-text)",
                  fontSize: 12,
                }}
              >
                You haven't sent any challenges yet.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  marginBottom: "12px",
                }}
              >
                {sentChallenges.map((ch) => {
                  const expired = isChallengeExpired(ch);
                  return (
                    <div
                      key={ch.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--c-border)",
                        background: "var(--c-panel)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div style={{ textAlign: "left", flex: 1 }}>
                        <div style={{ marginBottom: 2 }}>
                          <UserCardWithBadges
                            userId={ch.toUserId}
                            username={ch.toUserName || ch.friendName || "Unknown friend"}
                            size="sm"
                          />
                        </div>
                        <div style={{ color: "var(--c-text)", fontSize: 12 }}>
                          {ch.boards || 1} board{(ch.boards || 1) > 1 ? "s" : ""} · {ch.speedrun ? "Speedrun" : "Standard"}
                          {expired && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--c-text)", fontWeight: "600" }}>Expired</span>
                          )}
                        </div>
                      </div>
                      {expired ? (
                        <button
                          onClick={async () => {
                            try {
                              await cancelSentChallenge(ch.gameCode || ch.id);
                            } catch (err) {
                              // eslint-disable-next-line no-alert
                              alert(err?.message || "Failed to dismiss challenge");
                            }
                          }}
                          className="homeBtn homeBtnOutline"
                          style={{
                            padding: "6px 10px",
                            fontSize: 11,
                            borderRadius: 6,
                            color: "var(--c-text)",
                          }}
                        >
                          Dismiss
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={async () => {
                              try {
                                await cancelSentChallenge(ch.gameCode || ch.id);
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(err?.message || "Failed to cancel challenge");
                              }
                            }}
                            className="homeBtn homeBtnOutline"
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Received challenges */}
            <h3
              style={{
                margin: "8px 0 8px",
                fontSize: 14,
                fontWeight: "bold",
                color: "var(--c-text)",
                textAlign: "left",
              }}
            >
              Received
            </h3>
            {(!incomingChallenges || incomingChallenges.length === 0) ? (
              <div
                style={{
                  padding: "8px 0 12px",
                  color: "var(--c-text)",
                  fontSize: 12,
                }}
              >
                You have no incoming challenges.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  marginBottom: "16px",
                }}
              >
                {incomingChallenges.map((ch) => {
                  const expired = isChallengeExpired(ch);
                  return (
                    <div
                      key={ch.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--c-border)",
                        background: "var(--c-panel)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div style={{ textAlign: "left", flex: 1 }}>
                        <div style={{ marginBottom: 2 }}>
                          <UserCardWithBadges
                            userId={ch.fromUserId}
                            username={ch.fromUserName || "Unknown"}
                            size="sm"
                          />
                        </div>
                        <div style={{ color: "var(--c-text)", fontSize: 12 }}>
                          {ch.boards || 1} board{(ch.boards || 1) > 1 ? "s" : ""} · {ch.variant === "solutionhunt" ? "Solution Hunt" : ch.variant === "speedrun" || ch.speedrun ? "Speedrun" : "Standard"}
                          {expired && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: "var(--c-text)", fontWeight: "600" }}>Expired</span>
                          )}
                        </div>
                      </div>
                      {!expired ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={async () => {
                              try {
                                const data = await acceptChallenge(ch.id);
                                onRequestClose();
                                const boards = data.boards || 1;
                                const variant = data.variant || (data.speedrun ? "speedrun" : "standard");
                                navigate(
                                  `/game?mode=multiplayer&code=${data.gameCode}&variant=${variant}&boards=${boards}`,
                                );
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(err?.message || "Failed to accept challenge");
                              }
                            }}
                            className="homeBtn homeBtnGreen"
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await dismissChallenge(ch.id, ch.gameCode);
                              } catch (err) {
                                // eslint-disable-next-line no-alert
                                alert(err?.message || "Failed to dismiss challenge");
                              }
                            }}
                            className="homeBtn homeBtnOutline"
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await dismissChallenge(ch.id, ch.gameCode);
                            } catch (err) {
                              // eslint-disable-next-line no-alert
                              alert(err?.message || "Failed to dismiss challenge");
                            }
                          }}
                          className="homeBtn homeBtnOutline"
                          style={{
                            padding: "6px 10px",
                            fontSize: 11,
                            borderRadius: 6,
                            color: "var(--c-text)",
                          }}
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <button
          onClick={onRequestClose}
          className="homeBtn homeBtnGreen homeBtnLg"
          style={{ marginTop: 4 }}
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
