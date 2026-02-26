import React, { useState, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import SignInRequiredModal from "./SignInRequiredModal";

const OpenRoomsModal = lazy(() => import("./OpenRoomsModal"));
const ChallengesModal = lazy(() => import("./ChallengesModal"));
const FriendsModal = lazy(() => import("./FriendsModal"));

const SIGN_IN_PROMPTS = {
  profile: { title: "Profile", message: "You need to sign in to access your profile." },
  friends: { title: "Friends", message: "You need to sign in to use Friends." },
  challenges: { title: "Challenges", message: "You need to sign in to view challenges." },
  openRooms: { title: "Open Rooms", message: "You need to sign in to browse open rooms." },
};

export default function HamburgerMenu({ onOpenFeedback, onSignUpComplete, onOpenFriends, onOpenChallenges, open: controlledOpen, onOpenChange }) {
  const navigate = useNavigate();
  const {
    user,
    friendRequests,
    incomingChallenges,
    isVerifiedUser,
  } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onOpenChange != null;
  const showHamburgerMenu = isControlled ? controlledOpen : internalOpen;
  const setShowHamburgerMenu = isControlled ? (v) => { if (!v) onOpenChange(false); } : setInternalOpen;

  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showOpenRoomsModal, setShowOpenRoomsModal] = useState(false);
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [signInRequired, setSignInRequired] = useState(null);

  const requestSignIn = useCallback((key) => {
    setSignInRequired(SIGN_IN_PROMPTS[key] || { title: "Sign in required", message: "You need to sign in to access this feature." });
    if (isControlled) onOpenChange(false);
    else setInternalOpen(false);
  }, [isControlled, onOpenChange]);

  const closeMenu = useCallback(() => {
    if (isControlled) onOpenChange(false);
    else setInternalOpen(false);
  }, [isControlled, onOpenChange]);

  return (
    <>
      <div style={{ position: "relative" }}>
        {!isControlled && (
          <button
            className="homeBtn homeBtnOutline"
            onClick={() => setInternalOpen(!internalOpen)}
            style={{
              padding: "4px 6px",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              color: "var(--c-text-strong)",
              cursor: "pointer"
            }}
            title="Menu"
          >
            ☰
          </button>
        )}
        {showHamburgerMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              background: "var(--c-panel)",
              border: "1px solid var(--c-border)",
              borderRadius: "8px",
              minWidth: "140px",
              zIndex: 1000,
              boxShadow: "0 4px 12px var(--c-bg)"
            }}
          >
            <button
              onClick={() => {
                navigate('/');
                closeMenu();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--c-accent-2)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Home
            </button>
            <button
              onClick={() => {
                navigate('/how-to-play');
                closeMenu();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--c-accent-2)"}
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
                closeMenu();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--c-accent-2)"}
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
                  closeMenu();
                  return;
                }
                if (onOpenFriends) {
                  onOpenFriends();
                  closeMenu();
                } else {
                  setShowFriendsModal(true);
                  closeMenu();
                }
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)",
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--c-accent-2)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Friends
              {user && friendRequests && friendRequests.length > 0 && (
                <div style={{
                  marginLeft: "8px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "var(--c-error)",
                  color: "var(--c-text-strong)",
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
                  closeMenu();
                  return;
                }
                if (onOpenChallenges) {
                  onOpenChallenges();
                  closeMenu();
                } else {
                  setShowChallengesModal(true);
                  closeMenu();
                }
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)",
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) => (e.target.style.background = "var(--c-accent-2)")}
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
                    background: "var(--c-present)",
                    color: "var(--c-text)",
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
                closeMenu();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease",
                borderBottom: "1px solid var(--c-border)",
              }}
              onMouseEnter={(e) => (e.target.style.background = "var(--c-accent-2)")}
              onMouseLeave={(e) => (e.target.style.background = "transparent")}
            >
              Open Rooms
            </button>

            {user && user.email === "abhijeetsridhar14@gmail.com" && (
              <button
                onClick={() => {
                  setShowAllRoomsModal(true);
                  closeMenu();
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  background: "transparent",
                  border: "none",
                  color: "var(--c-text-strong)",
                  fontSize: "13px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontWeight: "600",
                  letterSpacing: "0.3px",
                  transition: "all 0.2s ease",
                  borderBottom: "1px solid var(--c-border)",
                }}
                onMouseEnter={(e) => (e.target.style.background = "var(--c-accent-2)")}
                onMouseLeave={(e) => (e.target.style.background = "transparent")}
              >
                View all rooms
              </button>
            )}
            <button
              onClick={() => {
                onOpenFeedback();
                closeMenu();
              }}
              style={{
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                color: "var(--c-text-strong)",
                fontSize: "13px",
                textAlign: "left",
                cursor: "pointer",
                fontWeight: "600",
                letterSpacing: "0.3px",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.background = "var(--c-accent-2)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              Feedback
            </button>
          </div>
        )}
      </div>

      {showHamburgerMenu && (
        <div
          onClick={closeMenu}
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

      {!onOpenFriends && (
        <Suspense fallback={null}>
          <FriendsModal
            isOpen={showFriendsModal}
            onRequestClose={() => setShowFriendsModal(false)}
          />
        </Suspense>
      )}

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

      {!onOpenChallenges && (
        <Suspense fallback={null}>
          <ChallengesModal
            isOpen={showChallengesModal}
            onRequestClose={() => setShowChallengesModal(false)}
          />
        </Suspense>
      )}

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
