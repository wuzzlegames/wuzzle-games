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
    id: 'premium_member',
    name: 'Premium Member',
    description: 'Earn this badge by subscribing to Wuzzle Games Premium.',
  },
  {
    id: 'first_solve',
    name: 'First solve',
    description: 'Earn this badge by solving any Wuzzle Games puzzle for the first time.',
  },
  {
    id: 'speedrun_beginner',
    name: 'Speedrun beginner',
    description: 'Earn this badge by completing any Speedrun puzzle for the first time.',
  },
  {
    id: 'multiboard_starter',
    name: 'Multiboard starter',
    description: 'Earn this badge by winning a Wuzzle Games puzzle with at least 2 boards.',
  },
  {
    id: 'daily_standard_hot_streak',
    name: 'Daily Standard Hot streak',
    description: 'Earn this badge by winning 10 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_standard_wildfire_streak',
    name: 'Daily Standard Wildfire streak',
    description: 'Earn this badge by winning 20 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_standard_legendary_streak',
    name: 'Daily Standard Legendary streak',
    description: 'Earn this badge by winning 50 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_standard_century_streak',
    name: 'Daily Standard Century streak',
    description: 'Earn this badge by winning 100 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_speedrun_hot_streak',
    name: 'Daily Speedrun Hot streak',
    description: 'Earn this badge by winning 10 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'daily_speedrun_wildfire_streak',
    name: 'Daily Speedrun Wildfire streak',
    description: 'Earn this badge by winning 20 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'daily_speedrun_legendary_streak',
    name: 'Daily Speedrun Legendary streak',
    description: 'Earn this badge by winning 50 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'daily_speedrun_century_streak',
    name: 'Daily Speedrun Century streak',
    description: 'Earn this badge by winning 100 Daily Speedrun puzzles in a row.',
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
