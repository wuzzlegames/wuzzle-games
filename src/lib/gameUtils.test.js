import { describe, it, expect } from 'vitest';
import { generateShareText, shareTextWithoutFooter } from './gameUtils.js';

// Helper to create a board object
function makeBoard(guesses, isSolved) {
  return {
    guesses: guesses.map((g) => ({ word: g.word, colors: g.colors ?? [] })),
    isSolved,
  };
}

describe('generateShareText', () => {
  it('matches Daily standard - 1 word - solved in guess limit', () => {
    const boards = [
      makeBoard(
        [
          { word: 'GUESS1', colors: ['yellow', 'grey', 'grey', 'grey', 'green'] },
          { word: 'GUESS2', colors: ['green', 'green', 'green', 'green', 'green'] },
        ],
        true,
      ),
    ];

    const text = generateShareText(
      boards,
      'daily',
      1,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      2,
      6,
      true,
      1,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      '🟨⬛⬛⬛🟩',
      '🟩🟩🟩🟩🟩',
      '',
      'Guesses: 2/6',
      'Solved!',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily standard - 1 word - not solved in guess limit - exit', () => {
    const boards = [
      makeBoard(
        [
          { word: 'G1', colors: ['yellow', 'grey', 'grey', 'grey', 'green'] },
          { word: 'G2', colors: ['yellow', 'yellow', 'grey', 'grey', 'grey'] },
          { word: 'G3', colors: ['grey', 'grey', 'grey', 'yellow', 'grey'] },
          { word: 'G4', colors: ['yellow', 'yellow', 'grey', 'grey', 'grey'] },
          { word: 'G5', colors: ['grey', 'grey', 'yellow', 'grey', 'yellow'] },
          { word: 'G6', colors: ['grey', 'yellow', 'grey', 'grey', 'yellow'] },
        ],
        false,
      ),
    ];

    const text = generateShareText(
      boards,
      'daily',
      1,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      6,
      6,
      false,
      0,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      '🟨⬛⬛⬛🟩',
      '🟨🟨⬛⬛⬛',
      '⬛⬛⬛🟨⬛',
      '🟨🟨⬛⬛⬛',
      '⬛⬛🟨⬛🟨',
      '⬛🟨⬛⬛🟨',
      '',
      'Guesses: 6/6',
      'Not solved!',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily standard - 1 word - not solved in guess limit - continue - solve', () => {
    const boards = [
      makeBoard(
        [
          { word: 'G1', colors: ['grey', 'yellow', 'grey', 'grey', 'grey'] },
          { word: 'G2', colors: ['yellow', 'grey', 'grey', 'grey', 'yellow'] },
          { word: 'G3', colors: ['yellow', 'grey', 'grey', 'grey', 'green'] },
          { word: 'G4', colors: ['grey', 'grey', 'yellow', 'grey', 'yellow'] },
          { word: 'G5', colors: ['grey', 'grey', 'grey', 'yellow', 'grey'] },
          { word: 'G6', colors: ['grey', 'yellow', 'grey', 'grey', 'yellow'] },
          { word: 'G7', colors: ['green', 'green', 'green', 'green', 'green'] },
        ],
        true,
      ),
    ];

    const text = generateShareText(
      boards,
      'daily',
      1,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      7,
      6,
      true,
      1,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      '⬛🟨⬛⬛⬛',
      '🟨⬛⬛⬛🟨',
      '🟨⬛⬛⬛🟩',
      '⬛⬛🟨⬛🟨',
      '⬛⬛⬛🟨⬛',
      '⬛🟨⬛⬛🟨',
      '🟩🟩🟩🟩🟩',
      '',
      'Guesses: 7/6',
      'Solved!',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily standard - multiple words - solve in guess limit', () => {
    const boards = [makeBoard([], true), makeBoard([], true)];

    const text = generateShareText(
      boards,
      'daily',
      2,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      4,
      7,
      true,
      2,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      'Boards: 2',
      'Guesses used: 4/7',
      'Solved: 2/2',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily standard - multiple words - not solved in guess limit - exit', () => {
    const boards = [makeBoard([], false), makeBoard([], false)];

    const text = generateShareText(
      boards,
      'daily',
      2,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      7,
      7,
      false,
      0,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      'Boards: 2',
      'Guesses used: 7/7',
      'Solved: 0/2',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily standard - multiple words - not solved in guess limit - continue - solve', () => {
    const boards = [
      makeBoard([], true),
      makeBoard([], true),
      makeBoard([], true),
      makeBoard([], true),
      makeBoard([], true),
    ];

    const text = generateShareText(
      boards,
      'daily',
      5,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      11,
      10,
      true,
      5,
    );

    const expected = [
      'Wuzzle Games - Daily Standard',
      '',
      'Boards: 5',
      'Guesses used: 11/10',
      'Solved: 5/5',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily speedrun - 1 board', () => {
    const boards = [
      makeBoard(
        [
          { word: 'G1', colors: ['grey', 'grey', 'grey', 'grey', 'grey'] },
          { word: 'G2', colors: ['grey', 'grey', 'grey', 'grey', 'yellow'] },
          { word: 'G3', colors: ['yellow', 'yellow', 'grey', 'grey', 'yellow'] },
          { word: 'G4', colors: ['green', 'grey', 'grey', 'grey', 'yellow'] },
          { word: 'G5', colors: ['green', 'green', 'green', 'green', 'green'] },
        ],
        true,
      ),
    ];

    const text = generateShareText(
      boards,
      'daily',
      1,
      true,
      15_800,
      15_800,
      () => '00:15.8',
      5,
      6,
      true,
      1,
    );

    const expected = [
      'Wuzzle Games - Daily Speedrun',
      '',
      '⬛⬛⬛⬛⬛',
      '⬛⬛⬛⬛🟨',
      '🟨🟨⬛⬛🟨',
      '🟩⬛⬛⬛🟨',
      '🟩🟩🟩🟩🟩',
      '',
      'Time: 00:15.8',
      'Guesses: 5',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Daily speedrun - multiple boards', () => {
    const boards = [makeBoard([], true), makeBoard([], true)];

    const text = generateShareText(
      boards,
      'daily',
      2,
      true,
      14_300,
      14_300,
      () => '00:14.3',
      6,
      0,
      true,
      2,
    );

    const expected = [
      'Wuzzle Games - Daily Speedrun',
      '',
      'Boards: 2',
      'Time: 00:14.3',
      'Guesses used: 6',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Marathon standard - all stages solved in guess limit', () => {
    const boards = [makeBoard([], true)];

    const marathonStages = [
      { boards: 1, turnsUsed: 2, maxTurns: 6, stageElapsedMs: 0, solvedCount: 1 },
      { boards: 2, turnsUsed: 6, maxTurns: 7, stageElapsedMs: 0, solvedCount: 2 },
      { boards: 3, turnsUsed: 4, maxTurns: 8, stageElapsedMs: 0, solvedCount: 3 },
      { boards: 4, turnsUsed: 4, maxTurns: 9, stageElapsedMs: 0, solvedCount: 4 },
    ];

    const text = generateShareText(
      boards,
      'marathon',
      10,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      16,
      30,
      true,
      10,
      marathonStages,
    );

    const expected = [
      'Wuzzle Games - Marathon Standard',
      '',
      'Stage 1 (1 board):',
      'Guesses used: 2/6',
      'Stage 2 (2 boards):',
      'Guesses used: 6/7',
      'Stage 3 (3 boards):',
      'Guesses used: 4/8',
      'Stage 4 (4 boards):',
      'Guesses used: 4/9',
      '',
      'Total guesses used: 16/30',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Marathon standard - solved stage 1, partial stage 2, then exit', () => {
    const boards = [makeBoard([], true)];

    const marathonStages = [
      { boards: 1, turnsUsed: 2, maxTurns: 6, stageElapsedMs: 0, solvedCount: 1 },
      { boards: 2, turnsUsed: 7, maxTurns: 7, stageElapsedMs: 0, solvedCount: 1 },
      { boards: 3, turnsUsed: 0, maxTurns: 8, stageElapsedMs: 0, solvedCount: 0 },
      { boards: 4, turnsUsed: 0, maxTurns: 9, stageElapsedMs: 0, solvedCount: 0 },
    ];

    const text = generateShareText(
      boards,
      'marathon',
      3,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      9,
      13,
      false,
      2,
      marathonStages,
    );

    const expected = [
      'Wuzzle Games - Marathon Standard',
      '',
      'Stage 1 (1 board):',
      'Guesses used: 2/6',
      'Stage 2 (2 boards):',
      '1 board solved. Guesses used: 7/7',
      'Stage 3 (3 boards):',
      'Not solved',
      'Stage 4 (4 boards):',
      'Not solved',
      '',
      'Total guesses used: 9/13',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Marathon standard - continue after stage 2 and solve all stages', () => {
    const boards = [makeBoard([], true)];

    const marathonStages = [
      { boards: 1, turnsUsed: 2, maxTurns: 6, stageElapsedMs: 0, solvedCount: 1 },
      { boards: 2, turnsUsed: 8, maxTurns: 7, stageElapsedMs: 0, solvedCount: 2 },
      { boards: 3, turnsUsed: 9, maxTurns: 8, stageElapsedMs: 0, solvedCount: 3 },
      { boards: 4, turnsUsed: 4, maxTurns: 9, stageElapsedMs: 0, solvedCount: 4 },
    ];

    const text = generateShareText(
      boards,
      'marathon',
      10,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      23,
      30,
      true,
      10,
      marathonStages,
    );

    const expected = [
      'Wuzzle Games - Marathon Standard',
      '',
      'Stage 1 (1 board):',
      'Guesses used: 2/6',
      'Stage 2 (2 boards):',
      'Guesses used: 8/7',
      'Stage 3 (3 boards):',
      'Guesses used: 9/8',
      'Stage 4 (4 boards):',
      'Guesses used: 4/9',
      '',
      'Total guesses used: 23/30',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('matches Marathon speedrun', () => {
    const boards = [makeBoard([], true)];

    const marathonStages = [
      { boards: 1, turnsUsed: 0, maxTurns: 0, stageElapsedMs: 7_500, solvedCount: 1 },
      { boards: 2, turnsUsed: 0, maxTurns: 0, stageElapsedMs: 15_400, solvedCount: 2 },
      { boards: 3, turnsUsed: 0, maxTurns: 0, stageElapsedMs: 15_100, solvedCount: 3 },
      { boards: 4, turnsUsed: 0, maxTurns: 0, stageElapsedMs: 13_800, solvedCount: 4 },
    ];

    const text = generateShareText(
      boards,
      'marathon',
      10,
      true,
      51_900,
      51_900,
      (ms) => {
        if (ms === 7_500) return '00:07.5';
        if (ms === 15_400) return '00:15.4';
        if (ms === 15_100) return '00:15.1';
        if (ms === 13_800) return '00:13.8';
        if (ms === 51_900) return '00:51.9';
        return `MS${ms}`;
      },
      0,
      0,
      true,
      10,
      marathonStages,
    );

    const expected = [
      'Wuzzle Games - Marathon Speedrun',
      '',
      'Stage 1 (1 board):',
      'Time: 00:07.5',
      'Stage 2 (2 boards):',
      'Time: 00:15.4',
      'Stage 3 (3 boards):',
      'Time: 00:15.1',
      'Stage 4 (4 boards):',
      'Time: 00:13.8',
      '',
      'Total time: 00:51.9',
      '',
      'Play Wuzzle Games!',
      'https://wuzzlegames.com/',
    ].join('\n');

    expect(text).toBe(expected);
  });

  it('returns generic text when boards array is empty', () => {
    const text = generateShareText(
      [],
      'daily',
      1,
      false,
      0,
      0,
      (ms) => `T${ms}`,
      0,
      0,
      false,
      0,
    );
    expect(text).toBe('Play Wuzzle Games!');
  });
});

describe('shareTextWithoutFooter', () => {
  it('removes trailing footer from full share text', () => {
    const full =
      'Wuzzle Games - Daily Standard\n\n🟩🟩🟩🟩🟩\n\nGuesses: 1/6\nSolved!\n\nPlay Wuzzle Games!\nhttps://wuzzlegames.com/';
    const result = shareTextWithoutFooter(full);
    expect(result).toBe(
      'Wuzzle Games - Daily Standard\n\n🟩🟩🟩🟩🟩\n\nGuesses: 1/6\nSolved!',
    );
  });

  it('returns empty string when text is only the footer', () => {
    const onlyFooter = 'Play Wuzzle Games!\nhttps://wuzzlegames.com/';
    expect(shareTextWithoutFooter(onlyFooter)).toBe('');
  });

  it('returns empty string for empty or undefined input', () => {
    expect(shareTextWithoutFooter('')).toBe('');
    expect(shareTextWithoutFooter(null)).toBe('');
    expect(shareTextWithoutFooter(undefined)).toBe('');
  });

  it('leaves text unchanged when it has no footer', () => {
    const noFooter = 'Wuzzle Games - Daily Standard\n\nGuesses: 2/6\nSolved!';
    expect(shareTextWithoutFooter(noFooter)).toBe(noFooter);
  });

  it('handles URL with trailing slash', () => {
    const withSlash =
      'Heading\n\nPlay Wuzzle Games!\nhttps://wuzzlegames.com/';
    expect(shareTextWithoutFooter(withSlash)).toBe('Heading');
  });
});
