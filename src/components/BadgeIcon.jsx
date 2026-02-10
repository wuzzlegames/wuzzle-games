import React from "react";
import "./BadgeIcon.css";

/** @type {Record<string, string>} - Maps image path to resolved URL */
const BADGE_IMAGES = import.meta.glob("../../images/*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

/**
 * Badge icon using images from the images folder. Image filename must match badge name (e.g. "Party starter.png").
 *
 * @param {object} props
 * @param {{ id: string; name: string; description: string }} props.badge - Badge definition
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.size] - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} [props.title] - Accessible title/tooltip (defaults to badge.name)
 * @param {boolean} [props.profileCard] - When true, renders as full-height left section for profile badge cards
 */
export default function BadgeIcon({ badge, className = "", size = "md", title, profileCard = false }) {
  const imagePath = `../../images/${badge.name}.png`;
  const src = BADGE_IMAGES[imagePath] || null;
  const label = title ?? badge.name;

  if (!src) {
    return (
      <span
        className={`badgeIcon badgeIcon--${size} ${profileCard ? "badgeIcon--profileCard" : ""} ${className}`.trim()}
        role="img"
        aria-label={label}
        title={label}
      >
        ?
      </span>
    );
  }

  return (
    <span
      className={`badgeIcon badgeIcon--${size} ${profileCard ? "badgeIcon--profileCard" : ""} ${className}`.trim()}
      role="img"
      aria-label={label}
      title={label}
    >
      <img src={src} alt="" className="badgeIcon-img" aria-hidden="true" />
    </span>
  );
}
