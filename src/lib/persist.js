// Import getCurrentDateString for daily reset functionality
import { getCurrentDateString } from "./dailyWords.js";

const PREFIX = "mw:";
export const SESSION_KEY = `${PREFIX}session`;

export function loadJSON(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function removeKey(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearAllMultiWordle() {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

export function makeDailyKey(numBoards, speedrunEnabled, dateString = null) {
  const date = dateString || getCurrentDateString();
  return `${PREFIX}game:daily:${numBoards}:${speedrunEnabled ? "speedrun" : "standard"}:${date}`;
}

export function makeMarathonKey(speedrunEnabled, dateString = null) {
  const date = dateString || getCurrentDateString();
  return `${PREFIX}game:marathon:${speedrunEnabled ? "speedrun" : "standard"}:${date}`;
}

export function makeSolutionHuntKey(dateString = null) {
  const date = dateString || getCurrentDateString();
  return `${PREFIX}game:solutionhunt:standard:${date}`;
}

export function marathonMetaKey(speedrunEnabled) {
  // Marathon meta doesn't reset daily, only on reset all
  return `${PREFIX}meta:marathon:${speedrunEnabled ? "speedrun" : "standard"}`;
}

export function makeSolvedKey(mode, numBoards, speedrunEnabled, marathonIndex = null, dateString = null) {
  const date = dateString || getCurrentDateString();
  if (mode === "marathon") {
    return `${PREFIX}solved:${mode}:${numBoards}:${speedrunEnabled ? "speedrun" : "standard"}:${marathonIndex}:${date}`;
  }
  return `${PREFIX}solved:${mode}:${numBoards}:${speedrunEnabled ? "speedrun" : "standard"}:${date}`;
}

export function makeStreakKey(mode, speedrunEnabled) {
  const variant = speedrunEnabled ? "speedrun" : "standard";
  return `${PREFIX}streak:${mode}:${variant}`;
}

function parseDateString(value) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function isPreviousDay(prevDateString, currentDateString) {
  const prev = parseDateString(prevDateString);
  const current = parseDateString(currentDateString);
  if (!prev || !current) return false;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const diff = Math.round((current - prev) / ONE_DAY_MS);
  return diff === 1;
}

export function loadStreak(mode, speedrunEnabled) {
  const key = makeStreakKey(mode, speedrunEnabled);
  const data = loadJSON(key, null);
  if (!data) {
    return { current: 0, best: 0, lastDate: null };
  }
  return {
    current: typeof data.current === "number" ? data.current : 0,
    best: typeof data.best === "number" ? data.best : 0,
    lastDate: data.lastDate || null,
  };
}

export function updateStreakOnWin(mode, speedrunEnabled, dateString = null) {
  const today = dateString || getCurrentDateString();
  const key = makeStreakKey(mode, speedrunEnabled);
  const existing = loadJSON(key, null);

  if (!existing) {
    const initial = { current: 1, best: 1, lastDate: today };
    saveJSON(key, initial);
    return initial;
  }

  const prevDate = existing.lastDate || null;
  const prevCurrent = typeof existing.current === "number" ? existing.current : 0;
  const prevBest = typeof existing.best === "number" ? existing.best : 0;

  if (prevDate === today) {
    return { current: prevCurrent, best: prevBest, lastDate: today };
  }

  const nextCurrent = prevDate && isPreviousDay(prevDate, today) ? prevCurrent + 1 : 1;
  const nextBest = Math.max(prevBest, nextCurrent);
  const updated = { current: nextCurrent, best: nextBest, lastDate: today };
  saveJSON(key, updated);
  return updated;
}
