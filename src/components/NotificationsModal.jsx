import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import BadgeIcon from "./BadgeIcon";
import { useAuth } from "../hooks/useAuth";
import { useBadgesForUser } from "../hooks/useUserBadges";
import { useNotificationSeen } from "../hooks/useNotificationSeen";
import { getAllEarnedSorted } from "../lib/badges";
import { CHALLENGE_EXPIRY_MS } from "../hooks/useNotificationSeen";
import "./NotificationsModal.css";

const buttonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#e56b6f",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: 11,
  cursor: "pointer",
};
const buttonSecondaryStyle = {
  ...buttonStyle,
  border: "1px solid #3A3A3C",
  background: "#355070",
};

/**
 * Single notification card: badge left, text right, Dismiss + View badges buttons.
 * Uses useBadgesForUser so must be a component (one per item).
 */
function NotificationReceivedCard({
  fromUserId,
  title,
  subline,
  isFriendRequest,
  onDismiss,
  onViewBadges,
}) {
  const { userBadges } = useBadgesForUser(fromUserId);
  const firstBadge = getAllEarnedSorted(userBadges)[0] ?? null;
  const cardClass = `notificationsModalCard${isFriendRequest ? " notificationsModalCard--friendRequest" : ""}`;
  return (
    <div className={cardClass} style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
      {firstBadge ? (
        <BadgeIcon badge={firstBadge} profileCard />
      ) : (
        <span
          style={{
            width: 80,
            minWidth: 80,
            background: "rgba(0,0,0,0.2)",
            borderRadius: "8px 0 0 8px",
          }}
          aria-hidden
        />
      )}
      <div className="notificationsModalCardContent" style={{ flex: 1 }}>
        <div className="notificationsModalCardTitle">{title}</div>
        <div className="notificationsModalCardSub">{subline}</div>
      </div>
      <div className="notificationsModalCardActions" style={{ padding: "12px 14px" }}>
        <button type="button" onClick={onDismiss} style={buttonSecondaryStyle}>
          Dismiss
        </button>
        <button type="button" onClick={onViewBadges} style={buttonStyle}>
          View badges
        </button>
      </div>
    </div>
  );
}

