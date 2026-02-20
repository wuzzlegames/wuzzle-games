import React, { useCallback } from "react";
import { useBadgesForUser } from "../hooks/useUserBadges";
import { getAllEarnedSorted } from "../lib/badges";
import { useAuth } from "../hooks/useAuth";
import UserCard from "./UserCard";

const PREMIUM_BADGE_ID = 'premium_member';

/**
 * UserCard that fetches and displays earned badges for a user.
 * Use when you have a userId (e.g. in multiplayer, leaderboard, friends).
 * Pass through all UserCard props; earnedBadges are derived from users/{uid}/badges.
 * Automatically sets isPremium if user has the premium_member badge.
 * Also computes friend status and provides an "Add Friend" callback for the badges modal.
 */
export default function UserCardWithBadges({ userId, ...userCardProps }) {
  const { userBadges, loading } = useBadgesForUser(userId || null);
  const { user, friends, sendFriendRequest } = useAuth();
  const earnedBadges = loading ? [] : getAllEarnedSorted(userBadges);
  const isPremium = !loading && userBadges && !!userBadges[PREMIUM_BADGE_ID];

  // Determine friend status relative to the current user
  let friendStatus = 'none';
  if (user && userId && userId === user.uid) {
    friendStatus = 'self';
  } else if (friends?.some((f) => f.id === userId)) {
    friendStatus = 'friend';
  }

  const handleAddFriend = useCallback(async () => {
    if (!userId || !userCardProps.username) return;
    await sendFriendRequest(userCardProps.username, userId);
  }, [userId, userCardProps.username, sendFriendRequest]);

  return (
    <UserCard
      {...userCardProps}
      earnedBadges={earnedBadges}
      isPremium={isPremium}
      friendStatus={friendStatus}
      onAddFriend={user ? handleAddFriend : undefined}
    />
  );
}
