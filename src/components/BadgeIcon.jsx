import React from "react";
import "./BadgeIcon.css";

/**
 * Badge icon using images from the /images folder (served from public). Image filename must match badge name (e.g. "Party starter.png").
 *
 * @param {object} props
 * @param {{ id: string; name: string; description: string }} props.badge - Badge definition
 * @param {string} [props.className] - Additional CSS class
 * @param {string} [props.size] - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} [props.title] - Accessible title/tooltip (defaults to badge.name)
 * @param {boolean} [props.profileCard] - When true, renders as full-height left section for profile badge cards
 */
export default function BadgeIcon({ badge, className = "", size = "md", title, profileCard = false }) {
  // Use absolute path from public folder - Vercel serves these correctly
  const src = `/images/${badge.name}.png`;
  const label = title ?? badge.name;

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
