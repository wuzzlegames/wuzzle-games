import React from "react";
import { useBadgesForUser } from "../hooks/useUserBadges";
import { getAllEarnedSorted } from "../lib/badges";
import UserCard from "./UserCard";

/**
 * UserCard that fetches and displays earned badges for a user.
 * Use when you have a userId (e.g. in multiplayer, leaderboard, friends).
 * Pass through all UserCard props; earnedBadges are derived from users/{uid}/badges.
 */
export default function UserCardWithBadges({ userId, ...userCardProps }) {
  const { userBadges, loading } = useBadgesForUser(userId || null);
  const earnedBadges = loading ? [] : getAllEarnedSorted(userBadges);

  return <UserCard {...userCardProps} earnedBadges={earnedBadges} />;
}
