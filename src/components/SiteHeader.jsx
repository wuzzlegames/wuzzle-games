import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import logoImage from "../../images/logo.png";
import { useUserBadges, useBadgesForUser } from "../hooks/useUserBadges";
import { useSubscription } from "../hooks/useSubscription";
import { useDailyResetTimer } from "../hooks/useDailyResetTimer";
import { useNotificationSeen, getUnseenNotificationCount, getUnseenWithLabels } from "../hooks/useNotificationSeen";
import { getAllEarnedSorted } from "../lib/badges";
import AuthModal from "./AuthModal";
import SubscribeModal from "./SubscribeModal";
import HamburgerMenu from "./HamburgerMenu";
import UserCard from "./UserCard";
import NotificationsModal from "./NotificationsModal";
import NotificationToast from "./NotificationToast";

// Persist across SiteHeader unmount/remount (navigation) so we don't re-toast on every page change
const baselineIdsRef = { current: new Set() };
const toastedIdsRef = { current: new Set() };
const prevPathnameRef = { current: "" };
const prevUidRef = { current: null };
const lastEntryTimeRef = { current: 0 };
const BACKFILL_WINDOW_MS = 3000;

/**
 * Global site header used across all pages.
 *
 * Layout:
 * Line 1 - WUZZLE GAMES centered, hamburger icon on the right.
 * Line 2 - "Reset in" text on the left, Sign in/Sign out and Leaderboard buttons on the right.
 * Line 3 (when signed in) - UserCard only; click navigates to profile.
 */
