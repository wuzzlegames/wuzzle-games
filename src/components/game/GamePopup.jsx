import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSolutionArray } from "../../lib/multiplayerConfig";
import { useAuth } from "../../hooks/useAuth";
import { useSubscription } from "../../hooks/useSubscription";
import UserCardWithBadges from "../UserCardWithBadges";
import SubscribeModal from "../SubscribeModal";

export default function GamePopup({
  allSolved,
  boards,
  speedrunEnabled,
  stageElapsedMs,
  popupTotalMs,
  formatElapsed,
  solvedCount,
  mode,
  marathonHasNext,
  turnsUsed,
  maxTurns,
  onShare,
  onClose,
  onNextStage,
  freezeStageTimer,
  isMarathonSpeedrun,
  commitStageIfNeeded,
  isMultiplayer,
  multiplayerGameState,
  winner,
  isPlayerHost,
  onRematch,
  onChangeMode,
  myScore,
  opponentScore,
  canShare = true,
  allowNextStageAfterPopup = true,
  hasCommentsSection = false,
  streakLabel,
  currentUserId,
  onAddFriend,
  friendRequestSent,
  friendIds,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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

  const handleNextStage = () => {
    const finalStageMs = freezeStageTimer();
    if (isMarathonSpeedrun) commitStageIfNeeded(finalStageMs);
    onClose();
    onNextStage();
  };

  // In daily and marathon modes (including speedrun variants), once the player
  // has solved all boards we show a more descriptive label on the close button
  // to highlight that comments are available below the board.
  const showPostCommentCta =
    !isMultiplayer &&
    (allSolved || hasCommentsSection) &&
    (mode === "daily" || mode === "marathon");

  return (
    <div
      onClick={handleBackdropClick}
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
        zIndex: 2000
      }}
      >
      <div
        style={{
          backgroundColor: "#372F41",
          borderRadius: 16,
          padding: 24,
          maxWidth: 560,
          width: "92vw",
          maxHeight: "80vh",
          overflowY: "auto",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)"
        }}
      >
        {isMultiplayer ? (() => {
          const isSpeedrun = multiplayerGameState?.speedrun || false;
          const hasExplicitScores =
            typeof myScore === "number" || typeof opponentScore === "number";

          // Build a rankings table for all players in the room.
          const playersFromState =
            multiplayerGameState && multiplayerGameState.players &&
            typeof multiplayerGameState.players === "object"
              ? Object.values(multiplayerGameState.players).filter(Boolean)
              : null;

          const solutionList = getSolutionArray(multiplayerGameState);

          const makePlayerStats = (id, name, guesses, timeMs) => {
            const safeGuesses = Array.isArray(guesses) ? guesses : [];
            const guessCount = safeGuesses.length;

            // Per-player timeMs from the players map
            const effectiveTimeMs = typeof timeMs === "number" ? timeMs : null;

            let solvedAll = false;
            if (solutionList.length > 0) {
              const lowerGuesses = safeGuesses.map((g) =>
                typeof g === "string" ? g.toLowerCase() : "",
              );
              solvedAll = solutionList.every((sol) => {
                const solLower = typeof sol === "string" ? sol.toLowerCase() : "";
                return lowerGuesses.includes(solLower);
              });
            }

            return {
              id: id || null,
              name: name || "Player",
              guessCount,
              timeMs: effectiveTimeMs,
              solvedAll,
            };
          };

          const players = [];

          if (playersFromState && playersFromState.length > 0) {
            playersFromState.forEach((p) => {
              const id = p.id || null;
              const name = p.name || "Player";
              const guesses = p.guesses || [];
              const timeMs = p.timeMs;
              players.push(makePlayerStats(id, name, guesses, timeMs));
            });
          }

          const metricForPlayer = (p) => {
            if (isSpeedrun) {
              return typeof p.timeMs === "number" ? p.timeMs : Number.POSITIVE_INFINITY;
            }
            return p.guessCount;
          };

          const rankedPlayers = (() => {
            if (!players.length) return [];
            const sorted = [...players].sort((a, b) => {
              const ma = metricForPlayer(a);
              const mb = metricForPlayer(b);
              if (ma !== mb) return ma - mb;
              return (a.name || "").localeCompare(b.name || "");
            });
            const withRanks = [];
            sorted.forEach((p, index) => {
              if (index === 0) {
                withRanks.push({ ...p, rank: 1 });
              } else {
                const prev = withRanks[index - 1];
                const sameMetric = metricForPlayer(p) === metricForPlayer(prev);
                withRanks.push({
                  ...p,
                  rank: sameMetric ? prev.rank : index + 1,
                });
              }
            });
            return withRanks;
          })();

          const toOrdinal = (n) => {
            const v = n % 100;
            if (v >= 11 && v <= 13) return `${n}th`;
            switch (n % 10) {
              case 1:
                return `${n}st`;
              case 2:
                return `${n}nd`;
              case 3:
                return `${n}rd`;
              default:
                return `${n}th`;
            }
          };

          let headingText = "Game finished";
          let titleColor = "#B1A04C";

          if (rankedPlayers.length) {
            const findMe = () => {
              if (currentUserId) {
                const byId = rankedPlayers.find((p) => p.id === currentUserId);
                if (byId) return byId;
              }
              return null;
            };

            const me = findMe();
            if (me) {
              const sameRankCount = rankedPlayers.filter((p) => p.rank === me.rank).length;
              const ordinal = toOrdinal(me.rank);
              if (sameRankCount > 1) {
                headingText = `You are tied for ${ordinal} place`;
              } else {
                headingText = `You finished ${ordinal}`;
              }
              titleColor = me.rank === 1 ? "#50a339" : "#B1A04C";
            }
          }

          return (
          <>
            <h2
              style={{
                margin: 0,
                marginBottom: 20,
                fontSize: 24,
                fontWeight: "bold",
                letterSpacing: 1,
                color: titleColor
              }}
            >
              {headingText}
            </h2>

            <div style={{ marginBottom: 20, fontSize: 18, color: "#d7dadc" }}>
              {/* Rematch status text for multiplayer */}
              {isMultiplayer && multiplayerGameState?.status === 'finished' && (
                <div style={{
                  marginBottom: 12,
                  fontSize: 14,
                  color: "#B1A04C",
                }}>
                  {(() => {
                    const players = multiplayerGameState?.players;
                    let myRematch = false;
                    let allPlayersRematched = false;
                    let somePlayersRematched = false;
                    
                    if (players && typeof players === 'object' && currentUserId) {
                      const playerEntries = Object.values(players).filter(Boolean);
                      const myPlayer = players[currentUserId];
                      myRematch = !!myPlayer?.rematch;
                      allPlayersRematched = playerEntries.length > 0 && playerEntries.every((p) => !!p.rematch);
                      somePlayersRematched = playerEntries.some((p) => !!p.rematch);
                    }
                    
                    if (allPlayersRematched) return "Starting rematch...";
                    if (myRematch && !allPlayersRematched) return "Waiting for other players to accept rematch...";
                    if (!myRematch && somePlayersRematched) return "Other players want a rematch";
                    return null;
                  })()}
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 16, color: "#818384", marginBottom: 4 }}>
                  {isSpeedrun
                    ? "Your Time"
                    : hasExplicitScores
                    ? "Your Score"
                    : "Your Guesses"}
                </div>
                <div style={{ fontSize: 24, color: "#ffffff", fontWeight: "bold" }}>
                  {(() => {
                    if (isSpeedrun) {
                      if (!multiplayerGameState) return "N/A";
                      let myTimeMs = null;
                      if (currentUserId && multiplayerGameState.players && multiplayerGameState.players[currentUserId]) {
                        myTimeMs = multiplayerGameState.players[currentUserId].timeMs ?? null;
                      }
                      return myTimeMs != null ? formatElapsed(myTimeMs) : "N/A";
                    }

                    if (typeof myScore === "number") return myScore;

                    if (!multiplayerGameState) return "N/A";
                    // Check players map first for multiplayer rooms
                    let myGuesses = [];
                    if (currentUserId && multiplayerGameState.players && multiplayerGameState.players[currentUserId]) {
                      myGuesses = multiplayerGameState.players[currentUserId].guesses || [];
                    }
                    // Fallback to legacy host/guest structure
                    if (myGuesses.length === 0) {
                      myGuesses = isPlayerHost
                        ? multiplayerGameState.hostGuesses || []
                        : multiplayerGameState.guestGuesses || [];
                    }
                    return myGuesses.length;
                  })()}
                </div>
              </div>
              <div style={{ borderTop: "1px solid #3A3A3C", paddingTop: 12 }}>
                <div style={{ fontSize: 16, color: "#818384", marginBottom: 4 }}>
                  {isSpeedrun
                    ? "Opponent's Time"
                    : hasExplicitScores
                    ? "Opponent's Score"
                    : "Opponent's Guesses"}
                </div>
                <div style={{ fontSize: 24, color: "#ffffff", fontWeight: "bold" }}>
                  {(() => {
                    if (isSpeedrun) {
                      if (!multiplayerGameState) return "N/A";
                      let opponentTimeMs = null;
                      if (multiplayerGameState.players && typeof multiplayerGameState.players === "object") {
                        const opponent = Object.values(multiplayerGameState.players).find(
                          (p) => p.id && p.id !== currentUserId
                        );
                        if (opponent) {
                          opponentTimeMs = opponent.timeMs ?? null;
                        }
                      }
                      return opponentTimeMs != null ? formatElapsed(opponentTimeMs) : "N/A";
                    }

                    if (typeof opponentScore === "number") return opponentScore;

                    if (!multiplayerGameState) return "N/A";
                    // For multiplayer, find the first opponent's guesses
                    let opponentGuesses = [];
                    if (multiplayerGameState.players && typeof multiplayerGameState.players === "object") {
                      const opponent = Object.values(multiplayerGameState.players).find(
                        (p) => p.id && p.id !== currentUserId
                      );
                      if (opponent) {
                        opponentGuesses = opponent.guesses || [];
                      }
                    }
                    // Fallback to legacy host/guest structure
                    if (opponentGuesses.length === 0) {
                      opponentGuesses = isPlayerHost
                        ? multiplayerGameState.guestGuesses || []
                        : multiplayerGameState.hostGuesses || [];
                    }
                    return opponentGuesses.length;
                  })()}
                </div>
              </div>

              {rankedPlayers.length > 0 && (
                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 12,
                    borderTop: "1px solid #3A3A3C",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: "bold",
                      color: "#d7dadc",
                      marginBottom: 8,
                    }}
                  >
                    Room rankings
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontSize: 13,
                    }}
                  >
                    {rankedPlayers.map((p) => {
                      const isMe = currentUserId && p.id === currentUserId;

                      const primaryStat = isSpeedrun
                        ? p.timeMs != null
                          ? formatElapsed(p.timeMs)
                          : "—"
                        : `${p.guessCount} guess${p.guessCount === 1 ? "" : "es"}`;

                      const secondary = solutionList.length
                        ? p.solvedAll
                          ? "Solved all boards"
                          : "Not finished"
                        : null;

                      return (
                        <div
                          key={p.id || p.name}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "4px 6px",
                            borderRadius: 4,
                            backgroundColor: isMe ? "#6d597a" : "transparent",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                minWidth: 36,
                                fontWeight: "bold",
                                color: "#d7dadc",
                              }}
                            >
                              {toOrdinal(p.rank)}
                            </div>
                            <UserCardWithBadges
                              userId={p.id}
                              username={p.name || "Player"}
                              isYou={isMe}
                              size="sm"
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ textAlign: "right", color: "#d7dadc" }}>
                              <div>{primaryStat}</div>
                              {secondary && (
                                <div style={{ fontSize: 11, color: "#9ca3af" }}>{secondary}</div>
                              )}
                            </div>
                            {!isMe && onAddFriend && !friendIds?.includes(p.id) && (() => {
                              const sent = typeof friendRequestSent === 'object' ? friendRequestSent[p.id] : !!friendRequestSent;
                              return (
                              <button
                                onClick={() => onAddFriend(p.name, p.id)}
                                disabled={sent}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 12,
                                  borderRadius: 4,
                                  border: "none",
                                  backgroundColor: sent ? "#3A3A3C" : "#e56b6f",
                                  color: "#ffffff",
                                  cursor: sent ? "default" : "pointer",
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {sent ? "✓" : "Add friend"}
                              </button>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
          );
        })() : (
          <>
            <h2
              style={{
                margin: 0,
                marginBottom: 10,
                fontSize: 22,
                fontWeight: "bold",
                letterSpacing: 1,
                color: allSolved ? "#50a339" : "#d7dadc"
              }}
            >
              {allSolved ? "Congratulations!" : "Stage ended"}
            </h2>

            {speedrunEnabled && (
              <div style={{ marginBottom: 12, color: "#d7dadc", fontSize: 15 }}>
                <div>Total time: {formatElapsed(popupTotalMs)}</div>
                {mode === "marathon" && (
                  <div>Stage time: {formatElapsed(stageElapsedMs)}</div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 8, fontSize: 16, color: "#d7dadc" }}>
              {allSolved
                ? boards.length === 1
                  ? "You solved the word."
                  : `You solved all ${boards.length} words.`
                : `You solved ${solvedCount} of ${boards.length} word${boards.length > 1 ? "s" : ""}.`}
            </div>

            <div style={{ marginBottom: 14, fontSize: 18, color: "#ffffff", fontWeight: "bold" }}>
              {speedrunEnabled
                ? `Guesses used: ${turnsUsed}`
                : `Guesses used: ${turnsUsed}/${maxTurns}`}
            </div>

            {streakLabel && (
              <div
                style={{
                  marginBottom: 10,
                  fontSize: 14,
                  color: "#d7dadc",
                }}
              >
                {streakLabel}
              </div>
            )}
          </>
        )}

        {!isMultiplayer && (
          <>
            <div style={{ marginBottom: 10, color: "#ffffff", fontWeight: "bold" }}>Solutions</div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "center",
                marginBottom: 16
              }}
            >
              {(Array.isArray(boards) ? boards : []).map((b, i) => (
                <div
                  key={b?.solution ?? `board-${i}`}
                  style={{
                    backgroundColor: b && b.isSolved ? "#50a339" : "#3A3A3C",
                    color: "#ffffff",
                    padding: "8px 10px",
                    borderRadius: 8,
                    fontSize: 13
                  }}
                >
                  Board {i + 1}: {b && b.solution ? b.solution : "?"}
                </div>
              ))}
            </div>
          </>
        )}

        {isMultiplayer && (multiplayerGameState?.solution || multiplayerGameState?.solutions) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: "#ffffff", fontWeight: "bold", fontSize: 16 }}>
              {Array.isArray(multiplayerGameState?.solutions) && multiplayerGameState.solutions.length > 1
                ? "Solutions"
                : "Solution"}
            </div>

            {(() => {
              const solutionList = getSolutionArray(multiplayerGameState);

              return (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    justifyContent: "center",
                  }}
                >
                  {solutionList.map((word, idx) => (
                    <div
                      key={typeof word === "string" ? word : `sol-${idx}`}
                      style={{
                        backgroundColor: "#50a339",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 16,
                        fontWeight: "bold",
                        letterSpacing: 2,
                      }}
                    >
                      {solutionList.length > 1 ? `B${idx + 1}: ` : ""}
                      {word.toUpperCase()}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!isMultiplayer && canShare && (
            <button
              onClick={onShare}
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
              Share
            </button>
          )}

          {isMultiplayer && isPlayerHost && onRematch && (
            <button
              onClick={onRematch}
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
              Rematch
            </button>
          )}

          {isMultiplayer && !isPlayerHost && onChangeMode && (
            <button
              onClick={onChangeMode}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "12px 0",
                borderRadius: 10,
                border: "1px solid #3A3A3C",
                background: "#355070",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              View Config
            </button>
          )}

          {isMultiplayer && isPlayerHost && onChangeMode && (
            <button
              onClick={onChangeMode}
              style={{
                flex: 1,
                minWidth: 160,
                padding: "12px 0",
                borderRadius: 10,
                border: "1px solid #3A3A3C",
                background: "#355070",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Change Mode
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              flex: 1,
              minWidth: 160,
              padding: "12px 0",
              borderRadius: 10,
              border: "1px solid #3A3A3C",
              background: "#355070",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
              letterSpacing: 1,
              textTransform: "uppercase"
            }}
          >
            {showPostCommentCta ? "View Comments" : "Close"}
          </button>

          {mode === "marathon" && marathonHasNext && allowNextStageAfterPopup && allSolved && (
            <button
              onClick={handleNextStage}
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
              Next Stage
            </button>
          )}

          {user && showSubscriptionGate && (
            <button
              onClick={handleOpenSubscribe}
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
