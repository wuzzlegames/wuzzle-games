import { useEffect, useRef } from "react";

export function useKeyboard({ disabled, onEnter, onBackspace, onLetter }) {
  const disabledRef = useRef(disabled);
  const onEnterRef = useRef(onEnter);
  const onBackspaceRef = useRef(onBackspace);
  const onLetterRef = useRef(onLetter);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onEnterRef.current = onEnter;
  }, [onEnter]);

  useEffect(() => {
    onBackspaceRef.current = onBackspace;
  }, [onBackspace]);

  useEffect(() => {
    onLetterRef.current = onLetter;
  }, [onLetter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabledRef.current) return;

      // Check if the event target is an input, textarea, or contentEditable element
      // This prevents the game from capturing keyboard input when user is typing in chat or other inputs
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          (typeof target.getAttribute === 'function' && target.getAttribute('data-chat-input') === 'true') ||
          (typeof target.closest === 'function' && target.closest('input')) ||
          (typeof target.closest === 'function' && target.closest('textarea')) ||
          (typeof target.closest === 'function' && target.closest('[contenteditable="true"]')) ||
          (typeof target.closest === 'function' && target.closest('[data-chat-input="true"]')))
      ) {
        return;
      }

      const raw = e.key;

      if (raw === "Backspace") {
        e.preventDefault();
        onBackspaceRef.current?.();
        return;
      }

      if (raw === "Enter") {
        e.preventDefault();
        onEnterRef.current?.();
        return;
      }

      const key = raw.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        onLetterRef.current?.(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
