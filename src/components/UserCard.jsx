import React, { useState } from "react";
import BadgeIcon from "./BadgeIcon";
import Modal from "./Modal";
import "./UserCard.css";

/**
 * Single-line user card showing username, context badges (e.g. Host), and earned badge icon.
 * Use wherever a username is displayed (header, waiting room, leaderboard, etc.).
 *
 * @param {string} username - Display name
 * @param {Array} [badges] - Context badges (e.g. [{ id, label }] for "Host").
 * @param {Array<{ id: string; name: string; description: string }>} [earnedBadges] - Earned badge defs. Shows latest as icon; click reveals all.
 * @param {boolean} [isYou] - Append " (You)" when true
 * @param {string} [href] - If set, card main part is clickable (use with onClick).
 * @param {function} [onClick] - Optional click handler for main part (e.g. navigate to profile).
 * @param {string} [className] - Additional CSS class
 * @param {string} [size] - 'sm' | 'md' (default: 'md')
 */
export default function UserCard({
  username,
  badges = [],
  earnedBadges = [],
  isYou = false,
  href,
  onClick,
  className = "",
  size = "md",
}) {
  const displayName = username || "Player";
  const suffix = isYou ? " (You)" : "";
  const isMainClickable = !!(href || onClick);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  const latestEarned = earnedBadges.length > 0 ? earnedBadges[0] : null;
  const hasEarnedBadges = earnedBadges.length > 0;

  const mainContent = (
    <>
      <span className="userCard-name">
        {displayName}
        {suffix}
      </span>
      <div className="userCard-badges" aria-hidden="true">
        {badges.length > 0
          ? badges.map((b) => (
              <span
                key={b.id || b.label}
                className="userCard-badge"
                title={typeof b === "object" && b.label ? b.label : undefined}
              >
                {typeof b === "object" && b.icon != null ? b.icon : null}
                {typeof b === "object" && b.label ? b.label : String(b)}
              </span>
            ))
          : null}
      </div>
    </>
  );

  const baseClass = `userCard userCard--${size} ${className}`.trim();
  const iconSize = size === "sm" ? "sm" : "md";
  const badgesModalTitle = isYou ? "Your badges" : "Badges";

  return (
    <div className={baseClass} role="presentation">
      {isMainClickable ? (
        <button
          type="button"
          className="userCard-main userCard--clickable"
          onClick={onClick}
          aria-label={isYou ? `${displayName} (You) – go to profile` : `${displayName} – go to profile`}
        >
          {mainContent}
        </button>
      ) : (
        <div className="userCard-main">{mainContent}</div>
      )}

      {hasEarnedBadges && latestEarned && (
        <div className="userCard-earnedWrap">
          <button
            type="button"
            className="userCard-earnedIcon"
            onClick={(e) => {
              e.stopPropagation();
              setBadgesModalOpen(true);
            }}
            aria-label={`Badge: ${latestEarned.name}. Click to see all badges.`}
            aria-expanded={badgesModalOpen}
          >
            <BadgeIcon badge={latestEarned} size={iconSize} />
          </button>
          <Modal
            isOpen={badgesModalOpen}
            onRequestClose={() => setBadgesModalOpen(false)}
            titleId="userCard-badges-modal-title"
            panelClassName="userCard-badgesModalPanel"
          >
            <div className="userCard-badgesModalContent">
              <h2 id="userCard-badges-modal-title" className="userCard-badgesModalTitle">
                {badgesModalTitle}
              </h2>
              <div className="userCard-badgesModalList">
                {earnedBadges.map((b) => (
                  <div key={b.id} className="userCard-badgesModalItem">
                    <BadgeIcon badge={b} profileCard />
                    <div className="userCard-badgesModalItemText">
                      <div className="userCard-badgesModalItemName">{b.name}</div>
                      {b.description ? (
                        <div className="userCard-badgesModalItemDesc">{b.description}</div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Modal>
        </div>
      )}
    </div>
  );
}
