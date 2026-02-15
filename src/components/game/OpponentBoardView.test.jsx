import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

import OpponentBoardView from './OpponentBoardView';

let container;

beforeEach(() => {
  container = undefined;
});

describe('OpponentBoardView', () => {
  it('renders the correct number of rows based on opponentColors and maxTurns', () => {
    const renderResult = render(
      <OpponentBoardView
        opponentColors={[[0, 0, 0, 0, 0], [1, 1, 1, 1, 1]]}
        opponentGuesses={['AAAAA', 'BBBBB']}
        maxTurns={6}
        solution="APPLE"
        playerSolved={false}
      />,
    );
    container = renderResult.container;

    // rowsToShow = min(numGuesses + 1, max(maxTurns, numGuesses + 1))
    // numGuesses = 2, maxTurns = 6 -> rowsToShow = min(3, 6) = 3
    const rows = container.querySelectorAll('div[style*="max-width: 180px"]');
    expect(rows.length).toBe(3);
  });

  it('shows Solved/Failed labels and falls back to guesses/maxTurns when in standard mode', () => {
    // Solved case
    let result = render(
      <OpponentBoardView
        opponentColors={[[2, 2, 2, 2, 2]]}
        opponentGuesses={['APPLE']}
        maxTurns={6}
        solution="APPLE"
        playerSolved={false}
        isSpeedrun={false}
      />,
    );
    let header = result.getByText('Solved');
    expect(header).toBeInTheDocument();

    // Failed case: not solved and guesses >= maxTurns
    result.unmount();
    result = render(
      <OpponentBoardView
        opponentColors={Array.from({ length: 6 }, () => [0, 0, 0, 0, 0])}
        opponentGuesses={Array.from({ length: 6 }, () => 'OTHER')}
        maxTurns={6}
        solution="APPLE"
        playerSolved={false}
        isSpeedrun={false}
      />,
    );
    header = result.getByText('Failed');
    expect(header).toBeInTheDocument();

    // Ongoing case: label shows numGuesses/maxTurns
    result.unmount();
    result = render(
      <OpponentBoardView
        opponentColors={[[0, 0, 0, 0, 0]]}
        opponentGuesses={['OTHER']}
        maxTurns={6}
        solution="APPLE"
        playerSolved={false}
        isSpeedrun={false}
      />,
    );
    header = result.getByText('1/6');
    expect(header).toBeInTheDocument();
  });

  it('uses colours from opponentColors for tiles', () => {
    const renderResult = render(
      <OpponentBoardView
        opponentColors={[[2, 1, 0, 0, 0]]}
        opponentGuesses={['APPLE']}
        maxTurns={6}
        solution="APPLE"
        playerSolved
      />,
    );
    container = renderResult.container;

    const tiles = container.querySelectorAll('div[style*="width: 32px"]');

    // First tile: color=2 -> green
    expect(tiles[0].style.background).toBe('rgb(80, 163, 57)');

    // Second tile: color=1 -> yellow-ish
    expect(tiles[1].style.background).toBe('rgb(177, 160, 76)');

    // Third tile: color=0 -> gray
    expect(tiles[2].style.background).toBe('rgb(58, 58, 60)');
  });

  it('shows letters only when playerSolved is true and hideLetters is false', () => {
    // When playerSolved true and not hiding letters, opponent letters displayed
    let result = render(
      <OpponentBoardView
        opponentColors={[[2, 2, 2, 2, 2]]}
        opponentGuesses={['apple']}
        maxTurns={6}
        solution="apple"
        playerSolved
        hideLetters={false}
      />,
    );
    expect(result.container).toHaveTextContent('APPLE');

    // When hideLetters is true, letters are hidden
    result.unmount();
    result = render(
      <OpponentBoardView
        opponentColors={[[2, 2, 2, 2, 2]]}
        opponentGuesses={['apple']}
        maxTurns={6}
        solution="apple"
        playerSolved
        hideLetters
      />,
    );
    expect(result.container).not.toHaveTextContent('APPLE');

    // When playerSolved is false, letters are also hidden
    result.unmount();
    result = render(
      <OpponentBoardView
        opponentColors={[[2, 2, 2, 2, 2]]}
        opponentGuesses={['apple']}
        maxTurns={6}
        solution="apple"
        playerSolved={false}
        hideLetters={false}
      />,
    );
    expect(result.container).not.toHaveTextContent('APPLE');
  });
});
