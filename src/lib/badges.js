/**
 * Badge definitions and helpers for the Wuzzle Games badge system.
 * Badges are stored per-user under users/{uid}/badges in Firebase.
 * Value can be `true` or `{ earnedAt: number }` for "latest" ordering.
 */

/** @typedef {{ id: string; name: string; description: string }} BadgeDef */

/**
 * All badges that exist in the game.
 * @type {BadgeDef[]}
 */
export const ALL_BADGES = [
  {
    id: 'registered',
    name: 'Wuzzle Games Member',
    description: 'Earned by creating an account and joining the community. Welcome to Wuzzle Games!',
  },
  {
    id: 'daily_player',
    name: 'Daily Player',
    description: 'Earned by completing at least one game of Daily Wuzzle Games.',
  },
  {
    id: 'premium_member',
    name: 'Premium Member',
    description: 'Unlocked by subscribing to Wuzzle Games Premium. Access to themed wordles, custom colors, and more!',
  },
  {
    id: 'party_starter',
    name: 'Party starter',
    description: 'Earn this badge by creating a multiplayer room for the first time.',
  },
];

/**
 * @param {string} id
 * @returns {BadgeDef | undefined}
 */
export function getBadgeById(id) {
  return ALL_BADGES.find((b) => b.id === id);
}

/**
 * @param {Record<string, unknown>} userBadges - e.g. { registered: true, daily_player: { earnedAt: 123 } }
 * @returns {BadgeDef[]}
 */
export function getEarnedBadgeDefs(userBadges) {
  if (!userBadges || typeof userBadges !== 'object') return [];
  return ALL_BADGES.filter((b) => userBadges[b.id] === true || userBadges[b.id] != null);
}

/**
 * Extract earnedAt for sorting. `true` → 0 (oldest), `{ earnedAt }` → earnedAt.
 * @param {unknown} val
 * @returns {number}
 */
export function getEarnedAt(val) {
  if (val === true) return 0;
  if (val && typeof val === 'object' && typeof (/** @type {{ earnedAt?: number }} */ (val).earnedAt) === 'number') {
    return (/** @type {{ earnedAt: number }} */ (val)).earnedAt;
  }
  return 0;
}

/**
 * @param {Record<string, unknown>} userBadges
 * @returns {BadgeDef | null} Latest earned badge (most recent earnedAt), or first in ALL_BADGES order if tie.
 */
export function getLatestEarnedBadgeDef(userBadges) {
  const earned = getEarnedBadgeDefs(userBadges);
  if (earned.length === 0) return null;
  const withTime = earned.map((b) => ({ def: b, t: getEarnedAt(userBadges[b.id]) }));
  withTime.sort((a, b) => b.t - a.t);
  return withTime[0].def;
}

/**
 * @param {Record<string, unknown>} userBadges
 * @returns {BadgeDef[]} All earned badges sorted by earnedAt desc (latest first).
 */
export function getAllEarnedSorted(userBadges) {
  const earned = getEarnedBadgeDefs(userBadges);
  const withTime = earned.map((b) => ({ def: b, t: getEarnedAt(userBadges[b.id]) }));
  withTime.sort((a, b) => b.t - a.t);
  return withTime.map((x) => x.def);
}
