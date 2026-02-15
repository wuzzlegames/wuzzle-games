import React, { useEffect, useMemo, useState } from "react";
import { ref, onValue, push, set, update, query, limitToLast } from "firebase/database";
import { database } from "../../config/firebase";
import { useAuth } from "../../hooks/useAuth";
import { logError } from "../../lib/errorUtils";
import { validateUsername } from "../../lib/validation";
import UserCardWithBadges from "../UserCardWithBadges";

/**
 * Lightweight comments section shown under the boards once a player has
 * solved all boards for a given daily / marathon configuration.
 *
 * Comments are stored in Firebase Realtime Database under:
 *   comments/<threadId>/<autoId>
 * Limits display to last 300 comments to prevent unbounded growth.
 */
export default function CommentsSection({ threadId }) {
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [comment, setComment] = useState("");
  const [isUsernameEditable, setIsUsernameEditable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [comments, setComments] = useState([]);

  // Stable random guest username for the lifetime of this component.
  const guestDefaultName = useMemo(() => {
    const digits = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `Wuzzle-games-player-${digits}`;
  }, []);

  // Stable client id used for reactions when the user is not signed in,
  // so guests can still have a single reaction per browser.
  const clientId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const key = "mw:commentsClientId";
      let existing = window.localStorage.getItem(key);
      if (!existing) {
        const rand = Math.random().toString(36).slice(2, 10);
        existing = `guest:${rand}`;
        window.localStorage.setItem(key, existing);
      }
      return existing;
    } catch {
      return null;
    }
  }, []);

  // Initialize username depending on auth state.
  useEffect(() => {
    if (user) {
      const display = user.displayName || user.email || "Unknown user";
      setUsername(display);
      setIsUsernameEditable(false);
    } else {
      setIsUsernameEditable(true);
      setUsername((prev) => prev || guestDefaultName);
    }
  }, [user, guestDefaultName]);

  // Subscribe to comments for this thread, limited to last 300 comments.
  useEffect(() => {
    if (!threadId) return undefined;

    const commentsRef = ref(database, `comments/${threadId}`);
    // Limit to last 300 comments to prevent unbounded growth
    const commentsQuery = query(commentsRef, limitToLast(300));
    const unsubscribe = onValue(commentsQuery, (snapshot) => {
      if (!snapshot.exists()) {
        setComments([]);
        return;
      }
      const raw = snapshot.val() || {};
      const list = Object.entries(raw)
        .map(([id, data]) => ({ id, ...(data || {}) }))
        // Newest comments first: sort by createdAt descending, falling back to 0.
        .sort((a, b) => {
          const at = a.createdAt || 0;
          const bt = b.createdAt || 0;
          return bt - at;
        });
      setComments(list);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [threadId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!threadId) return;

    const trimmedComment = comment.trim();
    const trimmedUsername = username.trim();
    if (!trimmedComment || !trimmedUsername) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const commentsRef = ref(database, `comments/${threadId}`);
      const newRef = push(commentsRef);
      await set(newRef, {
        username: trimmedUsername,
        text: trimmedComment,
        createdAt: Date.now(),
        uid: user?.uid || null,
        userReactions: {},
      });
      setComment("");
    } catch (err) {
      logError(err, 'CommentsSection.handleSubmit');
      setSubmitError("Failed to submit comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReaction = async (commentId, emoji) => {
    if (!threadId || !commentId) return;

    const reactionUserId = (user && user.uid) || clientId;
    if (!reactionUserId) return;

    try {
      const commentRef = ref(database, `comments/${threadId}/${commentId}`);
      const current = comments.find((c) => c.id === commentId);
      const currentUserReactions =
        current && current.userReactions && typeof current.userReactions === "object"
          ? current.userReactions
          : {};

      const currentEmoji = currentUserReactions[reactionUserId] || null;

      // If clicking the same emoji, remove the reaction; otherwise switch it.
      const updates =
        currentEmoji === emoji
          ? { [`userReactions/${reactionUserId}`]: null }
          : { [`userReactions/${reactionUserId}`]: emoji };

      await update(commentRef, updates);
    } catch (err) {
      logError(err, 'CommentsSection.handleReaction');
    }
  };

  if (!threadId) return null;

  return (
    <section
      aria-label="Comments"
      style={{
        marginTop: 24,
        paddingTop: 16,
        borderTop: "1px solid #3a3a3c",
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 16,
          fontWeight: "bold",
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Comments
      </h3>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 8 }}>
          <label
            htmlFor="comment-username"
            style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#d7dadc" }}
          >
            Username
          </label>
          <input
            id="comment-username"
            type="text"
            value={username}
            onChange={(e) =>
              isUsernameEditable ? setUsername(e.target.value) : null
            }
            readOnly={!isUsernameEditable}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #3A3A3C",
              backgroundColor: "#212121",
              color: "#ffffff",
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label
            htmlFor="comment-text"
            style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#d7dadc" }}
          >
            Comment
          </label>
          <textarea
            id="comment-text"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #3A3A3C",
              backgroundColor: "#212121",
              color: "#ffffff",
              fontSize: 14,
              resize: "vertical",
            }}
          />
        </div>

        {submitError && (
          <div style={{ color: "#f87171", fontSize: 12, marginBottom: 6 }}>
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !comment.trim() || !username.trim()}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            backgroundColor:
              isSubmitting || !comment.trim() || !username.trim()
                ? "#3A3A3C"
                : "#e56b6f",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: "bold",
            cursor:
              isSubmitting || !comment.trim() || !username.trim()
                ? "default"
                : "pointer",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {isSubmitting ? "Submitting..." : "Post Comment"}
        </button>
      </form>

      <div>
        {comments.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            No comments yet. Be the first to share your thoughts about this puzzle.
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {comments.map((c) => {
              const createdAtDate = c.createdAt ? new Date(c.createdAt) : null;
              const timeLabel = createdAtDate
                ? createdAtDate.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : null;

              const REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

              const reactionUserId = (user && user.uid) || clientId || null;

              const userReactions =
                c.userReactions && typeof c.userReactions === "object"
                  ? c.userReactions
                  : null;

              let reactionCounts = {};
              let myReactionEmoji = null;

              if (userReactions) {
                REACTIONS.forEach((emoji) => {
                  reactionCounts[emoji] = 0;
                });
                Object.values(userReactions).forEach((emoji) => {
                  if (REACTIONS.includes(emoji)) {
                    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                  }
                });
                if (reactionUserId && userReactions[reactionUserId]) {
                  myReactionEmoji = userReactions[reactionUserId];
                }
              } else {
                reactionCounts = {};
              }

              return (
                <li
                  key={c.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    backgroundColor: "#372F41",
                    border: "1px solid #3A3A3C",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                      gap: 8,
                    }}
                  >
                    <div style={{ flexShrink: 0, minWidth: 0 }}>
                      <UserCardWithBadges
                        userId={c.uid || null}
                        username={c.username || "Unknown"}
                        size="sm"
                      />
                    </div>
                    {timeLabel && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {timeLabel}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                      marginBottom: 6,
                    }}
                  >
                    {c.text}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 2,
                    }}
                  >
                    {REACTIONS.map((emoji) => {
                      const count = Number(reactionCounts[emoji] || 0);
                      const isMine = myReactionEmoji === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(c.id, emoji)}
                          style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "2px 8px",
                            backgroundColor: isMine
                              ? "#6d597a"
                              : count > 0
                              ? "#372F41"
                              : "#372F41",
                            color: "#e5e7eb",
                            fontSize: 12,
                            fontWeight: isMine ? "bold" : "normal",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>{emoji}</span>
                          {count > 0 && <span>{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
