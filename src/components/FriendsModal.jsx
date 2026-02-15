import React from "react";
import Modal from "./Modal";
import UserCardWithBadges from "./UserCardWithBadges";
import { useAuth } from "../hooks/useAuth";
import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import { useTimedMessage } from "../hooks/useTimedMessage";
import GameToast from "./game/GameToast";
import { useNavigate } from "react-router-dom";
import {
  createGiftCheckoutSessionCallable,
  adminGiftSubscriptionCallable,
} from "../config/firebase";
import "./FriendsModal.css";
import { MAX_BOARDS } from "../lib/gameConstants";
import { DURATION_OPTIONS } from "../lib/subscriptionConstants";

const ADMIN_EMAIL = "abhijeetsridhar14@gmail.com";

const CHALLENGE_BOARD_OPTIONS = Array.from({ length: MAX_BOARDS }, (_, i) => i + 1);

export default function FriendsModal({ isOpen, onRequestClose }) {
  const navigate = useNavigate();
  const { message, setTimedMessage } = useTimedMessage("");
  const { 
    user,
    friends,
    friendRequests,
    incomingChallenges,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    isVerifiedUser,
    sendChallenge,
    sendFriendRequestByIdentifier,
  } = useAuth();

  // Lightweight multiplayer host hook used purely to create games for challenges.
  const multiplayerHost = useMultiplayerGame(null, true, false);

  const [selectedFriendForChallenge, setSelectedFriendForChallenge] = React.useState(null);
  const [challengeBoards, setChallengeBoards] = React.useState(1);
  const [challengeVariant, setChallengeVariant] = React.useState('standard'); // 'standard' | 'speedrun' | 'solutionhunt'
  const [challengeMaxPlayers, setChallengeMaxPlayers] = React.useState(2);
  const [challengeIsPublic, setChallengeIsPublic] = React.useState(false);
  const [isChallengeConfigOpen, setIsChallengeConfigOpen] = React.useState(false);
  const [addFriendInput, setAddFriendInput] = React.useState("");
  const [isSendingFriendRequest, setIsSendingFriendRequest] = React.useState(false);
  const [friendToRemove, setFriendToRemove] = React.useState(null);
  const [isRemovingFriend, setIsRemovingFriend] = React.useState(false);
  const [giftModalRecipient, setGiftModalRecipient] = React.useState(null);
  const [giftModalDuration, setGiftModalDuration] = React.useState("1m");
  const [giftModalLoading, setGiftModalLoading] = React.useState(false);

  const getBaseFullUrl = () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const basePath = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${window.location.origin}${basePath}`;
  };

  const handleGiftModalGiftToFriend = async () => {
    if (!giftModalRecipient || !user?.uid) return;
    const isAdmin = user.email === ADMIN_EMAIL;
    setGiftModalLoading(true);
    try {
      if (isAdmin) {
        const adminGift = adminGiftSubscriptionCallable();
        await adminGift({ recipientUid: giftModalRecipient.id, duration: giftModalDuration });
        setTimedMessage(`Premium granted to ${giftModalRecipient.name}.`, 4000);
        setGiftModalRecipient(null);
      } else {
        const createGift = createGiftCheckoutSessionCallable();
        const result = await createGift({
          recipientUid: giftModalRecipient.id,
          baseUrl: getBaseFullUrl(),
          duration: giftModalDuration,
        });
        const url = result?.data?.url;
        if (url) {
          window.location.assign(url);
          return;
        }
        setTimedMessage("Could not start gift checkout.", 5000);
      }
    } catch (err) {
      let msg = err?.message || (err?.code ? `Error: ${err.code}` : "Could not complete gift.");
      if (err?.code === "functions/internal" || err?.code === "internal") {
        msg =
          "Gift checkout is unavailable. If you're setting this up, deploy the latest Cloud Functions and set STRIPE_GIFT_PRICE_ID_* and STRIPE_SECRET_KEY (see gift-subs.md).";
      }
      setTimedMessage(msg, 7000);
    } finally {
      setGiftModalLoading(false);
    }
  };

  const handleGiftModalGrantMyself = async () => {
    if (!user?.uid || user.email !== ADMIN_EMAIL) return;
    setGiftModalLoading(true);
    try {
      const adminGift = adminGiftSubscriptionCallable();
      await adminGift({ recipientUid: user.uid, duration: giftModalDuration });
      setTimedMessage("Premium granted to you.", 4000);
      setGiftModalRecipient(null);
    } catch (err) {
      const msg = err?.message || (err?.code ? `Error: ${err.code}` : "Could not grant premium.");
      setTimedMessage(msg, 7000);
    } finally {
      setGiftModalLoading(false);
    }
  };

  if (!isVerifiedUser) {
    return (
      <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
        <div className="friendsModalRoot">
          <h2 style={{ margin: "0 0 16px 0", fontSize: "22px", fontWeight: "bold" }}>
            Verify your account
          </h2>
          <p style={{ marginBottom: "16px", color: "#d7dadc", fontSize: "14px" }}>
            Friends are only available for verified accounts.
            Please verify your email or sign in with Google to use this feature.
          </p>
          <button
            onClick={onRequestClose}
            className="friendsModalPrimaryButton"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const handleAddFriendSubmit = async (e) => {
    e.preventDefault();
    const value = addFriendInput.trim();
    if (!value) {
      setTimedMessage("Please enter an email or username.", 4000);
      return;
    }

    try {
      setIsSendingFriendRequest(true);
      await sendFriendRequestByIdentifier(value);
      setTimedMessage("Friend request sent.", 3000);
      setAddFriendInput("");
    } catch (err) {
      setTimedMessage(err?.message || "Failed to send friend request.", 5000);
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      {/* Global toast for friends/challenges actions */}
      <GameToast message={message} />
      <div className="friendsModalRoot">
        <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "bold" }}>
          Friends & Requests
        </h2>

        {/* Add friend by email/username */}
        <form onSubmit={handleAddFriendSubmit} style={{ marginBottom: "20px", textAlign: "left" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#d7dadc" }}>
            Add friend by email or username
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="friend@example.com or username"
              value={addFriendInput}
              onChange={(e) => setAddFriendInput(e.target.value)}
              disabled={isSendingFriendRequest}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #3A3A3C",
                background: "#212121",
                color: "#ffffff",
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={isSendingFriendRequest}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: "#e56b6f",
                color: "#ffffff",
                fontWeight: "bold",
                fontSize: 12,
                cursor: isSendingFriendRequest ? "not-allowed" : "pointer",
                opacity: isSendingFriendRequest ? 0.8 : 1,
              }}
            >
              {isSendingFriendRequest ? "Sending..." : "Send request"}
            </button>
          </div>
        </form>

        {/* Friend Requests Section */}
        {friendRequests && friendRequests.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#d7dadc", textAlign: "left" }}>
              Friend Requests ({friendRequests.length})
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "16px",
                borderBottom: "1px solid #3A3A3C",
                paddingBottom: "16px"
              }}
            >
              {friendRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    padding: "12px 14px",
                    background: "#372F41",
                    borderRadius: "8px",
                    border: "1px solid #50a339",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px"
                  }}
                >
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <span style={{ color: "#ffffff", fontWeight: "600" }}>
                      {request.fromName}
                    </span>
                    <div style={{ color: "#818384", fontSize: "11px", marginTop: "2px" }}>
                      wants to be friends
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => acceptFriendRequest(request.id, request.fromName)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#e56b6f",
                        color: "#ffffff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineFriendRequest(request.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #3A3A3C",
                        background: "#355070",
                        color: "#ffffff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends Section */}
        <div>
          <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#d7dadc", textAlign: "left" }}>
            Friends ({friends?.length || 0})
          </h3>
          {friends && friends.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "300px",
                overflowY: "auto",
                marginBottom: "20px"
              }}
            >
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  style={{
                    padding: "14px 16px",
                    background: "#372F41",
                    borderRadius: "8px",
                    border: "1px solid #3A3A3C",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <UserCardWithBadges
                    userId={friend.id}
                    username={friend.name}
                    size="sm"
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => {
                        setGiftModalRecipient(friend);
                        setGiftModalDuration("1m");
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #50a339",
                        background: "transparent",
                        color: "#50a339",
                        fontWeight: "bold",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Gift
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFriendForChallenge(friend);
                        setChallengeBoards(1);
                        setChallengeVariant('standard');
                        setIsChallengeConfigOpen(true);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: "#e56b6f",
                        color: "#ffffff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Challenge
                    </button>
                    <button
                      onClick={() => setFriendToRemove(friend)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #3A3A3C",
                        background: "#355070",
                        color: "#ffffff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "32px 16px",
                color: "#818384",
                fontSize: "14px",
                marginBottom: "20px"
              }}
>
              No friends yet. Send friend requests while playing Multiplayer Mode!
            </div>
          )}
        </div>

        <button
          onClick={onRequestClose}
          className="friendsModalPrimaryButton"
        >
          Close
        </button>
      </div>

      {/* Gift Premium modal – duration + recipient; admin can also grant self */}
      <Modal
        isOpen={!!giftModalRecipient}
        onRequestClose={() => {
          if (!giftModalLoading) setGiftModalRecipient(null);
        }}
      >
        {giftModalRecipient && (
          <div
            style={{
            backgroundColor: "#372F41",
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: "92vw",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: 24,
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: 1,
              }}
            >
              Gift Premium to {giftModalRecipient.name}
            </h2>

            <div style={{ marginBottom: 20, fontSize: 16, color: "#d7dadc", lineHeight: 1.6 }}>
              Choose duration:
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {DURATION_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    backgroundColor: giftModalDuration === opt.value ? "#6d597a" : "#372F41",
                    borderRadius: 8,
                    border:
                      giftModalDuration === opt.value ? "2px solid #50a339" : "1px solid #3A3A3C",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="gift-duration"
                    value={opt.value}
                    checked={giftModalDuration === opt.value}
                    onChange={() => setGiftModalDuration(opt.value)}
                    style={{ cursor: "pointer" }}
                  />
                  <span style={{ flex: 1, color: "#ffffff", fontWeight: 500 }}>{opt.label}</span>
                  <span style={{ color: "#50a339", fontWeight: "bold" }}>
                    ${opt.pricePerMonth}/month
                    {opt.savings && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: "#818384" }}>
                        (save {opt.savings})
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {user?.email === ADMIN_EMAIL ? (
                <>
                  <button
                    onClick={handleGiftModalGiftToFriend}
                    disabled={giftModalLoading}
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      borderRadius: 10,
                      border: "none",
                      background: giftModalLoading ? "#818384" : "#e56b6f",
                      color: "#ffffff",
                      fontSize: 14,
                      fontWeight: "bold",
                      cursor: giftModalLoading ? "not-allowed" : "pointer",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {giftModalLoading ? "..." : `Gift to ${giftModalRecipient.name}`}
                  </button>
                  <button
                    onClick={handleGiftModalGrantMyself}
                    disabled={giftModalLoading}
                    style={{
                      width: "100%",
                      padding: "12px 0",
                      borderRadius: 10,
                      border: "1px solid #50a339",
                      background: "transparent",
                      color: "#50a339",
                      fontSize: 14,
                      fontWeight: "bold",
                      cursor: giftModalLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    Grant myself premium
                  </button>
                </>
              ) : (
                <button
                  onClick={handleGiftModalGiftToFriend}
                  disabled={giftModalLoading}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 10,
                    border: "none",
                    background: giftModalLoading ? "#818384" : "#e56b6f",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: giftModalLoading ? "not-allowed" : "pointer",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {giftModalLoading ? "..." : "Continue to payment"}
                </button>
              )}
              <button
                onClick={() => {
                  if (!giftModalLoading) setGiftModalRecipient(null);
                }}
                disabled={giftModalLoading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px solid #3A3A3C",
                  background: "transparent",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: giftModalLoading ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Multiplayer Challenge configuration modal (per-friend).
          NOTE: This will later be replaced to route through the shared
          Multiplayer host modal so that challenges and direct hosting use
          the same room configuration flow. */}
      <Modal
        isOpen={isChallengeConfigOpen && !!selectedFriendForChallenge}
        onRequestClose={() => setIsChallengeConfigOpen(false)}
      >
        <div style={{ padding: "24px" }}>
          <h2
            style={{
              margin: 0,
              marginBottom: "24px",
              fontSize: 20,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            Multiplayer Game Configuration
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#d7dadc",
                  fontSize: 14,
                }}
              >
                Number of Boards
              </label>
              <select
                value={challengeBoards}
                onChange={(e) => setChallengeBoards(parseInt(e.target.value, 10))}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #3A3A3C",
                  background: "#372F41",
                  color: "#ffffff",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {CHALLENGE_BOARD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="challenge-variant-select"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "#d7dadc",
                  fontSize: 14,
                }}
              >
                Game Variant
              </label>
              <select
                id="challenge-variant-select"
                value={challengeVariant}
                onChange={(e) => setChallengeVariant(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #3A3A3C",
                  background: "#372F41",
                  color: "#ffffff",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <option value="standard">Standard (6 guesses)</option>
                <option value="speedrun">Speedrun (Unlimited guesses, timed)</option>
                <option value="solutionhunt">Solution Hunt (See possible words)</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginTop: "12px",
                  marginBottom: "8px",
                  color: "#d7dadc",
                  fontSize: 14,
                }}
              >
                Max players in room
              </label>
              <select
                value={challengeMaxPlayers}
                onChange={(e) => setChallengeMaxPlayers(parseInt(e.target.value, 10) || 2)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 6,
                  border: "1px solid #3A3A3C",
                  background: "#372F41",
                  color: "#ffffff",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: "4px" }}>
              <div
                style={{
                  display: "block",
                  marginBottom: "6px",
                  color: "#d7dadc",
                  fontSize: 14,
                }}
              >
                Room visibility
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, color: "#d7dadc" }}>
                  <input
                    type="radio"
                    name="challenge-visibility"
                    checked={challengeIsPublic}
                    onChange={() => setChallengeIsPublic(true)}
                    style={{ cursor: "pointer" }}
                  />
                  Public (show in Open Rooms)
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, color: "#d7dadc" }}>
                  <input
                    type="radio"
                    name="challenge-visibility"
                    checked={!challengeIsPublic}
                    onChange={() => setChallengeIsPublic(false)}
                    style={{ cursor: "pointer" }}
                  />
                  Private (invite only)
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                onClick={() => setIsChallengeConfigOpen(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid #3A3A3C",
                  background: "#355070",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedFriendForChallenge || !user) return;
                  try {
                    const clampedMaxPlayers = Math.max(2, Math.min(8, challengeMaxPlayers));
                    const result = await multiplayerHost.createGame({
                      variant: challengeVariant,
                      speedrun: challengeVariant === 'speedrun',
                      solutionHunt: challengeVariant === 'solutionhunt',
                      maxPlayers: clampedMaxPlayers,
                      isPublic: challengeIsPublic,
                      boards: challengeBoards,
                      challengeOnly: true,
                    });
                    const code = result.code;
                    const ok = await sendChallenge(
                      selectedFriendForChallenge.id,
                      selectedFriendForChallenge.name,
                      code,
                      challengeBoards,
                      challengeVariant,
                    );

                    if (!ok) {
                      // A pending challenge already exists between these two users.
                      setTimedMessage(
                        "A challenge between you and this friend is already pending. Please accept or dismiss it before sending another.",
                        5000,
                      );
                      return;
                    }

                    setIsChallengeConfigOpen(false);
                    onRequestClose?.();
                    // Send challenger to the multiplayer waiting room for this challenge.
                    navigate(
                      `/game?mode=multiplayer&code=${code}&host=true&variant=${challengeVariant}&boards=${challengeBoards}`,
                    );
                  } catch (err) {
                    setTimedMessage(err?.message || "Failed to create challenge", 5000);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#e56b6f",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Challenge
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm remove friend modal */}
      <Modal
        isOpen={!!friendToRemove}
        onRequestClose={() => setFriendToRemove(null)}
      >
        <div style={{ padding: "24px" }}>
          <h2
            style={{
              margin: 0,
              marginBottom: "24px",
              fontSize: 20,
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            Remove friend?
          </h2>
          <p
            style={{
              margin: 0,
              marginBottom: "12px",
              color: "#d7dadc",
              fontSize: 14,
            }}
          >
            Are you sure you want to remove {friendToRemove?.name} from your friends list? They will be removed from your list on both sides.
          </p>
          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button
              onClick={() => setFriendToRemove(null)}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "1px solid #3A3A3C",
                background: "#355070",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!friendToRemove) return;
                setIsRemovingFriend(true);
                try {
                  await removeFriend(friendToRemove.id);
                  setFriendToRemove(null);
                } catch (err) {
                  setTimedMessage(err?.message || "Failed to remove friend.", 5000);
                } finally {
                  setIsRemovingFriend(false);
                }
              }}
              disabled={isRemovingFriend}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: "#e56b6f",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: "bold",
                cursor: isRemovingFriend ? "not-allowed" : "pointer",
                opacity: isRemovingFriend ? 0.8 : 1,
              }}
            >
              {isRemovingFriend ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}
