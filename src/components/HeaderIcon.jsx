import React, { useState } from "react";

const ICON_SIZE = 32;
const SLOT_WIDTH = 40;

/**
 * Fallback SVG icons when image fails to load. Simple shapes for consistent layout.
 */
const FALLBACK_SVG = {
  logo: (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 10.5L12 3L20 10.5V20H14V14H10V20H4V10.5Z" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  leaderboard: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7 12l2 4 4-8 4 12H7z" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  notifications: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="var(--c-text-strong)" />
    </svg>
  ),
  hamburger: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 6h18M3 12h18M3 18h18" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  "sign-in": (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  "sign-out": (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  friends: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 108 0 4 4 0 00-8 0zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  challenges: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--c-text-strong)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/**
 * Icon that loads from public/images/{name}.png with fallback when image is missing.
 * Fixed size for header alignment.
 */
export function HeaderIcon({ name, alt, size = ICON_SIZE, style = {} }) {
  const [useFallback, setUseFallback] = useState(false);
  const src = `/images/${name}.png`;
  const fallback = FALLBACK_SVG[name];

  return (
    <span
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      {useFallback || !name ? (
        fallback || null
      ) : (
        <img
          src={src}
          alt={alt || ""}
          width={size}
          height={size}
          style={{ display: "block", objectFit: "contain" }}
          onError={() => setUseFallback(true)}
        />
      )}
    </span>
  );
}

export const HEADER_ICON_SIZE = ICON_SIZE;
export const HEADER_SLOT_WIDTH = SLOT_WIDTH;
