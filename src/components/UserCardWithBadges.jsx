import React from "react";
import { useBadgesForUser } from "../hooks/useUserBadges";
import { getAllEarnedSorted } from "../lib/badges";
import UserCard from "./UserCard";

const PREMIUM_BADGE_ID = 'premium_member';

/**
 * UserCard that fetches and displays earned badges for a user.
 * Use when you have a userId (e.g. in multiplayer, leaderboard, friends).
 * Pass through all UserCard props; earnedBadges are derived from users/{uid}/badges.
 * Automatically sets isPremium if user has the premium_member badge.
 */
export default function UserCardWithBadges({ userId, ...userCardProps }) {
  const { userBadges, loading } = useBadgesForUser(userId || null);
  const earnedBadges = loading ? [] : getAllEarnedSorted(userBadges);
  const isPremium = !loading && userBadges && !!userBadges[PREMIUM_BADGE_ID];

  return <UserCard {...userCardProps} earnedBadges={earnedBadges} isPremium={isPremium} />;
}
