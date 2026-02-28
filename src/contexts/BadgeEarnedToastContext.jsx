import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const MAX_RECENT_BADGE_EARNINGS = 20;

/**
 * When the user earns a badge, call showBadgeEarned(badgeDef) to show a toast
 * with the badge icon, description, and "View all badges in profile" CTA.
 * Also appends to recentBadgeEarnings so the notifications modal can show it
 * with Dismiss and View badges.
 * Hooks (useAuth, useSubscription, useMultiplayerGame) can call setBadgeEarnedToastRef
 * so that badgeService or grant call sites can trigger the toast via the ref.
 */
export const BadgeEarnedToastContext = createContext(null);

/** Module-level ref so hooks can trigger badge earned toast without context. */
export const badgeEarnedToastRef = { current: null };

export function BadgeEarnedToastProvider({ children }) {
  const [badge, setBadge] = useState(null);
  const [recentBadgeEarnings, setRecentBadgeEarnings] = useState([]);

  const showBadgeEarned = useCallback((badgeDef) => {
    if (badgeDef && badgeDef.id && badgeDef.name) {
      setBadge(badgeDef);
      const id = `${badgeDef.id}-${Date.now()}`;
      const earnedAt = Date.now();
      setRecentBadgeEarnings((prev) => {
        // Don't add duplicate - user can only earn a badge once
        if (prev.some((item) => item.badgeDef.id === badgeDef.id)) {
          return prev;
        }
        const next = [...prev, { id, badgeDef, earnedAt }];
        if (next.length > MAX_RECENT_BADGE_EARNINGS) {
          return next.slice(-MAX_RECENT_BADGE_EARNINGS);
        }
        return next;
      });
    }
  }, []);

  const clearBadgeEarned = useCallback(() => setBadge(null), []);

  const dismissBadgeEarnedNotification = useCallback((notificationId) => {
    setRecentBadgeEarnings((prev) => prev.filter((item) => item.id !== notificationId));
  }, []);

  const dismissAllBadgeNotifications = useCallback(() => {
    setRecentBadgeEarnings([]);
  }, []);

  useEffect(() => {
    badgeEarnedToastRef.current = showBadgeEarned;
    return () => { badgeEarnedToastRef.current = null; };
  }, [showBadgeEarned]);

  const value = {
    badgeEarnedToast: badge,
    showBadgeEarned,
    clearBadgeEarned,
    recentBadgeEarnings,
    dismissBadgeEarnedNotification,
    dismissAllBadgeNotifications,
  };

  return (
    <BadgeEarnedToastContext.Provider value={value}>
      {children}
    </BadgeEarnedToastContext.Provider>
  );
}

export function useBadgeEarnedToast() {
  return useContext(BadgeEarnedToastContext);
}
