import React from "react";
import { formatArchiveDate } from "../../lib/archiveService";

export default function GameHeader({
  mode,
  numBoards,
  speedrunEnabled,
  archiveDate = null,
}) {
  let title = "WUZZLE GAMES";

  if (archiveDate) {
    const formattedDate = formatArchiveDate(archiveDate);
    if (mode === "marathon") {
      title = `ARCHIVE OF ${formattedDate.toUpperCase()} · MARATHON (${numBoards} boards)`;
    } else if (mode === "daily") {
      title = `ARCHIVE OF ${formattedDate.toUpperCase()} · DAILY`;
    } else {
      title = `ARCHIVE OF ${formattedDate.toUpperCase()}`;
    }
    if (speedrunEnabled) title += " · SPEEDRUN";
  } else if (mode === "marathon") {
    title = `MARATHON (${numBoards} boards)`;
  } else if (mode === "daily") {
    title = "DAILY GAME";
  } else if (mode === "multiplayer") {
    title = `MULTIPLAYER (${numBoards} board${numBoards > 1 ? "s" : ""})`;
  }

  if (!archiveDate && speedrunEnabled) {
    title += " · SPEEDRUN";
  }

  return (
    <div
      style={{
        marginTop: 8,
        marginBottom: 8,
        padding: "0 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          letterSpacing: 2,
          fontSize: 14,
        }}
      >
        {title}
      </div>
    </div>
  );
}
