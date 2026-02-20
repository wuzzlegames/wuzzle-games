import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from '../config/firebase';

/**
 * Fetches the signed-in user's badges from Firebase.
 *
 * @param {{ uid: string } | null} user - Current auth user
 * @returns {{ userBadges: Record<string, unknown>; loading: boolean; error: string | null }}
 */
export function useUserBadges(user) {
  const [userBadges, setUserBadges] = useState(/** @type {Record<string, unknown>} */ ({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    if (!user?.uid) {
      setUserBadges({});
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    async function loadBadges() {
      setLoading(true);
      setError(null);
      try {
        const badgesRef = ref(database, `users/${user.uid}/badges`);
        const snap = await get(badgesRef);
        const data = snap.val() || {};
        const badges = typeof data === 'object' && !Array.isArray(data) ? data : {};
        if (isMounted) setUserBadges(badges);
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load badges');
          setUserBadges({});
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBadges();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  return { userBadges, loading, error };
}

/**
 * Fetches badges for a given user (e.g. another player). Read-only.
 * Requires Firebase rules to allow reading users/{uid}/badges when auth != null.
 *
 * @param {string | null} uid - User ID to fetch badges for
 * @returns {{ userBadges: Record<string, unknown>; loading: boolean }}
 */
export function useBadgesForUser(uid) {
  const [userBadges, setUserBadges] = useState(/** @type {Record<string, unknown>} */ ({}));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setUserBadges({});
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    get(ref(database, `users/${uid}/badges`))
      .then((snap) => {
        const data = snap.val() || {};
        const badges = typeof data === 'object' && !Array.isArray(data) ? data : {};
        if (isMounted) setUserBadges(badges);
      })
      .catch(() => {
        if (isMounted) setUserBadges({});
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [uid]);

  return { userBadges, loading };
}
