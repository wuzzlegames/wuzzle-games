import { ref, get, update } from 'firebase/database';

/**
 * Grant one or more badges to a user if they don't already have them.
 * Writes `{ earnedAt: Date.now() }` for "latest" ordering.
 * Returns the list of badge IDs that were actually granted (newly earned).
 *
 * @param {{ database: import('firebase/database').FirebaseDatabase; uid: string; badgeIds: string[] }} opts
 * @returns {Promise<string[]>} Granted badge IDs (empty if none were new).
 */
export async function grantBadges({ database, uid, badgeIds }) {
  if (!uid || !Array.isArray(badgeIds) || badgeIds.length === 0) return [];

  const unique = Array.from(new Set(badgeIds.filter(Boolean)));
  if (unique.length === 0) return [];

  const badgesRef = ref(database, `users/${uid}/badges`);
  const snap = await get(badgesRef);
  const data = snap.val() || {};

  const now = Date.now();
  const updates = {};
  const grantedIds = [];
  for (const id of unique) {
    if (data[id] != null) continue;
    updates[`users/${uid}/badges/${id}`] = { earnedAt: now };
    grantedIds.push(id);
  }

  if (Object.keys(updates).length === 0) return [];
  await update(ref(database), updates);
  return grantedIds;
}

/**
 * Grant a badge to a user if they don't already have it.
 * Writes `{ earnedAt: Date.now() }` for "latest" ordering.
 * Returns the list of badge IDs that were actually granted (length 0 or 1).
 *
 * @param {{ database: import('firebase/database').FirebaseDatabase; uid: string; badgeId: string }} opts
 * @returns {Promise<string[]>} Granted badge IDs (empty if already had badge).
 */
export async function grantBadge({ database, uid, badgeId }) {
  return grantBadges({ database, uid, badgeIds: [badgeId] });
}
