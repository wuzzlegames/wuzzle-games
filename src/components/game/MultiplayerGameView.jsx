import React, { useState } from "react";
import GameHeader from "./GameHeader";
import MultiplayerWaitingRoom from "./MultiplayerWaitingRoom";
import GameBoard from "./GameBoard";
import SiteHeader from "../SiteHeader";
import MultiplayerChat from "./MultiplayerChat";
import UserCardWithBadges from "../UserCardWithBadges";
import AuthModal from "../AuthModal";
import { KEYBOARD_HEIGHT, formatElapsed as formatElapsedLib, scoreGuess } from "../../lib/wordle";
import { FLIP_MS, SPEEDRUN_COUNTDOWN_MS } from "../../lib/gameConstants";
import { MULTIPLAYER_WAITING_TIMEOUT_MS, getSolutionArray } from "../../lib/multiplayerConfig";
import { ROOM_CLOSED_MESSAGE } from "../../hooks/useMultiplayerGame";

/**
 * Presentation component for all multiplayer-specific game views.
 * Handles: waiting room, error/loading states, dual boards, scores, and rematch button.
 */
export default function MultiplayerGameView({
  mode,
  gameCode,
  authUser,
  authLoading,
  isVerifiedUser,
  multiplayerGame,
  isLoading,
  maxTurns,
  currentGuess,
  invalidCurrentGuess,
  revealId,
  boardRefs,
  boards,
  selectedBoardIndex,
  setSelectedBoardIndex,
  friendRequestSent,
  onAddFriendRequest,
  onShareCode,
  onReady,
  onStartGame,
  onBack,
  onHomeClick,
  onOpenFeedback,
  onRematch,
  setShowFeedbackModal,
  setTimedMessage,
  multiplayerNowMs,
  waitingNowMs,
  initialNumBoards,
  onChangeMode,
  friends,
  onCancelChallenge,
  onInviteFriend,
  onUpdateConfig,
  onUpdateRoomName,
  countdownRemaining,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const gameState = multiplayerGame?.gameState;
  const playersMap = gameState && gameState.players && typeof gameState.players === "object" ? gameState.players : null;
  const playerCount = playersMap ? Object.keys(playersMap).length : 0;

  // If we're still resolving auth, show a simple loading state that includes the header.
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#212121",
          color: "#ffffff",
        }}
      >
        <SiteHeader onOpenFeedback={onOpenFeedback} onHomeClick={onHomeClick} />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          Loading authentication...
        </div>
      </div>
    );
  }

  // If the user is not signed in, show a dedicated login-required screen for Multiplayer Mode.
  if (!authUser) {
    return (
      <>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#212121",
            color: "#ffffff",
          }}
        >
          <SiteHeader onOpenFeedback={onOpenFeedback} onHomeClick={onHomeClick} />
          <main
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: 24,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Sign in to play Multiplayer Mode
            </h2>
            <p
              style={{
                maxWidth: 480,
                fontSize: 14,
                color: "#d7dadc",
                marginBottom: 24,
                lineHeight: 1.6,
              }}
            >
              A Wuzzle Games account is required to host or join multiplayer rooms.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
                maxWidth: 320,
              }}
            >
              <button
                type="button"
                className="homeBtn homeBtnGreen homeBtnLg"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </button>
              <button
                type="button"
                className="homeBtn homeBtnOutline homeBtnLg"
                onClick={onBack}
              >
                Back to Home
              </button>
            </div>
          </main>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onRequestClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  // If the invited friend has declined the challenge (via Challenges modal),
  // show a simple message to the host and offer a way back home.
  if (gameState && gameState.status === "cancelled") {
    const declinedBy = gameState.cancelledByName || "Your friend";
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#212121", color: "#ffffff" }}>
        <SiteHeader onOpenFeedback={onOpenFeedback} onHomeClick={onHomeClick} />
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: 22, fontWeight: "bold", marginBottom: 16 }}>Multiplayer Challenge</h2>
          <p style={{ fontSize: 16, color: "#d7dadc", marginBottom: 16 }}>
            {declinedBy} has declined the challenge.
          </p>
          <button
            onClick={onBack}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#e56b6f",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  // Waiting room view
  if (gameState && gameState.status === "waiting" && isVerifiedUser) {
    // Determine host from players map
    const playersMapForHost = gameState.players && typeof gameState.players === "object" ? gameState.players : null;
    const isPlayerHost = authUser && playersMapForHost && playersMapForHost[authUser.uid]?.isHost === true;
    const createdAt = typeof gameState.createdAt === "number" ? gameState.createdAt : null;

    // Boards/maxPlayers/room name for the waiting-room header and summary.
    const waitingBoards =
      typeof gameState.configBoards === "number" && Number.isFinite(gameState.configBoards)
        ? gameState.configBoards
        : initialNumBoards || 1;
    const maxPlayers =
      typeof gameState.maxPlayers === "number" && Number.isFinite(gameState.maxPlayers)
        ? gameState.maxPlayers
        : 2;
    const roomName = gameState.roomName || null;

    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#212121", color: "#ffffff" }}>
        <SiteHeader onOpenFeedback={onOpenFeedback} onHomeClick={onHomeClick} />
        <GameHeader
          mode={mode}
          numBoards={waitingBoards}
          speedrunEnabled={false}
        />
        <MultiplayerWaitingRoom
          gameCode={gameCode || ""}
          gameState={gameState}
          isHost={isPlayerHost}
          currentUserId={authUser?.uid || null}
          maxPlayers={maxPlayers}
          roomName={roomName}
          onReady={onReady}
          onStartGame={onStartGame}
          friendRequestSent={friendRequestSent}
          onShareCode={onShareCode}
          onCancelChallenge={isPlayerHost ? onCancelChallenge : undefined}
          createdAt={createdAt}
          waitingNowMs={waitingNowMs}
          waitingTimeoutMs={MULTIPLAYER_WAITING_TIMEOUT_MS}
          initialBoards={initialNumBoards || 1}
          onUpdateConfig={isPlayerHost ? onUpdateConfig : undefined}
          onUpdateRoomName={isPlayerHost ? onUpdateRoomName : undefined}
          onAddFriend={(name, id) => {
            if (id) onAddFriendRequest(name, id);
          }}
          friends={friends}
          authUserId={authUser ? authUser.uid : null}
          onInviteFriend={onInviteFriend}
        />

        <MultiplayerChat gameCode={gameCode || ""} authUser={authUser} />
      </div>
    );
  }

  // Room closed view (host left the room; show clear message and Go home button)
  const isRoomClosedError =
    multiplayerGame?.error === ROOM_CLOSED_MESSAGE ||
    (typeof multiplayerGame?.error === "string" &&
      (multiplayerGame.error.includes("Game code not found") ||
        multiplayerGame.error.includes("not found or has expired")));
  if (isRoomClosedError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#212121",
          color: "#ffffff",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
        }}
      >
        <div style={{ textAlign: "center", fontSize: 18 }}>
          The host has left the room
        </div>
        <div style={{ color: "#9ca3af", textAlign: "center", fontSize: 14 }}>
          {ROOM_CLOSED_MESSAGE}
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "none",
            background: "#e56b6f",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Go home
        </button>
      </div>
    );
  }

  // Error view (other errors, e.g. connection timeout)
  if (multiplayerGame?.error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#212121",
          color: "#ffffff",
          flexDirection: "column",
          gap: "16px",
          padding: "20px",
        }}
      >
        <div style={{ color: "#f06272", textAlign: "center" }}>
          Error: {multiplayerGame.error}
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "12px 24px",
            borderRadius: 8,
            border: "none",
            background: "#e56b6f",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Home
        </button>
      </div>
    );
  }

  // Check if user is authenticated but not verified
  const isAuthenticatedNotVerified = authUser && !isVerifiedUser;

  // Loading view while connecting or waiting for gameState
  // Only show "Connecting to game..." if user is verified and we have a game code but no game state
  // If user is not verified, don't show "Connecting to game..." indefinitely
  const shouldShowConnecting = gameCode && !gameState && isVerifiedUser;
  if (isLoading || multiplayerGame?.loading || shouldShowConnecting) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#212121",
          color: "#ffffff",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {!authUser ? (
          <>Loading authentication...</>
        ) : isAuthenticatedNotVerified ? (
          <div style={{ textAlign: "center" }}>
            <div>You must verify your email to play Multiplayer Mode.</div>
            <button
              onClick={onBack}
              style={{
                marginTop: "16px",
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                background: "#e56b6f",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          </div>
        ) : shouldShowConnecting ? (
          <>Connecting to game...</>
        ) : isLoading ? (
          <>Loading word lists...</>
        ) : (
          <>Loading game...</>
        )}
      </div>
    );
  }

  // If user is authenticated but not verified and we don't have a game state, show verification message
  // Note: isAuthenticatedNotVerified is defined earlier in the loading section
  if (!gameState) {
    if (isAuthenticatedNotVerified) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#212121",
            color: "#ffffff",
            flexDirection: "column",
            gap: "16px",
            textAlign: "center",
          }}
        >
          <div>You must verify your email to play Multiplayer Mode.</div>
          <button
            onClick={onBack}
            style={{
              marginTop: "16px",
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#e56b6f",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Back to Home
          </button>
        </div>
      );
    }
    return null;
  }

  const isSpeedrun = gameState.speedrun || false;
  
  // Determine if current player is host
  const isPlayerHost = authUser && playersMap && playersMap[authUser.uid]
    ? playersMap[authUser.uid].isHost
    : false;
  
  // UI is driven from players map; no single "opponent" for N-player
  const opponentId = null;
  const isFriendWithOpponent = false;

  const playerIds = playersMap ? Object.keys(playersMap) : [];
  const isMultiRoom = !!playersMap && playerIds.length > 2;

  // Total room lifetime (for expiry display)
  const createdAt = typeof gameState.createdAt === "number" ? gameState.createdAt : null;
  let expiryLabel = null;
  if (createdAt) {
    const ageMs = waitingNowMs - createdAt;
    const remainingMs = Math.max(0, MULTIPLAYER_WAITING_TIMEOUT_MS - ageMs);
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      expiryLabel = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    } else {
      expiryLabel = `${seconds}s`;
    }
  }

  // Show all solution words in header (similar to multi-board daily)
  const solutionList = getSolutionArray(gameState);
  const solutionsText = solutionList.map((w) => w.toUpperCase()).join(" · ");
  const numBoardsForHeader = solutionList.length || 1;

  // Multiplayer is no longer turn-based; all players can guess concurrently.
  // We keep a single layout that always shows only the local player's boards.

  const myGuesses = (() => {
    if (playersMap && authUser) {
      const me = authUser?.uid ? playersMap[authUser.uid] : null;
      if (me && Array.isArray(me.guesses)) return me.guesses;
    }
    return [];
  })();

  const opponentGuesses = (() => {
    if (playersMap && authUser) {
      const others = Object.values(playersMap).filter((p) => p.id !== authUser.uid);
      if (others[0] && Array.isArray(others[0].guesses)) return others[0].guesses;
    }
    return [];
  })();

  const mySolved = gameState.solution && myGuesses.includes(gameState.solution);
  const opponentSolved = gameState.solution && opponentGuesses.includes(gameState.solution);

  // In multi-board multiplayer, hide opponent guesses until the local player has
  // solved *all* boards. This applies only when there is more than one
  // solution/board.
  const isMultiBoard = solutionList.length > 1;
  const mySolvedAllBoards = isMultiBoard
    ? solutionList.every((sol) => myGuesses.includes(sol))
    : mySolved;
  const hideOpponentBoards = isMultiBoard && !mySolvedAllBoards;
  // When hiding, we still want to show colors but not letters.
  const hideOpponentLetters = hideOpponentBoards;

  const myGuessCount = myGuesses.length;
  const opponentGuessCount = opponentGuesses.length;

  const currentTurnLabel = isSpeedrun
    ? isMultiRoom
      ? "Multiplayer speedrun: everyone guessing"
      : "Speedrun: everyone guessing"
    : isMultiRoom || playerCount > 2
    ? "Multiplayer: everyone guessing"
    : "Standard: everyone guessing";

  const renderSpeedrunTimeForPlayer = (playerId) => {
    if (gameState?.players && playerId) {
      const playerData = gameState.players[playerId];
      const playerTimeMs = playerData?.timeMs || null;

      if (playerTimeMs !== null) return formatElapsedLib(playerTimeMs);

      const startedAt = gameState?.startedAt;
      const effectiveStart = startedAt != null ? startedAt + SPEEDRUN_COUNTDOWN_MS : null;
      if (effectiveStart != null) {
        const elapsed = Math.max(0, multiplayerNowMs - effectiveStart);
        return formatElapsedLib(elapsed);
      }
      return "0:00";
    }
    return "0:00";
  };

  // Helper to build per-board stats (guesses, greens, yellows) for a player's
  // global guess history.
  const buildPerBoardStats = (guesses) => {
    const safeGuesses = Array.isArray(guesses) ? guesses : [];
    return solutionList.map((sol, index) => {
      const solLower = typeof sol === "string" ? sol.toLowerCase() : "";
      const firstSolveIndex = safeGuesses.findIndex((g) =>
        typeof g === "string" ? g.toLowerCase() === solLower : false,
      );
      const limit = firstSolveIndex === -1 ? safeGuesses.length : firstSolveIndex + 1;

      let greens = 0;
      let yellows = 0;

      safeGuesses.slice(0, limit).forEach((word) => {
        const colors = scoreGuess(word.toLowerCase(), sol.toLowerCase());
        colors.forEach((c) => {
          if (c === "green") greens += 1;
          else if (c === "yellow") yellows += 1;
        });
      });

      const solved = firstSolveIndex !== -1;

      return {
        boardIndex: index + 1,
        guessCount: limit,
        greens,
        yellows,
        solved,
      };
    });
  };

  const summaryPlayers = (() => {
    if (playersMap && Object.keys(playersMap).length > 0) {
      return Object.values(playersMap);
    }
    return [];
  })();

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#212121",
          color: "#ffffff",
        }}
      >
        <SiteHeader onOpenFeedback={onOpenFeedback} onHomeClick={onHomeClick} />

        {isSpeedrun &&
          gameState.status === "playing" &&
          countdownRemaining != null &&
          countdownRemaining > 0 && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(18, 18, 19, 0.95)",
                zIndex: 9999,
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: "bold",
                  letterSpacing: 4,
                  color: "#ffffff",
                  textAlign: "center",
                }}
              >
                Timer starts in {countdownRemaining}
              </div>
            </div>
          )}

        <main
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            // Reserve keyboard height while playing; once the game is finished,
            // shrink bottom padding so comments and end-of-game controls sit
            // closer to the bottom of the viewport.
            paddingBottom:
              (gameState.status === "finished" ? 16 : KEYBOARD_HEIGHT) + 16,
          }}
        >
          <GameHeader
            mode={mode}
            numBoards={numBoardsForHeader}
            speedrunEnabled={isSpeedrun}
          />

          {solutionsText && solutionsText.length > 0 && (
            <div
              style={{
                padding: "0 16px 8px",
                fontSize: 12,
                color: "#d7dadc",
                textTransform: "uppercase",
                fontWeight: "normal",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {solutionsText}
            </div>
          )}

          <div
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "1200px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {expiryLabel && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textAlign: "center",
                  marginBottom: 4,
                }}
              >
                Room expires in {expiryLabel}.
              </div>
            )}
            {/* Status bar: boards, guesses, timer */}
            <div
              style={{
                marginBottom: 4,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #3A3A3C",
                background: "#372F41",
                display: "flex",
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
                <span style={{ fontWeight: "bold" }}>{numBoardsForHeader}</span>
              </div>

              {/* Center: big timer for speedrun (shared timer that stops when any player finishes), your guesses for standard */}
              <div style={{ flex: 1, textAlign: "center" }}>
                {isSpeedrun ? (
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: "bold",
                      letterSpacing: 1,
                      color: "#ffffff",
                    }}
                  >
                    {(() => {
                      const inCountdown = countdownRemaining != null && countdownRemaining > 0;
                      if (inCountdown) return "0:00";

                      const startedAt = gameState?.startedAt;
                      const effectiveStart = startedAt != null ? startedAt + SPEEDRUN_COUNTDOWN_MS : null;

                      if (gameState?.players && authUser) {
                        const myPlayer = gameState.players[authUser.uid];
                        if (myPlayer) {
                          if (myPlayer.timeMs != null && typeof myPlayer.timeMs === "number") {
                            return formatElapsedLib(myPlayer.timeMs);
                          }
                          if (effectiveStart != null) {
                            const elapsed = Math.max(0, multiplayerNowMs - effectiveStart);
                            return formatElapsedLib(elapsed);
                          }
                        }
                      }

                      if (effectiveStart != null) {
                        const elapsed = Math.max(0, multiplayerNowMs - effectiveStart);
                        return formatElapsedLib(elapsed);
                      }
                      return "0:00";
                    })()}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: "#ffffff",
                    }}
                  >
                    Your guesses: {myGuesses.length}/{maxTurns}
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
                  {isSpeedrun ? "Unlimited" : maxTurns}
                </span>
              </div>
            </div>

            {/* Scores and turn indicator */}
            <div
              style={{
                textAlign: "center",
                fontSize: 14,
                color: "#d7dadc",
                marginBottom: "8px",
              }}
            >
              {gameState.status === "finished" ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "24px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: "#818384" }}>
                      Your Guesses
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: "#ffffff",
                      }}
                    >
                      {myGuessCount}
                    </div>
                  </div>
                </div>
              ) : isSpeedrun ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#818384",
                    textAlign: "center",
                  }}
                >
                  {currentTurnLabel}
                </div>
              ) : (
                currentTurnLabel
              )}
            </div>

            {/* Rematch status text */}

            {/* Boards: local player only */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "24px",
                width: "100%",
              }}
            >
              {boards.map((board, index) => (
                <div key={index} style={{ width: "100%" }}>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#818384",
                      marginBottom: "8px",
                      textAlign: "center",
                    }}
                  >
                    Your Board {boards.length > 1 ? `#${index + 1}` : ""}
                  </div>
                  <GameBoard
                    board={board}
                    index={index}
                    numBoards={boards.length}
                    maxTurns={maxTurns}
                    isUnlimited={isSpeedrun}
                    currentGuess={currentGuess}
                    invalidCurrentGuess={invalidCurrentGuess}
                    revealId={revealId}
                    isSelected={selectedBoardIndex === index}
                    onToggleSelect={() =>
                      setSelectedBoardIndex((prev) => (prev === index ? null : index))
                    }
                    boardRef={(el) => {
                      boardRefs.current[index] = el;
                    }}
                    speedrunEnabled={isSpeedrun}
                    // No turn-based highlighting; multiplayer is free-for-all.
                    isCurrentTurn={true}
                  />
                </div>
              ))}
            </div>

            {/* Room progress summary across all boards for each player */}
            {summaryPlayers.length > 0 && solutionList.length > 0 && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 12px 10px",
                  borderRadius: 8,
                  border: "1px solid #3A3A3C",
                  background: "#372F41",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "#d7dadc",
                    marginBottom: 8,
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  Room progress (per board)
                </div>
                <div
                  style={{
                    maxHeight: 260,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {summaryPlayers.map((p) => {
                    const isSelf = authUser && p.id === authUser.uid;
                    const guesses = Array.isArray(p.guesses) ? p.guesses : [];
                    const perBoard = buildPerBoardStats(guesses);

                    return (
                      <div
                        key={p.id || p.name}
                        style={{
                          padding: "8px 8px 6px",
                          borderRadius: 6,
                          background: "#372F41",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <UserCardWithBadges
                            userId={p.id}
                            username={p.name || "Player"}
                            isYou={isSelf}
                            size="sm"
                          />
                          {isSpeedrun ? (
                            <div
                              style={{
                                fontSize: 11,
                                color: isSelf ? "#50a339" : "#B1A04C", // Highlight current player's time
                              }}
                            >
                              {renderSpeedrunTimeForPlayer(p.id)}
                            </div>
                          ) : (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#9ca3af",
                              }}
                            >
                              Total guesses: {guesses.length}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            fontSize: 11,
                            color: "#d7dadc",
                          }}
                        >
                          {perBoard.map((b) => {
                            const guessLabel =
                              b.guessCount === 1
                                ? "1 guess"
                                : `${b.guessCount} guesses`;
                            const parts = [
                              `Board ${b.boardIndex}: ${guessLabel}`,
                              `Green ${b.greens} 🟩`,
                              `Yellow ${b.yellows} 🟨`,
                            ];
                            if (b.solved) {
                              parts.push("Solved");
                            }
                            const summaryText = parts.join(" · ");

                            return (
                              <div
                                key={b.boardIndex}
                                style={{
                                  padding: "4px 6px",
                                  borderRadius: 4,
                                  background: "#372F41",
                                }}
                              >
                                {summaryText}
                              </div>
                            );
                          })}

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Rematch & change-mode buttons when game is finished */}
        {gameState.status === "finished" && (
          <div
            style={{
              position: "fixed",
              bottom: KEYBOARD_HEIGHT + 20,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1100,
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPlayerHost && (
                <button
                  onClick={onRematch}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 10,
                    border: "none",
                    background: "#e56b6f",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: "pointer",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                >
                  Rematch
                </button>
              )}

              {onChangeMode && (
                <button
                  onClick={onChangeMode}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 10,
                    border: "1px solid #3A3A3C",
                    background: isPlayerHost ? "#372F41" : "#355070",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: "pointer",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                >
                  {isPlayerHost ? "Change mode" : "View config"}
                </button>
              )}
            </div>
          </div>
        )}

        <MultiplayerChat gameCode={gameCode || ""} authUser={authUser} />
      </div>
    </>
  );
}
