import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * When the user earns a badge, call showBadgeEarned(badgeDef) to show a toast
 * with the badge icon, description, and "View all badges in profile" CTA.
 * Hooks (useAuth, useSubscription, useMultiplayerGame) can call setBadgeEarnedToastRef
 * so that badgeService or grant call sites can trigger the toast via the ref.
 */
export const BadgeEarnedToastContext = createContext(null);

/** Module-level ref so hooks can trigger badge earned toast without context. */
export const badgeEarnedToastRef = { current: null };

export function BadgeEarnedToastProvider({ children }) {
  const [badge, setBadge] = useState(null);
  const showBadgeEarned = useCallback((badgeDef) => {
    if (badgeDef && badgeDef.id && badgeDef.name) {
      setBadge(badgeDef);
    }
  }, []);
  const clearBadgeEarned = useCallback(() => setBadge(null), []);
  useEffect(() => {
    badgeEarnedToastRef.current = showBadgeEarned;
    return () => { badgeEarnedToastRef.current = null; };
  }, [showBadgeEarned]);
  const value = { badgeEarnedToast: badge, showBadgeEarned, clearBadgeEarned };
  return (
    <BadgeEarnedToastContext.Provider value={value}>
      {children}
    </BadgeEarnedToastContext.Provider>
  );
}

export function useBadgeEarnedToast() {
  return useContext(BadgeEarnedToastContext);
}
