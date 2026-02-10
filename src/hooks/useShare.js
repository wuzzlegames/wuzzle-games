import { useCallback } from "react";
import { isMobileDevice } from "../lib/gameUtils";

function buildMultiplayerShareText(code) {
  let roomUrl = "";

  try {
    if (typeof window !== "undefined" && window.location) {
      const { origin, pathname } = window.location;
      const GAME_PATH = "/game";
      const idx = pathname.indexOf(GAME_PATH);
      const basePath = idx !== -1 ? pathname.slice(0, idx) : "";
      const fullPath = `${basePath}${GAME_PATH}`;
      roomUrl = `${origin}${fullPath}?mode=multiplayer&code=${code}`;
    }
  } catch (e) {
    // Ignore and fall back to relative URL below
  }

  if (!roomUrl) {
    roomUrl = `/game?mode=multiplayer&code=${code}`;
  }

  return `Join my Wuzzle Games multiplayer game\nLink: ${roomUrl}\nRoom code: ${code}`;
}

/**
 * Hook for sharing game results and multiplayer game codes.
 */
export function useShare(shareText, setTimedMessage) {
  const handleShare = useCallback(async () => {
    const isMobile = isMobileDevice();

    try {
      // Mobile: Use native share API when available
      if (isMobile && navigator.share) {
        try {
          await navigator.share({
            title: "Wuzzle Games",
            text: shareText,
          });
          return; // Successfully shared
        } catch (shareErr) {
          // If user cancelled, just exit silently
          if (shareErr.name === "AbortError") {
            return;
          }
          // If share failed, fall through to clipboard
          console.error("Share failed, falling back to clipboard:", shareErr);
        }
      }

      // Desktop (or mobile if share failed): Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        setTimedMessage("Copied to clipboard!", 2000);
      } else {
        // Fallback for older browsers that don't support clipboard API
        const textArea = document.createElement("textarea");
        textArea.value = shareText;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.padding = "0";
        textArea.style.border = "none";
        textArea.style.outline = "none";
        textArea.style.boxShadow = "none";
        textArea.style.background = "transparent";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand("copy");
          if (successful) {
            setTimedMessage("Copied to clipboard!", 2000);
          } else {
            setTimedMessage("Failed to copy. Please copy manually.", 3000);
          }
        } catch (err) {
          console.error("Fallback copy failed:", err);
          setTimedMessage("Failed to copy. Please copy manually.", 3000);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Error in handleShare:", err);
      setTimedMessage("Failed to copy. Please copy manually.", 3000);
    }
  }, [shareText, setTimedMessage]);

  const handleShareCode = useCallback(
    async (code) => {
      const isMobile = isMobileDevice();
      const text = buildMultiplayerShareText(code);

      try {
        // Mobile: Use native share API
        if (isMobile && navigator.share) {
          try {
            await navigator.share({
              title: "Join my Wuzzle Games game!",
              text,
            });
            return;
          } catch (shareErr) {
            if (shareErr.name === "AbortError") {
              return;
            }
            console.error("Share failed, falling back to clipboard:", shareErr);
          }
        }

        // Desktop (or mobile if share failed): Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setTimedMessage("Code copied to clipboard!", 2000);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.top = "0";
          textArea.style.left = "0";
          textArea.style.width = "2em";
          textArea.style.height = "2em";
          textArea.style.padding = "0";
          textArea.style.border = "none";
          textArea.style.outline = "none";
          textArea.style.boxShadow = "none";
          textArea.style.background = "transparent";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            const successful = document.execCommand("copy");
            if (successful) {
              setTimedMessage("Code copied to clipboard!", 2000);
            }
          } catch (err) {
            console.error("Fallback copy failed:", err);
          }
          document.body.removeChild(textArea);
        }
      } catch (err) {
        console.error("Error in handleShareCode:", err);
      }
    },
    [setTimedMessage]
  );

  return { handleShare, handleShareCode };
}
