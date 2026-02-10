import React, { useEffect } from "react";
import BadgeIcon from "./BadgeIcon";
import "./NotificationToast.css";

const DEFAULT_DURATION_MS = 5000;

export default function NotificationToast({
  message,
  badge,
  onClick,
  onDismiss,
  durationMs = DEFAULT_DURATION_MS,
}) {
  useEffect(() => {
    if (!message || !onDismiss) return;
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  if (!message) return null;

  const text = typeof message === "string" ? message : String(message);
  const showBadge = badge && typeof badge === "object" && badge.id && badge.name;

  return (
    <button
      type="button"
      onClick={onClick}
      role="status"
      aria-live="polite"
      aria-label={`${text} Click to view notifications`}
      className="notificationToast"
    >
      {showBadge ? (
        <>
          <span className="notificationToast-badgeWrap">
            <BadgeIcon badge={badge} profileCard />
          </span>
          <span className="notificationToast-text">
            <span className="notificationToast-message">{text}</span>
            <span className="notificationToast-cta">Click to view</span>
          </span>
        </>
      ) : (
        <>
          <span className="notificationToast-message">{text}</span>
          <span className="notificationToast-cta" style={{ fontSize: 12, opacity: 0.9 }}>
            Click to view
          </span>
        </>
      )}
    </button>
  );
}
