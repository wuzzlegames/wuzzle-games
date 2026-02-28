import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue, push, set, query, limitToLast } from "firebase/database";
import { database } from "../../config/firebase";
import { logError } from "../../lib/errorUtils";
import UserCardWithBadges from "../UserCardWithBadges";
import { KEYBOARD_HEIGHT } from "../../lib/wordle";

// Keep the emoji set consistent with the single-player CommentsSection reactions.
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];
const EMOJI_BUTTON_ICON = "😮";
const HIDE_EMOJIS_KEY_PREFIX = "mw:multiplayerHideEmojis:";

/**
 * Lightweight real-time chat tied to a specific multiplayer room.
 * Messages live under: multiplayer/<gameCode>/chat/<autoId>
 * Limits display to last 100 messages to prevent unbounded growth.
 */
export default function MultiplayerChat({ gameCode, authUser, setTimedMessage, hasBoardSelector = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastViewedTimestampRef = useRef(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);

  // Emoji reactions (broadcast to everyone in the room)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const [hideEmojis, setHideEmojis] = useState(false);

  // null = not yet hydrated from Firebase; [] = hydrated but empty.
  // Using null avoids treating the initial empty state as a "first snapshot",
  // which could cause older waiting-room emojis to animate when the game view mounts.
  const [reactionEvents, setReactionEvents] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const seenReactionIdsRef = useRef(new Set());
  const hasHydratedReactionsRef = useRef(false);
  const floatingTimeoutsRef = useRef([]);

  const canChat = useMemo(() => {
    return !!gameCode && !!authUser;
  }, [gameCode, authUser]);

  // Subscribe to chat messages for this room, limited to last 100 messages.
  useEffect(() => {
    if (!gameCode) return undefined;

    const chatRef = ref(database, `multiplayer/${gameCode}/chat`);
    // Limit to last 100 messages to prevent unbounded growth
    const chatQuery = query(chatRef, limitToLast(100));
    const unsubscribe = onValue(
      chatQuery,
      (snapshot) => {
        if (!snapshot.exists()) {
          setMessages([]);
          return;
        }
        const raw = snapshot.val() || {};
        const list = Object.entries(raw)
          .map(([id, data]) => ({ id, ...(data || {}) }))
          .sort((a, b) => {
            const at = typeof a.createdAt === "number" ? a.createdAt : 0;
            const bt = typeof b.createdAt === "number" ? b.createdAt : 0;
            return at - bt;
          });
        setMessages(list);
      },
      (err) => {
        console.error('Chat subscription error:', err);
        setMessages([]);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [gameCode]);

  // Load emoji visibility preference (local only) per room.
  useEffect(() => {
    if (!gameCode) return;
    try {
      const raw = window.localStorage.getItem(`${HIDE_EMOJIS_KEY_PREFIX}${gameCode}`);
      setHideEmojis(raw === "1");
    } catch {
      // ignore
    }
  }, [gameCode]);

  useEffect(() => {
    if (!gameCode) return;
    try {
      window.localStorage.setItem(`${HIDE_EMOJIS_KEY_PREFIX}${gameCode}`, hideEmojis ? "1" : "0");
    } catch {
      // ignore
    }
  }, [hideEmojis, gameCode]);

  // Subscribe to emoji reactions for this room (last 100).
  useEffect(() => {
    if (!gameCode) return undefined;

    const reactionsRef = ref(database, `multiplayer/${gameCode}/reactions`);
    const reactionsQuery = query(reactionsRef, limitToLast(100));

    const unsubscribe = onValue(
      reactionsQuery,
      (snapshot) => {
        if (!snapshot.exists()) {
          setReactionEvents([]);
          return;
        }

        const raw = snapshot.val() || {};
        const list = Object.entries(raw)
          .map(([id, data]) => ({ id, ...(data || {}) }))
          .sort((a, b) => {
            const at = typeof a.createdAt === "number" ? a.createdAt : 0;
            const bt = typeof b.createdAt === "number" ? b.createdAt : 0;
            return at - bt;
          });
        setReactionEvents(list);
      },
      (err) => {
        console.error('Reactions subscription error:', err);
        setReactionEvents([]);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [gameCode]);

  // Reset reaction state when room changes.
  useEffect(() => {
    seenReactionIdsRef.current = new Set();
    hasHydratedReactionsRef.current = false;
    setReactionEvents(null);
    setFloatingReactions([]);

    floatingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    floatingTimeoutsRef.current = [];
  }, [gameCode]);

  // Cleanup any pending reaction timeouts on unmount.
  useEffect(() => {
    return () => {
      floatingTimeoutsRef.current.forEach((id) => clearTimeout(id));
      floatingTimeoutsRef.current = [];
    };
  }, []);

  // If the user hides emojis, stop rendering any currently-active animations.
  useEffect(() => {
    if (hideEmojis) {
      setFloatingReactions([]);
    }
  }, [hideEmojis]);

  const spawnFloatingReaction = useCallback((id, emoji) => {
    const x = Math.floor(Math.random() * 81) - 40; // -40..40px
    const durationMs = 1100 + Math.floor(Math.random() * 250); // ~1.1s - 1.35s

    setFloatingReactions((prev) => {
      // Avoid duplicates for the same reaction id.
      if (prev.some((r) => r.id === id)) return prev;
      return [...prev, { id, emoji, x, durationMs }];
    });

    const timeoutId = setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, durationMs);

    floatingTimeoutsRef.current.push(timeoutId);
  }, []);

  // Turn reaction events into one-time floating animations.
  // Important: when the client first joins a room, the initial snapshot can include
  // older reactions. We mark those as "seen" without animating them so the screen
  // doesn't burst with old emojis.
  useEffect(() => {
    // Wait until Firebase has hydrated reactionEvents at least once.
    if (reactionEvents == null) return;

    const seen = seenReactionIdsRef.current;

    // First snapshot: hydrate seen set, but don't animate.
    if (!hasHydratedReactionsRef.current) {
      reactionEvents.forEach((evt) => {
        if (evt?.id) seen.add(evt.id);
      });
      hasHydratedReactionsRef.current = true;
      return;
    }

    reactionEvents.forEach((evt) => {
      if (!evt?.id) return;
      if (seen.has(evt.id)) return;

      seen.add(evt.id);

      const emoji = evt.emoji;
      if (typeof emoji !== "string" || !REACTION_EMOJIS.includes(emoji)) return;
      if (hideEmojis) return;

      spawnFloatingReaction(evt.id, emoji);
    });
  }, [reactionEvents, hideEmojis, spawnFloatingReaction]);

  // Close emoji picker when clicking outside.
  useEffect(() => {
    if (!isEmojiPickerOpen) return undefined;

    const handler = (e) => {
      const target = e.target;
      if (!target) return;

      if (emojiButtonRef.current && emojiButtonRef.current.contains(target)) return;
      if (emojiPickerRef.current && emojiPickerRef.current.contains(target)) return;

      setIsEmojiPickerOpen(false);
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isEmojiPickerOpen]);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, isOpen]);

  // Track unread messages
  useEffect(() => {
    if (!authUser || messages.length === 0) {
      setUnreadCount(0);
      return;
    }

    if (isOpen) {
      // When chat is open, mark all messages as read by updating the last viewed timestamp
      // Use the most recent message timestamp, or current time if no messages
      const mostRecentTime = messages.length > 0
        ? Math.max(...messages.map(m => typeof m.createdAt === 'number' ? m.createdAt : 0))
        : Date.now();
      lastViewedTimestampRef.current = mostRecentTime;
      setUnreadCount(0);
    } else {
      // Count messages that came after the last viewed timestamp (excluding own messages)
      const unread = messages.filter((m) => {
        if (m.uid === authUser.uid) return false; // Don't count own messages
        const msgTime = typeof m.createdAt === 'number' ? m.createdAt : 0;
        return msgTime > lastViewedTimestampRef.current;
      });
      setUnreadCount(unread.length);
    }
  }, [messages, isOpen, authUser]);

  // Initialize last viewed timestamp when component mounts or gameCode changes
  useEffect(() => {
    if (gameCode && authUser) {
      lastViewedTimestampRef.current = Date.now();
    }
  }, [gameCode, authUser]);

  const sendReaction = useCallback(
    async (emoji) => {
      if (!gameCode || !authUser) return;
      if (!REACTION_EMOJIS.includes(emoji)) return;

      try {
        const reactionsRef = ref(database, `multiplayer/${gameCode}/reactions`);
        const newRef = push(reactionsRef);
        const id = newRef.key;
        const displayName = authUser.displayName || authUser.email || "Player";

        if (id) {
          // Optimistically animate locally (and mark as seen so we don't re-animate
          // when the server echo arrives).
          seenReactionIdsRef.current.add(id);
          if (!hideEmojis) {
            spawnFloatingReaction(id, emoji);
          }
        }

        await set(newRef, {
          emoji,
          uid: authUser.uid,
          name: displayName,
          createdAt: Date.now(),
        });
      } catch (err) {
        logError(err, "MultiplayerChat.sendReaction");
      }
    },
    [authUser, gameCode, hideEmojis, spawnFloatingReaction],
  );

  const handleSend = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canChat) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      const chatRef = ref(database, `multiplayer/${gameCode}/chat`);
      const newRef = push(chatRef);
      const displayName =
        authUser.displayName || authUser.email || "Player";
      await set(newRef, {
        uid: authUser.uid,
        name: displayName,
        text: trimmed,
        createdAt: Date.now(),
      });
      setInput("");
      // Keep focus in the chat box so keyboard input does not go to the game.
      // Use requestAnimationFrame to ensure focus happens after DOM update
      requestAnimationFrame(() => {
        if (inputRef.current && isOpen) {
          inputRef.current.focus();
        }
      });
    } catch (err) {
      // Best-effort only; surface error via logging for debugging.
      // Multiplayer gameplay should not break if chat fails.
      logError(err, 'MultiplayerChat.handleSend');
      if (typeof setTimedMessage === 'function') {
        setTimedMessage("Couldn't send message.", 4000);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Stop all keyboard events from propagating to the game's keyboard handler
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
    
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handleKeyPress = (e) => {
    // Stop all keypress events from propagating
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
  };

  const handleKeyUp = (e) => {
    // Stop all keyup events from propagating
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!gameCode || !authUser) {
    return null;
  }

  return (
    <>
      {/* Floating emoji reactions layer (bottom-center). */}
      {!hideEmojis && floatingReactions.length > 0 && (
        <div className="mwMultiplayerReactionsLayer" aria-hidden="true">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="mwMultiplayerReactionEmoji"
              style={{
                // Start from the bottom of the viewport (not above the keyboard)
                // per the requested "bottom center of the screen" behavior.
                bottom: 200,
                "--mw-reaction-x": `${r.x}px`,
                animationDuration: `${r.durationMs}ms`,
              }}
            >
              {r.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Floating emoji picker button - left side, above board selector when present else left bottom */}
      <button
        ref={emojiButtonRef}
        type="button"
        onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
        style={{
          position: "fixed",
          bottom: hasBoardSelector ? KEYBOARD_HEIGHT + 20 + 56 : KEYBOARD_HEIGHT + 20,
          left: 20,
          padding: "8px 14px",
          borderRadius: 999,
          backgroundColor: "var(--c-bg)",
          border: "1px solid var(--c-text-strong)",
          color: "var(--c-text-strong)",
          fontSize: 12,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 16px var(--c-bg)",
        }}
        aria-label={isEmojiPickerOpen ? "Close emoji reactions" : "Open emoji reactions"}
      >
        <span
          style={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2px solid var(--c-present)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
          }}
        >
          {EMOJI_BUTTON_ICON}
        </span>
        <span>Emojis</span>
      </button>

      {/* Emoji picker panel */}
      {isEmojiPickerOpen && (
        <div
          ref={emojiPickerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            bottom: (hasBoardSelector ? KEYBOARD_HEIGHT + 20 + 56 : KEYBOARD_HEIGHT + 20) + 54,
            left: 20,
            width: 220,
            maxWidth: "90vw",
            backgroundColor: "var(--c-panel)",
            borderRadius: 12,
            border: "1px solid var(--c-border)",
            boxShadow: "0 8px 24px var(--c-bg)",
            zIndex: 9998,
            padding: "10px 10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: "bold", color: "var(--c-text-strong)" }}>
            Emoji reactions
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                style={{
                  border: "1px solid var(--c-border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  background: "var(--c-bg)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setHideEmojis((prev) => !prev)}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "10px 12px",
              background: "var(--c-accent-2)",
              color: "var(--c-text-strong)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {hideEmojis ? "Show emojis" : "Hide emojis"}
          </button>
        </div>
      )}

      {/* Floating chat toggle button - bottom right */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: "fixed",
          bottom: KEYBOARD_HEIGHT + 20,
          right: 20,
          padding: "8px 14px",
          borderRadius: 999,
          backgroundColor: "var(--c-bg)",
          border: "1px solid var(--c-text-strong)",
          color: "var(--c-text-strong)",
          fontSize: 12,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 16px var(--c-bg)",
        }}
        aria-label={isOpen ? "Close room chat" : "Open room chat"}
      >
        <span
          style={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2px solid var(--c-correct)",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            position: "relative",
          }}
        >
          💬
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                minWidth: 18,
                height: 18,
                borderRadius: "50%",
                backgroundColor: "var(--c-error)",
                color: "var(--c-text-strong)",
                fontSize: 10,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                border: "2px solid var(--c-bg)",
                boxShadow: "0 2px 4px var(--c-bg)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        <span>{isOpen ? "Close chat" : "Room chat"}</span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          onClick={(e) => {
            // Stop click events on chat panel from propagating
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            // Stop keyboard events on chat panel from propagating
            e.stopPropagation();
          }}
          style={{
            position: "fixed",
            bottom: KEYBOARD_HEIGHT + 90,
            right: 20,
            width: 320,
            maxWidth: "90vw",
            maxHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--c-panel)",
            borderRadius: 12,
            border: "1px solid var(--c-border)",
            boxShadow: "0 8px 24px var(--c-bg)",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--c-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: "bold",
                color: "var(--c-text-strong)",
              }}
            >
              Room chat
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--c-text)",
              }}
            >
              Visible to players in this room
            </div>
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "8px 10px 4px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--c-text)",
                  textAlign: "center",
                  padding: "8px 0",
                }}
              >
                No messages yet. Say hello to your opponents!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.uid && authUser && m.uid === authUser.uid;
                const timeLabel = m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "100%",
                        padding: "6px 8px",
                        borderRadius: 8,
                        backgroundColor: isMe ? "var(--c-accent-2)" : "var(--c-panel)",
                        color: "var(--c-text-strong)",
                        fontSize: 13,
                        wordBreak: "break-word",
                      }}
                    >
                      {!isMe && (
                        <div style={{ marginBottom: 2 }}>
                          <UserCardWithBadges
                            userId={m.uid}
                            username={m.name || "Player"}
                            size="sm"
                          />
                        </div>
                      )}
                      <div>{m.text}</div>
                    </div>
                    {timeLabel && (
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--c-text)",
                          marginTop: 2,
                        }}
                      >
                        {timeLabel}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleSend}
            onClick={(e) => {
              // Stop click events on form from propagating
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              // Stop keyboard events on form from propagating
              e.stopPropagation();
            }}
            style={{
              borderTop: "1px solid var(--c-border)",
              padding: "6px 8px",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              data-chat-input="true"
              placeholder={canChat ? "Type a message" : "Sign in to chat"}
              value={input}
              onChange={(e) => {
                e.stopPropagation();
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              onKeyPress={handleKeyPress}
              onKeyUp={handleKeyUp}
              onFocus={(e) => {
                // Stop focus event from bubbling
                e.stopPropagation();
              }}
              onBlur={(e) => {
                // Stop blur event from bubbling
                e.stopPropagation();
                // Only allow blur if chat is being closed, otherwise refocus
                if (isOpen) {
                  // Use requestAnimationFrame to check after any potential focus changes
                  requestAnimationFrame(() => {
                    if (isOpen && inputRef.current) {
                      const activeElement = document.activeElement;
                      // If chat is still open and input lost focus (and it's not the send button), refocus it
                      if (activeElement !== inputRef.current && 
                          activeElement?.tagName !== 'BUTTON' &&
                          activeElement?.type !== 'submit') {
                        inputRef.current.focus();
                      }
                    }
                  });
                }
              }}
              onClick={(e) => {
                // Stop click events from propagating
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                // Stop mousedown to prevent any focus issues
                e.stopPropagation();
              }}
              disabled={!canChat || isSending}
              autoFocus={isOpen}
              style={{
                flex: 1,
                padding: "6px 8px",
                borderRadius: 999,
                border: "1px solid var(--c-border)",
                backgroundColor: "var(--c-bg)",
                color: "var(--c-text-strong)",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!canChat || isSending || !input.trim()}
              onMouseDown={(e) => {
                // Prevent blur on input when clicking send button
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                // After sending, refocus the input
                requestAnimationFrame(() => {
                  if (inputRef.current && isOpen) {
                    inputRef.current.focus();
                  }
                });
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                backgroundColor:
                  !canChat || isSending || !input.trim() ? "var(--c-border)" : "var(--c-accent-1)",
                color: "var(--c-text-strong)",
                fontSize: 12,
                fontWeight: "bold",
                cursor:
                  !canChat || isSending || !input.trim() ? "default" : "pointer",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
