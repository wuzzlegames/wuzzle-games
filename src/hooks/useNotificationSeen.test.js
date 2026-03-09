import { describe, it, expect } from 'vitest';
import {
  getUnseenNotificationCount,
  getUnseenWithLabels,
} from './useNotificationSeen';

describe('useNotificationSeen helpers', () => {
  describe('getUnseenNotificationCount', () => {
    it('counts friend requests and challenges after seenAt', () => {
      const friendRequests = [{ id: '1', timestamp: 1000 }];
      const challenges = [{ id: 'c1', createdAt: 2000 }];
      expect(
        getUnseenNotificationCount(friendRequests, challenges, 500)
      ).toBe(2);
    });

    it('excludes items at or before seenAt', () => {
      const friendRequests = [{ id: '1', timestamp: 1000 }];
      const challenges = [{ id: 'c1', createdAt: 2000 }];
      expect(
        getUnseenNotificationCount(friendRequests, challenges, 1500)
      ).toBe(1);
      expect(
        getUnseenNotificationCount(friendRequests, challenges, 2000)
      ).toBe(0);
    });

    it('includes comment notifications when passed as fourth argument', () => {
      const friendRequests = [];
      const challenges = [];
      const commentNotifications = [
        { id: 'n1', createdAt: 1000 },
        { id: 'n2', createdAt: 3000 },
      ];
      expect(
        getUnseenNotificationCount(
          friendRequests,
          challenges,
          500,
          commentNotifications
        )
      ).toBe(2);
    });

    it('excludes comment notifications at or before seenAt', () => {
      const commentNotifications = [
        { id: 'n1', createdAt: 1000 },
        { id: 'n2', createdAt: 3000 },
      ];
      expect(
        getUnseenNotificationCount([], [], 2000, commentNotifications)
      ).toBe(1);
      expect(
        getUnseenNotificationCount([], [], 3000, commentNotifications)
      ).toBe(0);
    });

    it('treats missing fourth argument as empty array', () => {
      expect(
        getUnseenNotificationCount([], [], 0)
      ).toBe(0);
    });
  });

  describe('getUnseenWithLabels', () => {
    it('returns comment reply and reaction items with labels when passed', () => {
      const seenAt = 0;
      const commentNotifications = [
        {
          id: 'n1',
          type: 'reply',
          fromUid: 'u2',
          fromUsername: 'Bob',
          createdAt: 1000,
        },
        {
          id: 'n2',
          type: 'reaction',
          fromUid: 'u3',
          fromUsername: 'Carol',
          emoji: '👍',
          createdAt: 2000,
        },
      ];
      const result = getUnseenWithLabels(
        [],
        [],
        seenAt,
        commentNotifications
      );
      expect(result).toHaveLength(2);
      const replyItem = result.find((r) => r.id === 'n1');
      const reactionItem = result.find((r) => r.id === 'n2');
      expect(replyItem?.type).toBe('commentReply');
      expect(replyItem?.label).toBe('Bob replied to your comment');
      expect(replyItem?.fromUserId).toBe('u2');
      expect(reactionItem?.type).toBe('commentReaction');
      expect(reactionItem?.label).toContain('Carol');
      expect(reactionItem?.label).toContain('👍');
      expect(reactionItem?.fromUserId).toBe('u3');
    });

    it('filters comment notifications by seenAt', () => {
      const commentNotifications = [
        { id: 'n1', type: 'reply', fromUsername: 'A', createdAt: 1000 },
        { id: 'n2', type: 'reply', fromUsername: 'B', createdAt: 3000 },
      ];
      const result = getUnseenWithLabels([], [], 2000, commentNotifications);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('n2');
    });

    it('sorts all items by time descending', () => {
      const friendRequests = [{ id: 'f1', timestamp: 500 }];
      const commentNotifications = [
        { id: 'n1', type: 'reply', fromUid: 'u', fromUsername: 'X', createdAt: 1500 },
      ];
      const result = getUnseenWithLabels(
        friendRequests,
        [],
        0,
        commentNotifications
      );
      expect(result[0].time).toBe(1500);
      expect(result[1].time).toBe(500);
    });

    it('treats missing fourth argument as empty', () => {
      const result = getUnseenWithLabels([], [], 0);
      expect(result).toEqual([]);
    });
  });
});
