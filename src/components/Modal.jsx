import React, { useEffect, useRef } from "react";
import "./Modal.css";

function getFocusable(container) {
  if (!container) return [];
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");
  return Array.from(container.querySelectorAll(selectors));
}

export default function Modal({
  isOpen,
  titleId,
  onRequestClose,
  children,
  zIndex = 2000,
  disableAutoFocus = false,
  panelClassName = "",
}) {
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    lastFocusedRef.current = document.activeElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusFirst = () => {
      if (disableAutoFocus) return;
      // If the user has already focused something inside the modal (e.g.
      // clicked the "Enter Game Code" input), do not steal focus back to
      // the first button.
      const active = document.activeElement;
      if (active && panelRef.current && panelRef.current.contains(active)) {
        return;
      }

      const focusables = getFocusable(panelRef.current);
      if (focusables.length > 0) focusables[0].focus();
      else panelRef.current?.focus();
    };

    // allow layout to paint first
    const t = window.setTimeout(focusFirst, 0);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onRequestClose?.();
        return;
      }

      if (e.key !== "Tab") return;

      const focusables = getFocusable(panelRef.current);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === "function") {
        lastFocusedRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" style={{ zIndex }} onMouseDown={onRequestClose}>
      <div
        className={`modalPanel ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
