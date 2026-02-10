import { useMemo } from "react";
import { buildLetterMapFromGuesses } from "../lib/wordle";

/**
 * Shared hook for multi-board layout concerns used by both single-player and multiplayer.
 * - Computes per-board letter maps for keyboard coloring.
 * - Computes a square-ish grid (cols/rows) for board layout.
 */
export function useBoardLayout(boards, selectedBoardIndex, numBoards) {
  const safeBoards = Array.isArray(boards) ? boards : [];
  const perBoardLetterMaps = useMemo(
    () => safeBoards.map((b) => buildLetterMapFromGuesses(Array.isArray(b?.guesses) ? b.guesses : [])),
    [safeBoards]
  );

  const focusedLetterMap = useMemo(() => {
    if (selectedBoardIndex == null) return null;
    return perBoardLetterMaps[selectedBoardIndex] || null;
  }, [selectedBoardIndex, perBoardLetterMaps]);

  const gridCols = useMemo(
    () => Math.ceil(Math.sqrt(Math.max(numBoards || safeBoards.length || 1, 1))),
    [numBoards, safeBoards.length]
  );

  const gridRows = useMemo(
    () => Math.ceil((numBoards || safeBoards.length || 1) / gridCols),
    [numBoards, safeBoards.length, gridCols]
  );

  return { perBoardLetterMaps, focusedLetterMap, gridCols, gridRows };
}
