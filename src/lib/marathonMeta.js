import { loadJSON, saveJSON, marathonMetaKey } from './persist';

const DEFAULT_META = {
  index: 0,
  cumulativeMs: 0,
  stageTimes: [],
};

function normalizeMeta(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_META };
  const index = typeof raw.index === 'number' && Number.isFinite(raw.index) ? raw.index : 0;
  const cumulativeMs =
    typeof raw.cumulativeMs === 'number' && Number.isFinite(raw.cumulativeMs)
      ? raw.cumulativeMs
      : 0;
  const stageTimes = Array.isArray(raw.stageTimes) ? raw.stageTimes : [];
  return { index, cumulativeMs, stageTimes };
}

export function loadMarathonMeta(speedrunEnabled) {
  const key = marathonMetaKey(speedrunEnabled);
  const raw = loadJSON(key, DEFAULT_META);
  return normalizeMeta(raw);
}

export function saveMarathonMeta(speedrunEnabled, partialMeta) {
  const key = marathonMetaKey(speedrunEnabled);
  const current = loadMarathonMeta(speedrunEnabled);
  const next = normalizeMeta({ ...current, ...partialMeta });
  saveJSON(key, next);
  return next;
}

export function advanceMarathonIndex(speedrunEnabled, steps = 1) {
  const current = loadMarathonMeta(speedrunEnabled);
  const currentIndex = typeof current.index === 'number' && Number.isFinite(current.index)
    ? current.index
    : 0;
  const nextIndex = currentIndex + (Number.isFinite(steps) ? steps : 1);
  return saveMarathonMeta(speedrunEnabled, { index: nextIndex < 0 ? 0 : nextIndex });
}
