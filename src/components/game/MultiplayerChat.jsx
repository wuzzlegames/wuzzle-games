import React, { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue, push, set, query, limitToLast } from "firebase/database";
import { database } from "../../config/firebase";
import { logError } from "../../lib/errorUtils";
import UserCardWithBadges from "../UserCardWithBadges";

/**
 * Lightweight real-time chat tied to a specific multiplayer room.
 * Messages live under: multiplayer/<gameCode>/chat/<autoId>
 * Limits display to last 100 messages to prevent unbounded growth.
 */
export default function MultiplayerChat({ gameCode, authUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastViewedTimestampRef = useRef(Date.now());
  const [unreadCount, setUnreadCount] = useState(0);

  const canChat = useMemo(() => {
    return !!gameCode && !!authUser;
  }, [gameCode, authUser]);

  // Subscribe to chat messages for this room, limited to last 100 messages.
  useEffect(() => {
    if (!gameCode) return undefined;

    const chatRef = ref(database, `multiplayer/${gameCode}/chat`);
    // Limit to last 100 messages to prevent unbounded growth
    const chatQuery = query(chatRef, limitToLast(100));
    const unsubscribe = onValue(chatQuery, (snapshot) => {
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
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [gameCode]);

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
      {/* Floating chat toggle button - bottom right */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: "fixed",
          bottom: 190 + 20,
          right: 20,
          padding: "8px 14px",
          borderRadius: 999,
          backgroundColor: "#212121",
          border: "1px solid #ffffff",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.7)",
        }}
        aria-label={isOpen ? "Close room chat" : "Open room chat"}
      >
        <span
          style={{
            display: "inline-flex",
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "2px solid #50a339",
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
                backgroundColor: "#ef4444",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
                border: "2px solid #212121",
                boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
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
            bottom: 190 + 90,
            right: 20,
            width: 320,
            maxWidth: "90vw",
            maxHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#372F41",
            borderRadius: 12,
            border: "1px solid #3A3A3C",
            boxShadow: "0 8px 24px rgba(0,0,0,0.85)",
            zIndex: 9998,
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #2f2f31",
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
                color: "#ffffff",
              }}
            >
              Room chat
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
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
                  color: "#9ca3af",
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
                        backgroundColor: isMe ? "#2563eb" : "#27272a",
                        color: "#f9fafb",
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
                          color: "#6b7280",
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
              borderTop: "1px solid #2f2f31",
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
                border: "1px solid #3A3A3C",
                backgroundColor: "#212121",
                color: "#ffffff",
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
                  !canChat || isSending || !input.trim() ? "#3A3A3C" : "#e56b6f",
                color: "#ffffff",
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