export default function NotificationsModal({ isOpen, onRequestClose }) {
  const navigate = useNavigate();
  const {
    user,
    isVerifiedUser,
    friendRequests,
    incomingChallenges,
    sentChallenges,
    declineFriendRequest,
    dismissChallenge,
    cancelSentChallenge,
  } = useAuth();
  const { markNotificationsSeen } = useNotificationSeen(user);

  useEffect(() => {
    if (isOpen && user?.uid) {
      markNotificationsSeen();
    }
  }, [isOpen, user?.uid, markNotificationsSeen]);

  const isChallengeExpired = (challenge) => {
    const createdAt = challenge.createdAt || 0;
    return createdAt + CHALLENGE_EXPIRY_MS < Date.now();
  };

  const handleDismissFriendRequest = async (requestId) => {
    try {
      await declineFriendRequest(requestId);
    } catch (err) {
      alert(err?.message || "Failed to dismiss");
    }
  };

  const handleViewBadgesFriendRequest = async (requestId) => {
    try {
      await declineFriendRequest(requestId);
      onRequestClose?.();
      navigate("/profile", { state: { openYourBadges: true } });
    } catch (err) {
      alert(err?.message || "Failed to dismiss");
    }
  };

  const handleDismissChallenge = async (ch) => {
    try {
      await dismissChallenge(ch.id, ch.gameCode);
    } catch (err) {
      alert(err?.message || "Failed to dismiss");
    }
  };

  const handleViewBadgesChallenge = async (ch) => {
    try {
      await dismissChallenge(ch.id, ch.gameCode);
      onRequestClose?.();
      navigate("/profile", { state: { openYourBadges: true } });
    } catch (err) {
      alert(err?.message || "Failed to dismiss");
    }
  };

  if (!user) return null;

  if (!isVerifiedUser) {
    return (
      <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
        <div style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
          <h2 style={{ margin: "0 0 16px 0", fontSize: "22px", fontWeight: "bold" }}>
            Notifications
          </h2>
          <p style={{ marginBottom: "16px", color: "#d7dadc", fontSize: "14px" }}>
            Verify your email or sign in with Google to see notifications.
          </p>
          <button
            type="button"
            onClick={onRequestClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#e56b6f",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const hasFriendRequests = friendRequests && friendRequests.length > 0;
  const hasChallenges = incomingChallenges && incomingChallenges.length > 0;
  const hasSentChallenges = sentChallenges && sentChallenges.length > 0;
  const hasAny = hasFriendRequests || hasChallenges || hasSentChallenges;

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div style={{ padding: "24px", maxHeight: "85vh", overflowY: "auto", width: "100%", boxSizing: "border-box" }}>
        <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: "bold" }}>
          Notifications
        </h2>

        {!hasAny ? (
          <p style={{ color: "#818384", fontSize: "14px", marginBottom: "20px" }}>
            No notifications right now.
          </p>
        ) : (
          <>
            {/* Friend requests: badge left, text right, Dismiss + View badges */}
            {hasFriendRequests && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#d7dadc", textAlign: "left" }}>
                  Friend Requests ({friendRequests.length})
                </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #3A3A3C" }}>
                  {friendRequests.map((request) => (
                    <NotificationReceivedCard
                      key={request.id}
                      fromUserId={request.id}
                      title={request.fromName || "Someone"}
                      subline="wants to be friends"
                      isFriendRequest
                      onDismiss={() => handleDismissFriendRequest(request.id)}
                      onViewBadges={() => handleViewBadgesFriendRequest(request.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Incoming challenges: badge left, text right, Dismiss + View badges */}
            {hasChallenges && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: "bold", color: "#d7dadc", textAlign: "left" }}>
                  Challenges
                </h3>
                <p style={{ margin: "0 0 12px 0", fontSize: 11, color: "#818384", textAlign: "left" }}>
                  Challenges expire 30 minutes after they&apos;re sent. Dismiss expired ones to clear them.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #3A3A3C" }}>
                  {incomingChallenges.map((ch) => {
                    const expired = isChallengeExpired(ch);
                    const subline = `${ch.boards || 1} board${(ch.boards || 1) > 1 ? "s" : ""} · ${ch.speedrun ? "Speedrun" : "Standard"} · ${expired ? "Expired" : "Active"}`;
                    return (
                      <NotificationReceivedCard
                        key={ch.id}
                        fromUserId={ch.fromUserId ?? null}
                        title={`Game invitation from ${ch.fromUserName || "Someone"}`}
                        subline={subline}
                        isFriendRequest={false}
                        onDismiss={() => handleDismissChallenge(ch)}
                        onViewBadges={() => handleViewBadgesChallenge(ch)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sent challenges: keep current UI (Cancel/Dismiss only) */}
            {hasSentChallenges && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "bold", color: "#d7dadc", textAlign: "left" }}>
                  Sent challenges
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #3A3A3C" }}>
                  {sentChallenges.map((ch) => {
                    const expired = isChallengeExpired(ch);
                    return (
                      <div
                        key={ch.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 8,
                          border: "1px solid #3A3A3C",
                          background: "#372F41",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <div style={{ textAlign: "left", flex: 1 }}>
                          <div style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>
                            Challenge to {ch.toUserName || "friend"}
                          </div>
                          <div style={{ color: "#d7dadc", fontSize: 12 }}>
                            {ch.boards || 1} board{(ch.boards || 1) > 1 ? "s" : ""} · {ch.speedrun ? "Speedrun" : "Standard"}
                            <span style={{ marginLeft: 8, fontSize: 11, color: expired ? "#818384" : "#50a339", fontWeight: "600" }}>
                              {expired ? "Expired" : "Active"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await cancelSentChallenge(ch.gameCode || ch.id);
                            } catch (err) {
                              alert(err?.message || "Failed to dismiss");
                            }
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #3A3A3C",
                            background: "#355070",
                            color: expired ? "#818384" : "#ffffff",
                            fontWeight: "bold",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          {expired ? "Dismiss" : "Cancel"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: 8 }}>
          <button
            type="button"
            onClick={onRequestClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#e56b6f",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
