import { useState, useEffect, useRef } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../config/firebase';

const REGISTERED_BADGE_ID = 'registered';

/**
 * Fetches the user's badges from Firebase and ensures the "registered" badge
 * is granted to all signed-in users.
 *
 * @param {{ uid: string } | null} user - Current auth user
 * @returns {{ userBadges: Record<string, boolean>; loading: boolean; error: string | null }}
 */
export function useUserBadges(user) {
  const [userBadges, setUserBadges] = useState(/** @type {Record<string, boolean>} */ ({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const ensuredRegisteredRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) {
      setUserBadges({});
      setLoading(false);
      setError(null);
      ensuredRegisteredRef.current = false;
      return;
    }

    let isMounted = true;

    async function loadAndEnsureBadges() {
      setLoading(true);
      setError(null);
      try {
        const badgesRef = ref(database, `users/${user.uid}/badges`);
        const snap = await get(badgesRef);
        const data = (snap.val() || {});
        const badges = typeof data === 'object' && !Array.isArray(data) ? data : {};

        const hasRegistered = badges[REGISTERED_BADGE_ID] === true || badges[REGISTERED_BADGE_ID] != null;
        if (!hasRegistered && !ensuredRegisteredRef.current) {
          ensuredRegisteredRef.current = true;
          await set(badgesRef, { ...badges, [REGISTERED_BADGE_ID]: true });
          setUserBadges({ ...badges, [REGISTERED_BADGE_ID]: true });
        } else {
          setUserBadges(badges);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Failed to load badges');
          setUserBadges({});
        }
      } finally {
        setLoading(false);
      }
    }

    loadAndEnsureBadges();
    return () => { isMounted = false; };
  }, [user?.uid]);

  return { userBadges, loading, error };
}

/**
 * Fetches badges for a given user (e.g. another player). Read-only, no "ensure" logic.
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
        setUserBadges(badges);
      })
      .catch(() => {
        if (isMounted) setUserBadges({});
      })
      .finally(() => {
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [uid]);

  return { userBadges, loading };
}
