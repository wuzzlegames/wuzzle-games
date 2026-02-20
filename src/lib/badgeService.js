import { ref, get, update } from 'firebase/database';

/**
 * Grant one or more badges to a user if they don't already have them.
 * Writes `{ earnedAt: Date.now() }` for "latest" ordering.
 *
 * @param {{ database: import('firebase/database').FirebaseDatabase; uid: string; badgeIds: string[] }} opts
 */
export async function grantBadges({ database, uid, badgeIds }) {
  if (!uid || !Array.isArray(badgeIds) || badgeIds.length === 0) return;

  const unique = Array.from(new Set(badgeIds.filter(Boolean)));
  if (unique.length === 0) return;

  const badgesRef = ref(database, `users/${uid}/badges`);
  const snap = await get(badgesRef);
  const data = snap.val() || {};

  const now = Date.now();
  const updates = {};
  for (const id of unique) {
    if (data[id] != null) continue;
    updates[`users/${uid}/badges/${id}`] = { earnedAt: now };
  }

  if (Object.keys(updates).length === 0) return;
  await update(ref(database), updates);
}

/**
 * Grant a badge to a user if they don't already have it.
 * Writes `{ earnedAt: Date.now() }` for "latest" ordering.
 *
 * @param {{ database: import('firebase/database').FirebaseDatabase; uid: string; badgeId: string }} opts
 */
export async function grantBadge({ database, uid, badgeId }) {
  return grantBadges({ database, uid, badgeIds: [badgeId] });
}
