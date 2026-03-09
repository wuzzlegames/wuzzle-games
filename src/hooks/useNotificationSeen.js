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

    let isMounted = true;
    const path = `users/${user.uid}/notificationSeenAt`;
    const seenRef = ref(database, path);
    const unsubscribe = onValue(seenRef, (snapshot) => {
      if (!isMounted) return;
      const val = snapshot.val();
      setNotificationSeenAt(typeof val === 'number' ? val : null);
      setLoading(false);
    }, (err) => {
      if (!isMounted) return;
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
 * Unseen = friend requests received after seenAt + incoming challenges created after seenAt
 * + comment notifications (replies/reactions) after seenAt.
 * When the user opens the modal or notifications page, markNotificationsSeen() sets seenAt
 * to now, so the count goes to zero.
 *
 * @param {Array<{ id: string; fromName?: string; timestamp?: number; sentAt?: string }>} friendRequests
 * @param {Array<{ id: string; createdAt?: number }>} incomingChallenges
 * @param {number | null} notificationSeenAt
 * @param {Array<{ createdAt?: number }>} [commentNotifications]
 * @returns {number}
 */
export function getUnseenNotificationCount(friendRequests, incomingChallenges, notificationSeenAt, commentNotifications) {
  const seenAt = notificationSeenAt || 0;

  const friendCount = Array.isArray(friendRequests)
    ? friendRequests.filter((r) => getFriendRequestTime(r) > seenAt).length
    : 0;

  const challengeCount = Array.isArray(incomingChallenges)
    ? incomingChallenges.filter((c) => (c.createdAt || 0) > seenAt).length
    : 0;

  const commentCount = Array.isArray(commentNotifications)
    ? commentNotifications.filter((n) => (n.createdAt || 0) > seenAt).length
    : 0;

  return friendCount + challengeCount + commentCount;
}

/**
 * Return list of unseen notifications with id, type, and label for toasts.
 * Sorted by time descending (newest first). Same time filter as getUnseenNotificationCount.
 *
 * @param {Array<{ id: string; fromName?: string; timestamp?: number; sentAt?: string }>} friendRequests
 * @param {Array<{ id: string; createdAt?: number; fromUserName?: string }>} incomingChallenges
 * @param {number | null} notificationSeenAt
 * @param {Array<{ id: string; type?: string; fromUid?: string; fromUsername?: string; createdAt?: number; emoji?: string }>} [commentNotifications]
 * @returns {Array<{ id: string; type: 'friendRequest' | 'challenge' | 'commentReply' | 'commentReaction'; label: string; time: number; fromUserId: string }>}
 */
export function getUnseenWithLabels(friendRequests, incomingChallenges, notificationSeenAt, commentNotifications) {
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

  const commentItems = Array.isArray(commentNotifications)
    ? commentNotifications
        .filter((n) => (n.createdAt || 0) > seenAt)
        .map((n) => {
          const fromUsername = n.fromUsername || 'Someone';
          const label =
            n.type === 'reply'
              ? `${fromUsername} replied to your comment`
              : `${fromUsername} reacted ${n.emoji || ''} to your comment`.trim();
          return {
            id: n.id,
            type: n.type === 'reply' ? 'commentReply' : 'commentReaction',
            label,
            time: n.createdAt || 0,
            fromUserId: n.fromUid || '',
          };
        })
    : [];

  return [...friendItems, ...challengeItems, ...commentItems].sort((a, b) => b.time - a.time);
}

export { CHALLENGE_EXPIRY_MS };
