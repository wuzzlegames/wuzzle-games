import { ref, get, update } from 'firebase/database';

/**
 * Grant a badge to a user if they don't already have it.
 * Writes `{ earnedAt: Date.now() }` for "latest" ordering.
 *
 * @param {{ database: import('firebase/database').FirebaseDatabase; uid: string; badgeId: string }} opts
 */
export async function grantBadge({ database, uid, badgeId }) {
  if (!uid || !badgeId) return;
  const badgesRef = ref(database, `users/${uid}/badges`);
  const snap = await get(badgesRef);
  const data = snap.val() || {};
  if (data[badgeId] != null) return;
  const updates = { [`users/${uid}/badges/${badgeId}`]: { earnedAt: Date.now() } };
  await update(ref(database), updates);
}
