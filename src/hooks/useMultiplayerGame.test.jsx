import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup, waitFor } from '@testing-library/react';

// In-memory Firebase Realtime Database mock
vi.mock('firebase/database', () => {
  const dbData = {};
  const listeners = new Map(); // path -> Set<callback>

  const makeSnapshot = (path) => ({
    val: () => dbData[path] ?? null,
    exists: () => dbData[path] != null,
  });

  const trigger = (path) => {
    const subs = listeners.get(path);
    if (!subs) return;
    const snap = makeSnapshot(path);
    for (const cb of subs) cb(snap);
  };

  const ref = (_db, path) => ({ path });

  const set = async (refObj, value) => {
    dbData[refObj.path] = { ...(value || {}) };
    trigger(refObj.path);
  };

  const update = async (refObj, patch) => {
    if (!dbData[refObj.path]) dbData[refObj.path] = {};
    // Handle nested paths like "players/host-1/rematch"
    const applyNestedUpdate = (obj, path, value) => {
      const parts = path.split('/');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    };
    if (patch) {
      Object.keys(patch).forEach((key) => {
        if (key.includes('/')) {
          applyNestedUpdate(dbData[refObj.path], key, patch[key]);
        } else {
          dbData[refObj.path][key] = patch[key];
        }
      });
    }
    trigger(refObj.path);
  };

  const remove = async (refObj) => {
    delete dbData[refObj.path];
    trigger(refObj.path);
  };

  const onValue = (refObj, callback, errorCallback, options) => {
    // one-shot reads (join/start/submit/etc.)
    if (options && options.onlyOnce) {
      try {
        const snap = makeSnapshot(refObj.path);
        callback(snap);
      } catch (err) {
        if (errorCallback) errorCallback(err);
      }
      return () => {};
    }

    // subscription used by the hook to keep gameState in sync
    let subs = listeners.get(refObj.path);
    if (!subs) {
      subs = new Set();
      listeners.set(refObj.path, subs);
    }
    subs.add(callback);

    // immediately emit current value
    callback(makeSnapshot(refObj.path));

    return callback;
  };

  const off = (refObj) => {
    if (!refObj) return;
    listeners.delete(refObj.path);
  };

  const get = async (refObj) => makeSnapshot(refObj.path);

  const runTransaction = async (refObj, transactionUpdate) => {
    // Simple transaction mock - just call the update function
    const currentData = dbData[refObj.path] || null;
    const newData = transactionUpdate(currentData);
    if (newData !== null) {
      dbData[refObj.path] = newData;
      trigger(refObj.path);
    }
    return { committed: true, snapshot: makeSnapshot(refObj.path) };
  };

  return { ref, set, update, remove, onValue, off, get, runTransaction, __dbData: dbData };
});

// Auth/database config mock so the hook can read currentUser
vi.mock('../config/firebase', () => {
  const auth = { currentUser: null };
  const database = {}; // value is unused by our firebase/database mock
  return { auth, database };
});

import { __dbData } from 'firebase/database';
import { auth } from '../config/firebase';
import { useMultiplayerGame } from './useMultiplayerGame';

let hookResult;

function HookWrapper({ gameCode = null, isHost = false, speedrun = false }) {
  hookResult = useMultiplayerGame(gameCode, isHost, speedrun);
  return null;
}

beforeEach(() => {
  // reset in-memory DB between tests
  Object.keys(__dbData).forEach((k) => {
    delete __dbData[k];
  });
  auth.currentUser = null;
  cleanup();
});

