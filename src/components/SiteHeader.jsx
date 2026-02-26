import React, { useState, useCallback, useEffect, Suspense, lazy } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUserBadges, useBadgesForUser } from "../hooks/useUserBadges";
import { useSubscription } from "../hooks/useSubscription";
import { isSubscriptionAllowed } from "../lib/subscriptionConfig";
import { useDailyResetTimer } from "../hooks/useDailyResetTimer";
import { useNotificationSeen, getUnseenNotificationCount, getUnseenWithLabels } from "../hooks/useNotificationSeen";
import { getAllEarnedSorted } from "../lib/badges";
import AuthModal from "./AuthModal";
import SubscribeModal from "./SubscribeModal";
import HamburgerMenu from "./HamburgerMenu";
import UserCard from "./UserCard";
import NotificationsModal from "./NotificationsModal";
import NotificationToast from "./NotificationToast";
import { HeaderIcon, HEADER_ICON_SIZE, HEADER_SLOT_WIDTH } from "./HeaderIcon";
import ChallengesModal from "./ChallengesModal";
import { useBadgeEarnedToast } from "../contexts/BadgeEarnedToastContext";

const FriendsModal = lazy(() => import("./FriendsModal"));

function LogoImage() {
  const [useFallback, setUseFallback] = useState(false);
  if (useFallback) {
    return (
      <HeaderIcon name="logo" alt="Wuzzle Games" size={50} />
    );
  }
  return (
    <img
      src="/images/logo.png"
      alt="Wuzzle Games"
      style={{ height: 50, display: "block" }}
      onError={() => setUseFallback(true)}
    />
  );
}

// Persist across SiteHeader unmount/remount (navigation) so we don't re-toast on every page change
const baselineIdsRef = { current: new Set() };
const toastedIdsRef = { current: new Set() };
const prevPathnameRef = { current: "" };
const prevUidRef = { current: null };
const lastEntryTimeRef = { current: 0 };
const BACKFILL_WINDOW_MS = 3000;

const iconButtonStyle = {
  width: HEADER_SLOT_WIDTH,
  height: HEADER_ICON_SIZE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

/**
 * Global site header used across all pages.
 *
 * Layout:
 * Line 1 - Logo (left, click = home); Leaderboard, Notifications, Hamburger icons (right).
 * Line 2 - "Reset in" (left); Sign in icon (guest) or Friends, Challenges, Sign out icons (signed in) on right.
 * Line 3 (when signed in) - Signed in as + UserCard + Subscribe.
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
  const badgeEarnedContext = useBadgeEarnedToast();
  const badgeEarnedToast = badgeEarnedContext?.badgeEarnedToast;
  const clearBadgeEarned = badgeEarnedContext?.clearBadgeEarned;
  const recentBadgeEarnings = badgeEarnedContext?.recentBadgeEarnings ?? [];
  const unseenCount =
    getUnseenNotificationCount(friendRequests || [], incomingChallenges || [], notificationSeenAt) +
    recentBadgeEarnings.length;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
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

  const handleOpenFriends = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!isVerifiedUser) {
      alert('Verify your email or sign in with Google to use friends.');
      return;
    }
    setShowFriendsModal(true);
  }, [user, isVerifiedUser]);

  const handleOpenChallenges = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!isVerifiedUser) {
      alert('Verify your email or sign in with Google to use challenges.');
      return;
    }
    setShowChallengesModal(true);
  }, [user, isVerifiedUser]);

  return (
    <>
      <header
        style={{
          padding: "10px 16px 8px",
          borderBottom: "1px solid var(--c-border)",
          backgroundColor: "var(--c-bg)",
          marginBottom: "12px",
        }}
      >
        {/* Line 1: logo left (click = home), right: leaderboard, notifications, hamburger icons */}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <LogoImage />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: HEADER_SLOT_WIDTH * 3,
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={handleLeaderboard}
              aria-label="Leaderboard"
              style={{ ...iconButtonStyle, position: "relative" }}
            >
              <HeaderIcon name="leaderboard" size={HEADER_ICON_SIZE} />
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  markNotificationsSeen();
                  setShowNotificationsModal(true);
                }}
                aria-label={unseenCount > 0 ? `Notifications, ${unseenCount} unread` : "Notifications"}
                style={{ ...iconButtonStyle, position: "relative" }}
              >
                <HeaderIcon name="notifications" size={HEADER_ICON_SIZE} />
                {unseenCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "var(--c-error)",
                      color: "var(--c-text-strong)",
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
            ) : (
              <span style={{ width: HEADER_SLOT_WIDTH, height: HEADER_ICON_SIZE, flexShrink: 0 }} aria-hidden />
            )}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setHamburgerOpen(!hamburgerOpen)}
                aria-label="Menu"
                style={iconButtonStyle}
              >
                <HeaderIcon name="hamburger" size={HEADER_ICON_SIZE} />
              </button>
              <HamburgerMenu
                open={hamburgerOpen}
                onOpenChange={setHamburgerOpen}
                onOpenFeedback={onOpenFeedback || (() => {})}
                onSignUpComplete={onSignUpComplete}
                onOpenFriends={() => setShowFriendsModal(true)}
                onOpenChallenges={() => setShowChallengesModal(true)}
              />
            </div>
          </div>
        </div>

        {/* Line 2: Reset in on left, sign-in or friends/challenges/sign-out icons on right */}
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
              color: "var(--c-text)",
              whiteSpace: "nowrap",
            }}
          >
            Reset in: {resetTime}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: HEADER_SLOT_WIDTH * 3,
              justifyContent: "flex-end",
            }}
          >
            {user ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenFriends}
                  aria-label="Friends"
                  style={iconButtonStyle}
                >
                  <HeaderIcon name="friends" size={HEADER_ICON_SIZE} />
                </button>
                <button
                  type="button"
                  onClick={handleOpenChallenges}
                  aria-label="Challenges"
                  style={iconButtonStyle}
                >
                  <HeaderIcon name="challenges" size={HEADER_ICON_SIZE} />
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  style={iconButtonStyle}
                >
                  <HeaderIcon name="sign-out" size={HEADER_ICON_SIZE} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenAuth}
                aria-label="Sign in"
                style={iconButtonStyle}
              >
                <HeaderIcon name="sign-in" size={HEADER_ICON_SIZE} />
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
            <span style={{ fontSize: 12, color: "var(--c-text)" }}>Signed in as</span>
            <UserCard
              username={user.displayName || user.email || "Unknown user"}
              onClick={() => navigate("/profile")}
              size="sm"
              earnedBadges={earnedBadges}
              isPremium={isSubscriptionAllowed && isPremium}
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
                  background: "var(--c-accent-1)",
                  color: "var(--c-text-strong)",
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

      <Suspense fallback={null}>
        <FriendsModal
          isOpen={showFriendsModal}
          onRequestClose={() => setShowFriendsModal(false)}
        />
      </Suspense>

      <ChallengesModal
        isOpen={showChallengesModal}
        onRequestClose={() => setShowChallengesModal(false)}
      />

      {badgeEarnedToast && clearBadgeEarned && (
        <NotificationToast
          message={badgeEarnedToast.description}
          badge={badgeEarnedToast}
          ctaText="View all badges in profile"
          onClick={() => {
            clearBadgeEarned();
            navigate("/profile", { state: { openYourBadges: true } });
          }}
          onDismiss={clearBadgeEarned}
        />
      )}
      {notificationToast && !badgeEarnedToast && (
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
