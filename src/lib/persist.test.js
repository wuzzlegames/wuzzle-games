import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadJSON,
  saveJSON,
  removeKey,
  clearAllMultiWordle,
  makeDailyKey,
  makeMarathonKey,
  marathonMetaKey,
  makeSolvedKey,
} from './persist.js';

beforeEach(() => {
  window.localStorage.clear();
});

describe('loadJSON / saveJSON', () => {
  it('saves and loads JSON values round-trip', () => {
    const key = 'mw:test:key';
    const value = { a: 1, b: 'two' };

    saveJSON(key, value);
    const loaded = loadJSON(key, null);
    expect(loaded).toEqual(value);
  });

  it('returns fallback for missing keys', () => {
    const fallback = { foo: 'bar' };
    const loaded = loadJSON('nonexistent', fallback);
    expect(loaded).toBe(fallback);
  });

  it('returns fallback for invalid JSON', () => {
    const key = 'mw:bad';
    window.localStorage.setItem(key, '{not-json');
    const loaded = loadJSON(key, 'fallback');
    expect(loaded).toBe('fallback');
  });
});

describe('removeKey and clearAllMultiWordle', () => {
  it('removeKey deletes a specific key', () => {
    window.localStorage.setItem('mw:one', '1');
    removeKey('mw:one');
    expect(window.localStorage.getItem('mw:one')).toBeNull();
  });

  it('clearAllMultiWordle removes only mw:* keys', () => {
    window.localStorage.setItem('mw:a', '1');
    window.localStorage.setItem('mw:b', '2');
    window.localStorage.setItem('other', 'keep');

    clearAllMultiWordle();

    expect(window.localStorage.getItem('mw:a')).toBeNull();
    expect(window.localStorage.getItem('mw:b')).toBeNull();
    expect(window.localStorage.getItem('other')).toBe('keep');
  });
});

describe('key helpers', () => {
  it('makeDailyKey encodes boards, speedrun, and date', () => {
    const key = makeDailyKey(4, true, '2024-01-01');
    expect(key).toBe('mw:game:daily:4:speedrun:2024-01-01');
  });

  it('makeMarathonKey encodes mode, speedrun, and date', () => {
    const key = makeMarathonKey(false, '2024-01-02');
    expect(key).toBe('mw:game:marathon:standard:2024-01-02');
  });

  it('marathonMetaKey encodes mode and speedrun but not date', () => {
    expect(marathonMetaKey(false)).toBe('mw:meta:marathon:standard');
    expect(marathonMetaKey(true)).toBe('mw:meta:marathon:speedrun');
  });

  it('makeSolvedKey encodes mode-specific info', () => {
    const dailyKey = makeSolvedKey('daily', 4, true, null, '2024-01-01');
    expect(dailyKey).toBe('mw:solved:daily:4:speedrun:2024-01-01');

    const marathonKey = makeSolvedKey('marathon', 4, false, 1, '2024-01-01');
    expect(marathonKey).toBe('mw:solved:marathon:4:standard:1:2024-01-01');
  });
});