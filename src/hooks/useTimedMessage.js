import { useCallback, useEffect, useRef, useState } from "react";
import { MESSAGE_TIMEOUT_MS, LONG_MESSAGE_TIMEOUT_MS } from "../lib/gameConstants";

/**
 * Hook to manage a transient message with an auto-clear timer.
 */
export function useTimedMessage(initialMessage = "") {
  const [message, setMessage] = useState(initialMessage);
  const timeoutRef = useRef(null);

  const clearMessageTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setTimedMessage = useCallback(
    (text, ms = MESSAGE_TIMEOUT_MS) => {
      clearMessageTimer();
      setMessage(text);
      timeoutRef.current = setTimeout(() => {
        setMessage("");
        timeoutRef.current = null;
      }, ms);
    },
    [clearMessageTimer]
  );

  useEffect(() => {
    return () => clearMessageTimer();
  }, [clearMessageTimer]);

  return { message, setMessage, setTimedMessage, clearMessageTimer };
}
