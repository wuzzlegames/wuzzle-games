import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../config/firebase';
import { logError } from '../lib/errorUtils';

const CHALLENGE_EXPIRY_MS = 30 * 60 * 1000;

/**
 * Hook to read and update the notification "seen" timestamp for the current user.
 * Used to compute unseen count and to mark notifications as seen when the user
 * opens the notification modal or notifications page.
 *
 * @param {{ uid: string } | null} user - Current auth user
 * @returns {{ notificationSeenAt: number | null; markNotificationsSeen: () => Promise<void>; loading: boolean }}
 */
export function useNotificationSeen(user) {
  const [notificationSeenAt, setNotificationSeenAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotificationSeenAt(null);
      setLoading(false);
      return;
    }

    const path = `users/${user.uid}/notificationSeenAt`;
    const seenRef = ref(database, path);
    const unsubscribe = onValue(seenRef, (snapshot) => {
      const val = snapshot.val();
      setNotificationSeenAt(typeof val === 'number' ? val : null);
      setLoading(false);
    }, (err) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const markNotificationsSeen = useCallback(async () => {
    if (!user?.uid) return;
    const path = `users/${user.uid}/notificationSeenAt`;
    const now = Date.now();
    setNotificationSeenAt(now);
    const seenRef = ref(database, path);
    set(seenRef, now).catch((err) => {
      logError(err, 'useNotificationSeen.markNotificationsSeen');
    });
  }, [user?.uid]);

  return { notificationSeenAt, markNotificationsSeen, loading };
}

/**
 * Get a numeric timestamp from a friend request (timestamp or sentAt).
 * @param {{ timestamp?: number; sentAt?: string }} r
 * @returns {number}
 */
function getFriendRequestTime(r) {
  if (r && typeof r.timestamp === 'number') return r.timestamp;
  if (r && r.sentAt) {
    const t = new Date(r.sentAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/**
 * Compute the number of unseen notifications for the header badge.
 * Unseen = friend requests received after seenAt + incoming challenges created after seenAt.
 * When the user opens the modal or notifications page, markNotificationsSeen() sets seenAt
 * to now, so the count goes to zero.
 *
 * @param {Array<{ id: string; fromName?: string; timestamp?: number; sentAt?: string }>} friendRequests
 * @param {Array<{ id: string; createdAt?: number }>} incomingChallenges
 * @param {number | null} notificationSeenAt
 * @returns {number}
 */
export function getUnseenNotificationCount(friendRequests, incomingChallenges, notificationSeenAt) {
  const seenAt = notificationSeenAt || 0;

  const friendCount = Array.isArray(friendRequests)
    ? friendRequests.filter((r) => getFriendRequestTime(r) > seenAt).length
    : 0;

  const challengeCount = Array.isArray(incomingChallenges)
    ? incomingChallenges.filter((c) => (c.createdAt || 0) > seenAt).length
    : 0;

  return friendCount + challengeCount;
}

/**
 * Return list of unseen notifications with id, type, and label for toasts.
 * Sorted by time descending (newest first). Same time filter as getUnseenNotificationCount.
 *
 * @param {Array<{ id: string; fromName?: string; timestamp?: number; sentAt?: string }>} friendRequests
 * @param {Array<{ id: string; createdAt?: number; fromUserName?: string }>} incomingChallenges
 * @param {number | null} notificationSeenAt
 * @returns {Array<{ id: string; type: 'friendRequest' | 'challenge'; label: string; time: number; fromUserId: string }>}
 */
export function getUnseenWithLabels(friendRequests, incomingChallenges, notificationSeenAt) {
  const seenAt = notificationSeenAt || 0;

  const friendItems = Array.isArray(friendRequests)
    ? friendRequests
        .filter((r) => getFriendRequestTime(r) > seenAt)
        .map((r) => ({
          id: r.id,
          type: 'friendRequest',
          label: `Friend request from ${r.fromName || 'Someone'}`,
          time: getFriendRequestTime(r),
          fromUserId: r.id,
        }))
    : [];

  const challengeItems = Array.isArray(incomingChallenges)
    ? incomingChallenges
        .filter((c) => (c.createdAt || 0) > seenAt)
        .map((c) => ({
          id: c.id,
          type: 'challenge',
          label: `Game invitation from ${c.fromUserName || 'Someone'}`,
          time: c.createdAt || 0,
          fromUserId: c.fromUserId,
        }))
    : [];

  return [...friendItems, ...challengeItems].sort((a, b) => b.time - a.time);
}

export { CHALLENGE_EXPIRY_MS };
