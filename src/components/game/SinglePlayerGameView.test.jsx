import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SinglePlayerGameView from './SinglePlayerGameView';

vi.mock('../Keyboard', () => ({
  __esModule: true,
  default: () => <div data-testid="keyboard" />, // eslint-disable-line react/display-name
}));

vi.mock('./BoardSelector', () => ({
  __esModule: true,
  default: () => <div data-testid="board-selector" />, // eslint-disable-line react-display-name
}));

// We only care here that SinglePlayerGameView wires turnsUsed through to
// GameStatusBar correctly. This was previously buggy because the component
// summed all guesses across boards instead of using the global turnsUsed
// (max rows across boards), so a single guess on N boards looked like N
// guesses in the UI.

describe('SinglePlayerGameView guess counter wiring', () => {
  function renderView(overrides = {}) {
    const baseBoards = [
      { guesses: Array.from({ length: 3 }, () => ({ word: 'APPLE', colors: [] })), isSolved: false, isDead: false },
      { guesses: Array.from({ length: 3 }, () => ({ word: 'BERRY', colors: [] })), isSolved: false, isDead: false },
    ];

    const props = {
      mode: 'daily',
      numBoards: 2,
      speedrunEnabled: false,
      allSolved: false,
      finished: false,
      solutionsText: '',
      message: '',
      boards: baseBoards,
      maxTurns: 10,
      turnsUsed: 3, // global turns used should be 3, not 6
      isUnlimited: false,
      currentGuess: '',
      invalidCurrentGuess: false,
      revealId: 0,
      selectedBoardIndex: null,
      setSelectedBoardIndex: () => {},
      boardRefs: { current: {} },
      gridCols: 2,
      gridRows: 1,
      perBoardLetterMaps: [{}, {}],
      focusedLetterMap: null,
      showNextStageBar: false,
      marathonNextBoards: null,
      goNextStage: () => {},
      showBoardSelector: false,
      setShowBoardSelector: () => {},
      statusText: '',
      showOutOfGuesses: false,
      exitFromOutOfGuesses: () => {},
      continueAfterOutOfGuesses: () => {},
      showPopup: false,
      score: 0,
      stageElapsedMs: 0,
      popupTotalMs: 0,
      formatElapsed: (ms) => `00:00.${Math.floor((ms % 1000) / 100)}`,
      solvedCount: 0,
      marathonHasNext: false,
      handleShare: () => {},
      freezeStageTimer: () => 0,
      isMarathonSpeedrun: false,
      commitStageIfNeeded: () => {},
      handleVirtualKey: () => {},
      showFeedbackModal: false,
      setShowFeedbackModal: () => {},
      setShowPopup: () => {},
      setShowOutOfGuesses: () => {},
      showComments: false,
      commentThreadId: null,
      ...overrides,
    };

    render(<SinglePlayerGameView {...props} />);
  }

  it('shows guesses equal to global turnsUsed, not sum of per-board guesses', () => {
    renderView();

    // In non-speedrun mode, GameStatusBar renders center text like:
    // "Guesses: {turnsUsed}/{maxTurns}".
    // With the bug, this would have shown "Guesses: 6/10" for the fixture
    // (3 guesses on each of 2 boards). The correct value is "Guesses: 3/10".
    expect(screen.getByText('Guesses: 3/10')).toBeInTheDocument();
  });

  it('renders keyboard and board selector when stage is not finished', () => {
    renderView({ showBoardSelector: true });

    expect(screen.getByTestId('keyboard')).toBeInTheDocument();
    expect(screen.getByTestId('board-selector')).toBeInTheDocument();
  });

  it('hides keyboard and board selector once stage is finished', () => {
    renderView({ finished: true, showBoardSelector: true });

    expect(screen.queryByTestId('keyboard')).toBeNull();
    expect(screen.queryByTestId('board-selector')).toBeNull();
  });

  it('shows "Timer starts in 3" overlay when speedrun and countdown active', () => {
    renderView({ speedrunEnabled: true, countdownRemaining: 3 });

    expect(screen.getByText('Timer starts in 3')).toBeInTheDocument();
  });
});
