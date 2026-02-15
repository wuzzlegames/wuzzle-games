export const WORD_LENGTH = 5;

// Swapped: BACK on left, ENTER on right
export const KEYBOARD_ROWS = [
  "QWERTYUIOP".split(""),
  "ASDFGHJKL".split(""),
  ["BACK", ..."ZXCVBNM".split(""), "ENTER"]
];

export const KEYBOARD_HEIGHT = 190;

// +1 per board, but don't reach the next milestone's value early.
export function getMaxTurns(numBoards) {
  const milestones = [
    { boards: 1, turns: 6 },
    { boards: 8, turns: 12 },
    { boards: 16, turns: 21 },
    { boards: 32, turns: 37 }
  ];

  if (numBoards <= 1) return 6;

  for (let i = 0; i < milestones.length - 1; i++) {
    const cur = milestones[i];
    const next = milestones[i + 1];

    if (numBoards === next.boards) return next.turns;

    if (numBoards > cur.boards && numBoards < next.boards) {
      const linear = cur.turns + (numBoards - cur.boards);
      return Math.min(linear, next.turns - 1);
    }
  }

  const last = milestones[milestones.length - 1];
  return last.turns + (numBoards - last.boards);
}

// Wordle-like scoring (greens first, then yellows)
export function scoreGuess(guess, solution) {
  const result = Array(WORD_LENGTH).fill("grey");
  const safeGuess = typeof guess === "string" ? guess : "";
  const safeSolution = typeof solution === "string" ? solution : "";
  const solArr = safeSolution.split("");
  const guessArr = safeGuess.split("");
  const used = Array(WORD_LENGTH).fill(false);

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessArr[i] === solArr[i]) {
      result[i] = "green";
      used[i] = true;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "green") continue;
    const ch = guessArr[i];
    let found = -1;

    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!used[j] && solArr[j] === ch) {
        found = j;
        break;
      }
    }

    if (found !== -1) {
      result[i] = "yellow";
      used[found] = true;
    }
  }

  return result;
}

export function createBoardState(solution) {
  return {
    solution,
    guesses: [], // each: { word, colors }
    isSolved: false,
    isDead: false,
    // Track which global revealId last animated this board's newest row.
    lastRevealId: null,
  };
}

const STATUS_PRIORITY = { none: 0, grey: 1, yellow: 2, green: 3 };

export function mergeStatus(oldStatus, newStatus) {
  const a = STATUS_PRIORITY[oldStatus || "none"] ?? 0;
  const b = STATUS_PRIORITY[newStatus || "none"] ?? 0;
  return b > a ? newStatus : oldStatus;
}

export function colorForStatus(status) {
  if (status === "green") return "#50a339";
  if (status === "yellow") return "#B1A04C";
  if (status === "grey") return "#3A3A3C";
  return "#3A3A3C";
}

export function colorForMiniCell(status) {
  if (status === "green") return "#50a339";
  if (status === "yellow") return "#B1A04C";
  if (status === "grey") return "#3A3A3C";
  return "#212121";
}

export function buildLetterMapFromGuesses(guesses) {
  const map = {};
  // Be defensive: accept only arrays of guess objects. This protects against
  // older or malformed saved state (including remote snapshots) where
  // `guesses` might be null/undefined or not an array.
  if (!Array.isArray(guesses)) {
    return map;
  }

  for (const g of guesses) {
    if (!g || typeof g.word !== "string" || !Array.isArray(g.colors)) continue;
    const letters = g.word.split("");
    for (let i = 0; i < letters.length && i < g.colors.length; i++) {
      const L = letters[i];
      const st = g.colors[i];
      map[L] = mergeStatus(map[L], st);
    }
  }
  return map;
}

export function getGreenPattern(guesses) {
  const pattern = Array(WORD_LENGTH).fill("");
  if (!Array.isArray(guesses)) {
    return pattern;
  }

  for (const g of guesses) {
    if (!g || typeof g.word !== "string" || !Array.isArray(g.colors)) continue;
    const letters = g.word.split("");
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (g.colors[i] === "green") pattern[i] = letters[i];
    }
  }
  return pattern;
}

// Global turns used = max guess rows among boards
export function getTurnsUsed(boards) {
  if (!Array.isArray(boards) || boards.length === 0) return 0;
  let max = 0;
  for (const b of boards) {
    if (!b || !Array.isArray(b.guesses)) continue;
    const len = b.guesses.length || 0;
    if (len > max) max = len;
  }
  return max;
}

export function formatElapsed(ms) {
  const base = typeof ms === "number" && Number.isFinite(ms) ? ms : 0;
  const total = Math.max(0, Math.floor(base));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}.${tenths}`;
}

export function sumMs(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  return rows.reduce(
    (acc, r) => acc + (typeof r?.ms === "number" && Number.isFinite(r.ms) ? r.ms : 0),
    0,
  );
}
