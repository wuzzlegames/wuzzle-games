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
    id: 'wuzzle_games_member',
    name: 'Wuzzle Games Member',
    description: 'Earn this badge by creating an account and joining the Wuzzle games community.',
  },
  {
    id: 'first_solve',
    name: 'First Solve',
    description: 'Earn this badge by solving any Wuzzle Games puzzle for the first time.',
  },
  {
    id: 'speedrun_beginner',
    name: 'Speedrun Beginner',
    description: 'Earn this badge by completing any Speedrun puzzle for the first time.',
  },
  {
    id: 'multiboard_starter',
    name: 'Multiboard Starter',
    description: 'Earn this badge by winning a Wuzzle Games puzzle with at least 2 boards.',
  },
  {
    id: 'party_starter',
    name: 'Party Starter',
    description: 'Earn this badge by creating a multiplayer room for the first time.',
  },
  {
    id: 'personal_best',
    name: 'Personal Best',
    description: 'Earn this badge by beating your personal best time in any Speedrun puzzle.',
  },
  // Streak badges (10 → 20 → 50 → 100)
  {
    id: 'daily_standard_hot_streak',
    name: 'Daily Standard Hot Streak',
    description: 'Earn this badge by winning 10 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_speedrun_hot_streak',
    name: 'Daily Speedrun Hot Streak',
    description: 'Earn this badge by winning 10 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'marathon_standard_hot_streak',
    name: 'Marathon Standard Hot Streak',
    description: 'Earn this badge by winning 10 Marathon Standard puzzles in a row.',
  },
  {
    id: 'marathon_speedrun_hot_streak',
    name: 'Marathon Speedrun Hot Streak',
    description: 'Earn this badge by winning 10 Marathon Speedrun puzzles in a row.',
  },
  {
    id: 'daily_standard_wildfire_streak',
    name: 'Daily Standard Wildfire Streak',
    description: 'Earn this badge by winning 20 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_speedrun_wildfire_streak',
    name: 'Daily Speedrun Wildfire Streak',
    description: 'Earn this badge by winning 20 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'marathon_standard_wildfire_streak',
    name: 'Marathon Standard Wildfire Streak',
    description: 'Earn this badge by winning 20 Marathon Standard puzzles in a row.',
  },
  {
    id: 'marathon_speedrun_wildfire_streak',
    name: 'Marathon Speedrun Wildfire Streak',
    description: 'Earn this badge by winning 20 Marathon Speedrun puzzles in a row.',
  },
  {
    id: 'daily_standard_legendary_streak',
    name: 'Daily Standard Legendary Streak',
    description: 'Earn this badge by winning 50 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_speedrun_legendary_streak',
    name: 'Daily Speedrun Legendary Streak',
    description: 'Earn this badge by winning 50 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'marathon_standard_legendary_streak',
    name: 'Marathon Standard Legendary Streak',
    description: 'Earn this badge by winning 50 Marathon Standard puzzles in a row.',
  },
  {
    id: 'marathon_speedrun_legendary_streak',
    name: 'Marathon Speedrun Legendary Streak',
    description: 'Earn this badge by winning 50 Marathon Speedrun puzzles in a row.',
  },
  {
    id: 'daily_standard_century_streak',
    name: 'Daily Standard Century Streak',
    description: 'Earn this badge by winning 100 Daily Standard puzzles in a row.',
  },
  {
    id: 'daily_speedrun_century_streak',
    name: 'Daily Speedrun Century Streak',
    description: 'Earn this badge by winning 100 Daily Speedrun puzzles in a row.',
  },
  {
    id: 'marathon_standard_century_streak',
    name: 'Marathon Standard Century Streak',
    description: 'Earn this badge by winning 100 Marathon Standard puzzles in a row.',
  },
  {
    id: 'marathon_speedrun_century_streak',
    name: 'Marathon Speedrun Century Streak',
    description: 'Earn this badge by winning 100 Marathon Speedrun puzzles in a row.',
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