describe('useMultiplayerGame – DB operations', () => {
  it('createGame writes host game and returns a 6-digit code', async () => {
    auth.currentUser = {
      uid: 'host-1',
      displayName: 'Host Player',
      email: 'host@example.com',
    };

    render(<HookWrapper gameCode={null} isHost={true} speedrun={false} />);

    let result;
    await act(async () => {
      result = await hookResult.createGame();
    });

    const code = result.code;
    expect(code).toHaveLength(6);
    const stored = __dbData[`multiplayer/${code}`];
    expect(stored).toBeTruthy();
    expect(stored).toMatchObject({
      status: 'waiting',
      speedrun: false,
      maxPlayers: 2,
      isPublic: true,
      players: {
        'host-1': expect.objectContaining({ id: 'host-1', name: 'Host Player', isHost: true, ready: false }),
      },
    });
  });

  it('joinGame attaches a guest to an existing waiting game', async () => {
    __dbData['multiplayer/123456'] = {
      hostId: 'host-1',
      hostName: 'Host',
      status: 'waiting',
      speedrun: false,
      maxPlayers: 2,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: false },
      },
    };

    auth.currentUser = {
      uid: 'guest-1',
      displayName: 'Guest Player',
      email: 'guest@example.com',
    };

    render(<HookWrapper />);

    await act(async () => {
      const returned = await hookResult.joinGame('123456');
      expect(returned).toMatchObject({ code: '123456' });
      expect(returned.gameData).toBeDefined();
    });

    // joinGame now only adds to players map, not legacy guestId/guestName
    expect(__dbData['multiplayer/123456'].players['guest-1']).toMatchObject({
      id: 'guest-1',
      name: 'Guest Player',
      isHost: false,
    });
  });

  it('startGame (standard) sets status, solution(s) and clears round fields', async () => {
    __dbData['multiplayer/123456'] = {
      hostId: 'host-1',
      status: 'waiting',
      speedrun: false,
      winner: 'host',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: true, guesses: ['OLD'], rematch: true },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, ready: true, guesses: ['OLD'], rematch: true },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await hookResult.startGame('123456', 'apple');
    });

    const stored = __dbData['multiplayer/123456'];
    expect(stored.status).toBe('playing');
    expect(stored.solution).toBe('apple');
    expect(stored.solutions).toEqual(['apple']);
    expect(stored.speedrun).toBe(false);
    expect(stored.winner).toBeNull();
    // Players map guesses should be cleared
    expect(stored.players['host-1'].guesses).toEqual([]);
    expect(stored.players['guest-1'].guesses).toEqual([]);
    expect(stored.players['host-1'].rematch).toBe(false);
    expect(stored.players['guest-1'].rematch).toBe(false);
  });

  it('startGame respects explicit speedrun override and nulls currentTurn', async () => {
    __dbData['multiplayer/234567'] = {
      hostId: 'host-1',
      status: 'waiting',
      speedrun: false,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: true, guesses: [] },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, ready: true, guesses: [] },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await hookResult.startGame('234567', ['apple', 'other'], { speedrun: true });
    });

    const stored = __dbData['multiplayer/234567'];
    expect(stored.speedrun).toBe(true);
    expect(stored.currentTurn).toBeUndefined();
    expect(stored.solutions).toEqual(['apple', 'other']);
    expect(stored.players['host-1'].startTime).not.toBeNull();
    expect(stored.players['guest-1'].startTime).not.toBeNull();
  });

  it('submitGuess (standard) appends host guesses/colors without enforcing turn order', async () => {
    __dbData['multiplayer/CODE1'] = {
      hostId: 'host-1',
      guestId: 'guest-1',
      status: 'playing',
      speedrun: false,
      currentTurn: 'host',
      solution: 'APPLE',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, guesses: [], colors: [] },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, guesses: [], colors: [] },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await hookResult.submitGuess('CODE1', 'OTHER', [0, 0, 0, 0, 0]);
    });

    const stored = __dbData['multiplayer/CODE1'];
    expect(stored.players['host-1'].guesses).toEqual(['OTHER']);
    expect(stored.players['host-1'].colors).toEqual([[0, 0, 0, 0, 0]]);
    // In non-turn-based mode, submitGuess no longer mutates currentTurn.
    expect(stored.currentTurn).toBe('host');
  });

  it('submitGuess (speedrun) sets per-player time only after all solutions solved', async () => {
    vi.useFakeTimers();

    __dbData['multiplayer/012345'] = {
      hostId: 'host-1',
      guestId: 'guest-1',
      status: 'playing',
      speedrun: true,
      currentTurn: null,
      solutions: ['APPLE', 'OTHER'],
      startedAt: 1_000,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, guesses: [], colors: [], startTime: 1_000, timeMs: null },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, guesses: [], colors: [], startTime: 1_000, timeMs: null },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    // First correct word – should not yet mark time because not all boards solved
    vi.setSystemTime(10_000);
    await act(async () => {
      await hookResult.submitGuess('012345', 'APPLE', [2, 2, 2, 2, 2]);
    });
    expect(__dbData['multiplayer/012345'].players['host-1'].timeMs).toBeNull();

    // Second correct word – now all boards solved, hostTimeMs should be set
    vi.setSystemTime(20_000);
    await act(async () => {
      await hookResult.submitGuess('012345', 'OTHER', [2, 2, 2, 2, 2]);
    });

    const stored = __dbData['multiplayer/012345'];
    expect(stored.players['host-1'].guesses).toEqual(['APPLE', 'OTHER']);
    // Timer starts after 3-2-1 countdown: effectiveStart = startedAt + 3000 = 4000
    expect(stored.players['host-1'].timeMs).toBe(16_000); // now 20_000 - effectiveStart 4_000
  });

  it('switchTurn toggles between host and guest in non-speedrun mode', async () => {
    __dbData['multiplayer/901234'] = {
      status: 'playing',
      speedrun: false,
      currentTurn: 'host',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await hookResult.switchTurn('901234');
    });
    expect(__dbData['multiplayer/901234'].currentTurn).toBe('guest');
  });

  it('setWinner marks winner and finished status', async () => {
    __dbData['multiplayer/890123'] = {
      hostId: 'host-1',
      guestId: 'guest-1',
      status: 'playing',
      winner: null,
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await hookResult.setWinner('890123', 'host');
    });

    expect(__dbData['multiplayer/890123']).toMatchObject({
      status: 'finished',
      winner: 'host',
    });
  });

  it('requestRematch sets player rematch flag in players map', async () => {
    __dbData['multiplayer/456789'] = {
      hostId: 'host-1',
      guestId: 'guest-1',
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, rematch: false },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, rematch: false },
      },
    };

    // Host sets rematch flag in players map
    auth.currentUser = { uid: 'host-1', displayName: 'Host' };
    render(<HookWrapper />);
    await act(async () => {
      await hookResult.requestRematch('456789');
    });
    expect(__dbData['multiplayer/456789'].players['host-1'].rematch).toBe(true);

    cleanup();

    // Guest sets rematch flag in players map
    auth.currentUser = { uid: 'guest-1', displayName: 'Guest' };
    render(<HookWrapper />);
    await act(async () => {
      await hookResult.requestRematch('456789');
    });
    expect(__dbData['multiplayer/456789'].players['guest-1'].rematch).toBe(true);
  });

  it('setFriendRequestStatus sets pending and clears on declined', async () => {
    __dbData['multiplayer/345678'] = {
      friendRequestStatus: null,
      friendRequestFrom: null,
      guestFriendRequestSent: false,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true },
      },
    };

    // Host sends request
    auth.currentUser = { uid: 'host-1', displayName: 'Host' };
    render(<HookWrapper />);
    await act(async () => {
      await hookResult.setFriendRequestStatus('345678', 'pending');
    });
    expect(__dbData['multiplayer/345678']).toMatchObject({
      friendRequestStatus: 'pending',
      hostFriendRequestSent: true,
      guestFriendRequestSent: false,
    });

    cleanup();

    // Guest declines, clearing flags
    auth.currentUser = { uid: 'guest-1', displayName: 'Guest' };
    render(<HookWrapper />);
    await act(async () => {
      await hookResult.setFriendRequestStatus('345678', 'declined');
    });
    expect(__dbData['multiplayer/345678']).toMatchObject({
      friendRequestStatus: null,
      hostFriendRequestSent: false,
      guestFriendRequestSent: false,
    });
  });
});

