import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { logError } from '../lib/errorUtils';

/**
 * Subscribe to comment notifications for the current user (replies and reactions
 * on their comments). Used for notification badge, toast, and Notifications modal.
 *
 * @param {{ uid: string } | null} user - Current auth user
 * @returns {{ commentNotifications: Array<...>; loading: boolean; removeCommentNotification: (id: string) => Promise<void> }}
 */
export function useCommentNotifications(user) {
  const [commentNotifications, setCommentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const removeCommentNotification = useCallback(
    async (id) => {
      if (!user?.uid || !id) return;
      const notifRef = ref(database, `users/${user.uid}/commentNotifications/${id}`);
      try {
        await remove(notifRef);
      } catch (err) {
        logError(err, 'useCommentNotifications.removeCommentNotification');
      }
    },
    [user?.uid]
  );

  useEffect(() => {
    if (!user?.uid) {
      setCommentNotifications([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const path = `users/${user.uid}/commentNotifications`;
    const notifRef = ref(database, path);
    const unsubscribe = onValue(
      notifRef,
      (snapshot) => {
        if (!isMounted) return;
        if (!snapshot.exists()) {
          setCommentNotifications([]);
          setLoading(false);
          return;
        }
        const raw = snapshot.val() || {};
        const list = Object.entries(raw)
          .map(([id, data]) => ({ id, ...(data || {}) }))
          .filter((n) => n.type && n.createdAt != null)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setCommentNotifications(list);
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        logError(err, 'useCommentNotifications');
        setCommentNotifications([]);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  return { commentNotifications, loading, removeCommentNotification };
}
