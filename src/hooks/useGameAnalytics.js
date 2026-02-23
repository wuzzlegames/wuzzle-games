/**
 * Custom hook for game analytics tracking
 * 
 * This hook provides a clean interface for tracking game events
 * and automatically handles the lifecycle of game sessions.
 */

import { useEffect, useRef } from 'react';
import {
  trackGameStarted,
  trackGameCompleted,
  trackDailyPuzzlePlayed,
  trackMultiplayerStarted
} from '../lib/analytics';

/**
 * Hook to track single-player game lifecycle
 * @param {Object} params - Game parameters
 * @param {string} params.mode - Game mode (daily, marathon, solutionhunt)
 * @param {number} params.numBoards - Number of boards
 * @param {boolean} params.speedrunEnabled - Whether speedrun is enabled
 * @param {boolean} params.finished - Whether game is finished
 * @param {boolean} params.allSolved - Whether all boards are solved
 * @param {number} params.currentTurn - Current turn number
 * @param {string} params.puzzleDate - Date of puzzle (for daily mode)
 */
export function useSinglePlayerGameAnalytics({
  mode,
  numBoards,
  speedrunEnabled,
  finished,
  allSolved,
  currentTurn,
  puzzleDate
}) {
  const hasTrackedStart = useRef(false);
  const hasTrackedCompletion = useRef(false);

  // Track game start (once per session)
  useEffect(() => {
    if (!hasTrackedStart.current && mode && numBoards) {
      const puzzleType = numBoards > 1 ? 'multi-board' : 'single';
      trackGameStarted(mode, puzzleType, numBoards);
      hasTrackedStart.current = true;

      // Track daily puzzle specifically
      if (mode === 'daily' && puzzleDate) {
        trackDailyPuzzlePlayed(puzzleDate, numBoards);
      }
    }
  }, [mode, numBoards, puzzleDate]);

  // Track game completion (once per session)
  useEffect(() => {
    if (!hasTrackedCompletion.current && finished && mode) {
      const modeWithVariant = speedrunEnabled ? `${mode}_speedrun` : mode;
      trackGameCompleted(modeWithVariant, currentTurn, allSolved);
      hasTrackedCompletion.current = true;
    }
  }, [finished, mode, speedrunEnabled, currentTurn, allSolved]);

  // Reset tracking when mode or boards change (new game session)
  useEffect(() => {
    hasTrackedStart.current = false;
    hasTrackedCompletion.current = false;
  }, [mode, numBoards]);
}

/**
 * Hook to track multiplayer game lifecycle
 * @param {Object} params - Game parameters
 * @param {string} params.roomType - Type of room (public, private, challenge)
 * @param {string} params.status - Game status
 * @param {number} params.playerCount - Number of players
 * @param {string} params.winner - Winner ID (if game is complete)
 */
export function useMultiplayerGameAnalytics({
  roomType,
  status,
  playerCount,
  winner
}) {
  const hasTrackedStart = useRef(false);
  const hasTrackedCompletion = useRef(false);

  // Track multiplayer game start
  useEffect(() => {
    if (!hasTrackedStart.current && status === 'playing' && roomType) {
      trackMultiplayerStarted(roomType, playerCount);
      hasTrackedStart.current = true;
    }
  }, [status, roomType, playerCount]);

  // Track multiplayer game completion
  useEffect(() => {
    if (!hasTrackedCompletion.current && winner && status === 'finished') {
      // Track completion - you can extend this with more details
      hasTrackedCompletion.current = true;
    }
  }, [winner, status]);

  // Reset when room changes
  useEffect(() => {
    hasTrackedStart.current = false;
    hasTrackedCompletion.current = false;
  }, [roomType]);
}
