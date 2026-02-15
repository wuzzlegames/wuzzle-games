import React, { useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { CHALLENGE_EXPIRY_MS } from "../hooks/useNotificationSeen";
import Modal from "./Modal";
import SignInRequiredModal from "./SignInRequiredModal";
import UserCardWithBadges from "./UserCardWithBadges";

function isChallengeExpired(ch) {
  const createdAt = ch?.createdAt || 0;
  return createdAt + CHALLENGE_EXPIRY_MS < Date.now();
}

const FriendsModal = lazy(() => import("./FriendsModal"));
const OpenRoomsModal = lazy(() => import("./OpenRoomsModal"));

const SIGN_IN_PROMPTS = {
  profile: { title: "Profile", message: "You need to sign in to access your profile." },
  friends: { title: "Friends", message: "You need to sign in to use Friends." },
  challenges: { title: "Challenges", message: "You need to sign in to view challenges." },
  openRooms: { title: "Open Rooms", message: "You need to sign in to browse open rooms." },
};

export default function HamburgerMenu({ onOpenFeedback, onSignUpComplete }) {
  const navigate = useNavigate();
  const {
    user,
    friendRequests,
    incomingChallenges,
    sentChallenges,
    isVerifiedUser,
    acceptChallenge,
    dismissChallenge,
    cancelSentChallenge,
  } = useAuth();
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showOpenRoomsModal, setShowOpenRoomsModal] = useState(false);
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [signInRequired, setSignInRequired] = useState(null);

  const requestSignIn = useCallback((key) => {
    setSignInRequired(SIGN_IN_PROMPTS[key] || { title: "Sign in required", message: "You need to sign in to access this feature." });
    setShowHamburgerMenu(false);
  }, []);

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          className="homeBtn homeBtnOutline"
          onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
          style={{
            padding: "4px 6px",
            fontSize: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "#ffffff",
            cursor: "pointer"
          }}
          title="Menu"
        >
          ☰
        </button>
        {showHamburgerMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: "#372F41",
              border: "1px solid #3A3A3C",
              borderRadius: "8px",
              minWidth: "140px",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <button
              onClick={() => {
                navigate('/');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C"
              }}
              onMouseEnter={(e) => e.target.style.background = "#6d597a"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Home
            </button>
            <button
              onClick={() => {
                navigate('/how-to-play');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C"
              }}
              onMouseEnter={(e) => e.target.style.background = "#6d597a"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              How to Play
            </button>
            <button
              onClick={() => {
                if (!user) {
                  requestSignIn("profile");
                  return;
                }
                navigate('/profile');
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C"
              }}
              onMouseEnter={(e) => e.target.style.background = "#6d597a"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Profile
            </button>
            <button
              onClick={() => {
                if (!user) {
                  requestSignIn("friends");
                  return;
                }
                if (!isVerifiedUser) {
                  alert('Verify your email or sign in with Google to use friends.');
                  setShowHamburgerMenu(false);
                  return;
                }
                setShowFriendsModal(true);
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C",
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}
              onMouseEnter={(e) => e.target.style.background = "#6d597a"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Friends
              {user && friendRequests && friendRequests.length > 0 && (
                <div style={{
                  marginLeft: "8px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ED2939",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {friendRequests.length}
                </div>
              )}
            </button>
            <button
              onClick={() => {
                if (!user) {
                  requestSignIn("challenges");
                  return;
                }
                if (!isVerifiedUser) {
                  alert('Verify your email or sign in with Google to use challenges.');
                  setShowHamburgerMenu(false);
                  return;
                }
                setShowChallengesModal(true);
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C",
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#6d597a")}
              onMouseLeave={(e) => (e.target.style.background = "transparent")}
            >
              Challenges
              {user && incomingChallenges && incomingChallenges.length > 0 && (
                <div
                  style={{
                    marginLeft: "8px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#B1A04C",
                    color: "#212121",
                    fontSize: "11px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {incomingChallenges.length}
                </div>
              )}
            </button>
            <button
              onClick={() => {
                if (!user) {
                  requestSignIn("openRooms");
                  return;
                }
                setShowOpenRoomsModal(true);
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid #3A3A3C",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#6d597a")}
              onMouseLeave={(e) => (e.target.style.background = "transparent")}
            >
              Open Rooms
            </button>

            {user && user.email === "abhijeetsridhar14@gmail.com" && (
              <button
                onClick={() => {
                  setShowAllRoomsModal(true);
                  setShowHamburgerMenu(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontWeight: "600",
                  letterSpacing: "0.3px",
                  transition: "all 0.2s ease",
                  borderBottom: "1px solid #3A3A3C",
                }}
                onMouseEnter={(e) => (e.target.style.background = "#6d597a")}
                onMouseLeave={(e) => (e.target.style.background = "transparent")}
              >
                View all rooms
              </button>
            )}
            <button
              onClick={() => {
                onOpenFeedback();
                setShowHamburgerMenu(false);
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "#6d597a"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Feedback
            </button>
          </div>
        )}
      </div>

      {showHamburgerMenu && (
        <div
          onClick={() => setShowHamburgerMenu(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      <Suspense fallback={null}>
        <FriendsModal
          isOpen={showFriendsModal}
          onRequestClose={() => setShowFriendsModal(false)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <OpenRoomsModal
          isOpen={showOpenRoomsModal}
          onRequestClose={() => setShowOpenRoomsModal(false)}
        />
      </Suspense>

      {/* Admin-only: view all rooms (public + private) with close controls */}
      <Suspense fallback={null}>
        <OpenRoomsModal
          isOpen={showAllRoomsModal}
          onRequestClose={() => setShowAllRoomsModal(false)}
          adminMode
        />
      </Suspense>

      {/* Incoming multiplayer challenges modal */}
      <Modal
        isOpen={showChallengesModal}
        onRequestClose={() => setShowChallengesModal(false)}
      >
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
              color: "#ffffff",
            }}
          >
            Challenges
          </h2>

          {(!sentChallenges || sentChallenges.length === 0) && (!incomingChallenges || incomingChallenges.length === 0) ? (
            <div
              style={{
                padding: "24px 8px 16px",
                color: "#818384",
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
                  color: "#d7dadc",
                  textAlign: "left",
                }}
              >
                Sent
              </h3>
              {(!sentChallenges || sentChallenges.length === 0) ? (
                <div
                  style={{
                    padding: "8px 0 12px",
                    color: "#818384",
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
                        border: "1px solid #3A3A3C",
                        background: "#372F41",
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
                          <div style={{ color: "#d7dadc", fontSize: 12 }}>
                            {ch.boards || 1} board{(ch.boards || 1) > 1 ? "s" : ""} · {ch.speedrun ? "Speedrun" : "Standard"}
                            {expired && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: "#818384", fontWeight: "600" }}>Expired</span>
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
                                alert(err?.message || 'Failed to dismiss challenge');
                              }
                            }}
                            className="homeBtn homeBtnOutline"
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                              color: "#818384",
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
                                  alert(err?.message || 'Failed to cancel challenge');
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
                  color: "#d7dadc",
                  textAlign: "left",
                }}
              >
                Received
              </h3>
              {(!incomingChallenges || incomingChallenges.length === 0) ? (
                <div
                  style={{
                    padding: "8px 0 12px",
                    color: "#818384",
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
                        border: "1px solid #3A3A3C",
                        background: "#372F41",
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
                          <div style={{ color: "#d7dadc", fontSize: 12 }}>
                            {ch.boards || 1} board{(ch.boards || 1) > 1 ? "s" : ""} · {ch.variant === 'solutionhunt' ? 'Solution Hunt' : ch.variant === 'speedrun' || ch.speedrun ? 'Speedrun' : 'Standard'}
                            {expired && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: "#818384", fontWeight: "600" }}>Expired</span>
                            )}
                          </div>
                        </div>
                        {!expired ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={async () => {
                                try {
                                  const data = await acceptChallenge(ch.id);
                                  setShowChallengesModal(false);
                                  // Navigate into the multiplayer waiting room as the guest.
                                  const boards = data.boards || 1;
                                  // Support both new variant and legacy speedrun fields
                                  const variant = data.variant || (data.speedrun ? 'speedrun' : 'standard');
                                  navigate(
                                    `/game?mode=multiplayer&code=${data.gameCode}&variant=${variant}&boards=${boards}`,
                                  );
                                } catch (err) {
                                  // eslint-disable-next-line no-alert
                                  alert(err?.message || 'Failed to accept challenge');
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
                                  alert(err?.message || 'Failed to dismiss challenge');
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
                                alert(err?.message || 'Failed to dismiss challenge');
                              }
                            }}
                            className="homeBtn homeBtnOutline"
                            style={{
                              padding: "6px 10px",
                              fontSize: 11,
                              borderRadius: 6,
                              color: "#818384",
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
            onClick={() => setShowChallengesModal(false)}
            className="homeBtn homeBtnGreen homeBtnLg"
            style={{ marginTop: 4 }}
          >
            Close
          </button>
        </div>
      </Modal>

      {signInRequired && (
        <SignInRequiredModal
          isOpen={!!signInRequired}
          onRequestClose={() => setSignInRequired(null)}
          title={signInRequired.title}
          message={signInRequired.message}
          onSignUpComplete={onSignUpComplete}
        />
      )}
    </>
  );
}
