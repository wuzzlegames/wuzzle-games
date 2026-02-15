import React from "react";
import {
  colorForMiniCell,
  colorForStatus,
  KEYBOARD_ROWS
} from "../lib/wordle";

export default function Keyboard({
  numBoards,
  selectedBoardIndex,
  perBoardLetterMaps,
  focusedLetterMap,
  gridCols,
  gridRows,
  onVirtualKey
}) {
  return (
    <div className="keyboardInner">
      {KEYBOARD_ROWS.map((row, rIndex) => (
        <div key={rIndex} className="keyboardRow">
          {row.map((key) => {
            const isEnter = key === "ENTER";
            const isBack = key === "BACK";
            const isLetter = /^[A-Z]$/.test(key);

            const isMultiNoFocus = numBoards > 1 && selectedBoardIndex == null;

            let baseBg = "#3A3A3C";

            if (!isMultiNoFocus && isLetter) {
              const map = selectedBoardIndex == null ? perBoardLetterMaps[0] : focusedLetterMap;
              const status = map && map[key] ? map[key] : "none";
              baseBg = status === "none" ? "#3A3A3C" : colorForStatus(status);
            }

            const display =
              key === "BACK" ? "⌫" : key === "ENTER" ? "Enter" : key;

            const showGridOverlay = isLetter && isMultiNoFocus;
            const multiStatuses = isLetter ? perBoardLetterMaps.map((m) => m[key] || "none") : [];

            return (
              <button
                key={key}
                onClick={() => onVirtualKey(key)}
                className={`keyBtn ${isEnter || isBack ? "keyBtnAction" : ""}`}
                style={{ backgroundColor: baseBg }}
                aria-label={key === "BACK" ? "Backspace" : key === "ENTER" ? "Enter" : key}
              >
                <div className={`keyLabel ${key === "BACK" ? "keyLabelBackspace" : ""}`}>
                  {display}
                </div>

                {showGridOverlay && (
                  <div
                    className="keyOverlayGrid"
                    style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
                  >
                    {multiStatuses.map((st, idx) => (
                      <div
                        key={idx}
                        className="keyOverlayCell"
                        style={{ backgroundColor: colorForMiniCell(st) }}
                      />
                    ))}

                    {Array.from({ length: gridCols * gridRows - numBoards }).map((_, i) => (
                      <div key={`pad-${i}`} className="keyOverlayPad" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