export default function SiteHeader({ onOpenFeedback, onSignUpComplete, onHomeClick }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, signOut, friendRequests, incomingChallenges, isVerifiedUser } = useAuth();
  const { userBadges } = useUserBadges(user);
  const { notificationSeenAt, markNotificationsSeen } = useNotificationSeen(user);
  const { showSubscriptionGate, isSubscribed } = useSubscription(user);
  const earnedBadges = getAllEarnedSorted(userBadges);
  const isPremium = isSubscribed || (userBadges && !!userBadges['premium_member']);
  const resetTime = useDailyResetTimer();
  const unseenCount = getUnseenNotificationCount(friendRequests || [], incomingChallenges || [], notificationSeenAt);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationToast, setNotificationToast] = useState(null);
  const toastFromUid = notificationToast
    ? (notificationToast.type === "friendRequest"
        ? notificationToast.id
        : (notificationToast.fromUserId || null))
    : null;
  const { userBadges: toastUserBadges } = useBadgesForUser(toastFromUid);
  const toastPrimaryBadge = notificationToast && toastFromUid
    ? (getAllEarnedSorted(toastUserBadges)[0] ?? null)
    : null;

  // Effect 1: set baseline on "entry" (login or navigation) so we don't toast for pre-existing unseen notifications
  useEffect(() => {
    const unseenList = getUnseenWithLabels(friendRequests || [], incomingChallenges || [], notificationSeenAt);
    const pathOrUserChanged = pathname !== prevPathnameRef.current || user?.uid !== prevUidRef.current;
    if (pathOrUserChanged) {
      prevPathnameRef.current = pathname;
      prevUidRef.current = user?.uid ?? null;
      baselineIdsRef.current = new Set(unseenList.map((i) => i.id));
      lastEntryTimeRef.current = Date.now();
    } else if (
      user?.uid != null &&
      baselineIdsRef.current.size === 0 &&
      (prevUidRef.current != null || prevPathnameRef.current !== "") &&
      Date.now() - lastEntryTimeRef.current < BACKFILL_WINDOW_MS
    ) {
      // Data loaded after login (within window); baseline was set empty, so set it now so we don't toast for pre-existing unseen
      baselineIdsRef.current = new Set(unseenList.map((i) => i.id));
    }
  }, [pathname, user?.uid, friendRequests, incomingChallenges, notificationSeenAt]);

  // Effect 2: show toast only for notifications that arrived while user is on page (id not in baseline)
  useEffect(() => {
    if (notificationToast) return;
    const unseenList = getUnseenWithLabels(friendRequests || [], incomingChallenges || [], notificationSeenAt);
    const candidate = unseenList.find(
      (item) => !baselineIdsRef.current.has(item.id) && !toastedIdsRef.current.has(item.id)
    );
    if (candidate) {
      toastedIdsRef.current.add(candidate.id);
      setNotificationToast(candidate);
    }
  }, [friendRequests, incomingChallenges, notificationSeenAt, notificationToast]);

  const handleOpenAuth = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  const handleLeaderboard = useCallback(() => {
    navigate("/leaderboard");
  }, [navigate]);

  const handleHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (e) {
      // Best-effort; avoid breaking header on sign-out failure.
      console.error("Failed to sign out", e);
    }
  }, [signOut]);

  const handleOpenSubscribe = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setShowSubscribeModal(true);
    }
  }, [user]);

  const handleCloseSubscribe = useCallback(() => {
    setShowSubscribeModal(false);
  }, []);

  const handleSubscriptionComplete = useCallback(() => {
    setShowSubscribeModal(false);
    // Optionally show a success message or navigate
  }, []);

  const handleToastDismiss = useCallback(() => setNotificationToast(null), []);
  const handleToastClick = useCallback(() => {
    setShowNotificationsModal(true);
    setNotificationToast(null);
  }, []);

  return (
    <>
      <header
        style={{
          padding: "10px 16px 8px",
          borderBottom: "1px solid #3A3A3C",
          backgroundColor: "#212121",
          marginBottom: "12px",
        }}
      >
        {/* Line 1: centered title with hamburger on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onHomeClick ?? handleHome}
            aria-label="Home"
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              border: "1px solid #3A3A3C",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 10.5L12 3L20 10.5V20H14V14H10V20H4V10.5Z"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            style={{
              flex: 1,
              textAlign: "center",
            }}
          >
            <img
              src={logoImage}
              alt="Wuzzle Games"
              style={{ height: 50 }}
            />
          </div>

          <div className="flexRow justifyEnd" style={{ alignItems: "center", gap: 8, minWidth: 32 }}>
            {user && (
              <button
                type="button"
                onClick={() => {
                  markNotificationsSeen();
                  setShowNotificationsModal(true);
                }}
                aria-label={unseenCount > 0 ? `Notifications, ${unseenCount} unread` : "Notifications"}
                style={{
                  position: "relative",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                  border: "1px solid #3A3A3C",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden
                >
                  <path
                    d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                    fill="#ffffff"
                  />
                </svg>
                {unseenCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#ED2939",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {unseenCount > 99 ? "99+" : unseenCount}
                  </span>
                )}
              </button>
            )}
            <HamburgerMenu
              onOpenFeedback={onOpenFeedback || (() => {})}
              onSignUpComplete={onSignUpComplete}
            />
          </div>
        </div>

        {/* Line 2: reset timer on left, auth + leaderboard on right */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "#d7dadc",
              whiteSpace: "nowrap",
            }}
          >
            Reset in: {resetTime}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              className="homeBtn homeBtnOutline"
              onClick={handleLeaderboard}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Leaderboard
            </button>

            {user ? (
              <button
                type="button"
                className="homeBtn homeBtnOutline"
                onClick={handleSignOut}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                className="homeBtn homeBtnOutline"
                onClick={handleOpenAuth}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Line 3: Signed in as + UserCard when signed in; click card → profile */}
        {user && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, color: "#d7dadc" }}>Signed in as</span>
            <UserCard
              username={user.displayName || user.email || "Unknown user"}
              onClick={() => navigate("/profile")}
              size="sm"
              earnedBadges={earnedBadges}
              isPremium={isPremium}
            />
            {showSubscriptionGate && (
              <button
                type="button"
                className="homeBtn"
                onClick={handleOpenSubscribe}
                style={{
                  padding: "4px 12px",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  background: "#e56b6f",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Subscribe
              </button>
            )}
          </div>
        )}
      </header>

      <AuthModal
        isOpen={showAuthModal}
        onRequestClose={handleCloseAuth}
        onSignUpComplete={onSignUpComplete}
      />

      <SubscribeModal
        isOpen={showSubscribeModal}
        onRequestClose={handleCloseSubscribe}
        onSubscriptionComplete={handleSubscriptionComplete}
      />

      <NotificationsModal
        isOpen={showNotificationsModal}
        onRequestClose={() => setShowNotificationsModal(false)}
      />

      {notificationToast && (
        <NotificationToast
          message={notificationToast.label}
          badge={toastPrimaryBadge}
          onClick={handleToastClick}
          onDismiss={handleToastDismiss}
        />
      )}
    </>
  );
}