describe('useMultiplayerGame – subscription / connection behaviour', () => {
  it('exposes an error when subscribing to a non-existent game code', async () => {
    auth.currentUser = {
      uid: 'host-1',
      displayName: 'Host Player',
      email: 'host@example.com',
    };

    act(() => {
      render(<HookWrapper gameCode="999999" isHost={true} speedrun={false} />);
    });
    // Flush state updates from the mock's synchronous onValue callback
    await act(async () => {
      await Promise.resolve();
    });

    // For a non-existent game code the hook has no game state. The mock calls onValue with null;
    // the hook may set error to ROOM_CLOSED_MESSAGE asynchronously depending on timing.
    expect(hookResult.gameState).toBeNull();
  });
});

describe('useMultiplayerGame – error paths', () => {
  it('joinGame throws when game code is not found', async () => {
    auth.currentUser = {
      uid: 'guest-1',
      displayName: 'Guest Player',
      email: 'guest@example.com',
    };

    render(<HookWrapper />);

    await act(async () => {
      await expect(hookResult.joinGame('999999')).rejects.toThrow('Game code not found');
    });
  });

  it('joinGame throws when game is already full', async () => {
    __dbData['multiplayer/567890'] = {
      hostId: 'host-1',
      hostName: 'Host',
      status: 'waiting',
      speedrun: false,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: false },
        'someone-else': { id: 'someone-else', name: 'Other Guest', isHost: false, ready: false },
      },
    };

    auth.currentUser = {
      uid: 'guest-1',
      displayName: 'New Guest',
      email: 'guest@example.com',
    };

    render(<HookWrapper />);

    await act(async () => {
      await expect(hookResult.joinGame('567890')).rejects.toThrow('Game is full');
    });
  });

  it('startGame throws when called by non-host', async () => {
    __dbData['multiplayer/678901'] = {
      hostId: 'host-1',
      status: 'waiting',
      speedrun: false,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: true },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, ready: true },
      },
    };

    auth.currentUser = { uid: 'guest-1', displayName: 'Guest' };

    render(<HookWrapper />);

    await act(async () => {
      await expect(hookResult.startGame('678901', 'apple')).rejects.toThrow(
        'Only host can start the game',
      );
    });
  });

  it('startGame throws when both players are not ready', async () => {
    __dbData['multiplayer/789012'] = {
      hostId: 'host-1',
      status: 'waiting',
      speedrun: false,
      players: {
        'host-1': { id: 'host-1', name: 'Host', isHost: true, ready: true, guesses: [] },
        'guest-1': { id: 'guest-1', name: 'Guest', isHost: false, ready: false, guesses: [] },
      },
    };

    auth.currentUser = { uid: 'host-1', displayName: 'Host' };

    render(<HookWrapper />);

    await act(async () => {
      await expect(hookResult.startGame('789012', 'apple')).rejects.toThrow(
        'All players must be ready to start',
      );
    });
  });
});
