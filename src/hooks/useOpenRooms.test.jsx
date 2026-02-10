import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { useOpenRooms } from './useOpenRooms';
import { MULTIPLAYER_WAITING_TIMEOUT_MS } from '../lib/multiplayerConfig';

vi.mock('firebase/database', () => ({
  ref: vi.fn(),
  onValue: vi.fn(),
  off: vi.fn(),
  query: vi.fn((ref) => ref),
  orderByChild: vi.fn(() => ({})),
  startAt: vi.fn(() => ({})),
  limitToLast: vi.fn(() => ({})),
}));

vi.mock('../config/firebase', () => ({
  database: {},
}));

describe('useOpenRooms', () => {
  let mockUnsubscribe;
  let mockOnValueCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    mockOnValueCallback = null;

    onValue.mockImplementation((ref, callback, errorCallback) => {
      mockOnValueCallback = callback;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns loading state initially', () => {
    const { result } = renderHook(() => useOpenRooms());
    expect(result.current.loading).toBe(true);
    expect(result.current.rooms).toEqual([]);
  });

  it('subscribes to multiplayer rooms on mount', () => {
    const mockRef = {};
    ref.mockReturnValue(mockRef);

    renderHook(() => useOpenRooms());

    expect(ref).toHaveBeenCalledWith({}, 'multiplayer');
    expect(onValue).toHaveBeenCalledWith(
      mockRef,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('filters and returns only public waiting rooms within timeout', async () => {
    const now = Date.now();
    const mockRef = {};
    ref.mockReturnValue(mockRef);

    const { result } = renderHook(() => useOpenRooms());

    // Simulate Firebase snapshot with various room states
    const snapshot = {
      val: () => ({
        'ROOM1': {
          status: 'waiting',
          isPublic: true,
          createdAt: now - 1000, // Within timeout
          hostName: 'Host1',
          maxPlayers: 4,
          players: { 'uid1': {}, 'uid2': {} },
        },
        'ROOM2': {
          status: 'waiting',
          isPublic: false, // Not public
          createdAt: now - 1000,
          hostName: 'Host2',
        },
        'ROOM3': {
          status: 'playing', // Not waiting
          isPublic: true,
          createdAt: now - 1000,
          hostName: 'Host3',
        },
        'ROOM4': {
          status: 'waiting',
          isPublic: true,
          createdAt: now - MULTIPLAYER_WAITING_TIMEOUT_MS - 1000, // Expired
          hostName: 'Host4',
        },
        'ROOM5': {
          status: 'waiting',
          isPublic: true,
          createdAt: now - 500, // Within timeout
          hostName: 'Host5',
          maxPlayers: 2,
          solution: 'APPLE',
        },
      }),
    };

    act(() => {
      if (mockOnValueCallback) {
        mockOnValueCallback(snapshot);
      }
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.rooms).toHaveLength(2);
      expect(result.current.rooms[0].code).toBe('ROOM5'); // Sorted by createdAt desc
      expect(result.current.rooms[1].code).toBe('ROOM1');
    });
  });

  it('handles players map correctly', async () => {
    const mockRef = {};
    ref.mockReturnValue(mockRef);

    const { result } = renderHook(() => useOpenRooms());

    const snapshot = {
      val: () => ({
        'ROOM1': {
          status: 'waiting',
          isPublic: true,
          createdAt: Date.now(),
          hostName: 'Host',
          players: {
            'uid1': { id: 'uid1', name: 'Player1' },
            'uid2': { id: 'uid2', name: 'Player2' },
          },
        },
      }),
    };

    act(() => {
      if (mockOnValueCallback) {
        mockOnValueCallback(snapshot);
      }
    });

    await waitFor(() => {
      expect(result.current.rooms[0].currentPlayers).toBe(2);
    });
  });

  it('uses players map for player count', async () => {
    const mockRef = {};
    ref.mockReturnValue(mockRef);

    const { result } = renderHook(() => useOpenRooms());

    const snapshot = {
      val: () => ({
        'ROOM1': {
          status: 'waiting',
          isPublic: true,
          createdAt: Date.now(),
          players: {
            'host-uid': { id: 'host-uid', name: 'Host', isHost: true },
            'guest-uid': { id: 'guest-uid', name: 'Guest', isHost: false },
          },
        },
      }),
    };

    act(() => {
      if (mockOnValueCallback) {
        mockOnValueCallback(snapshot);
      }
    });

    await waitFor(() => {
      expect(result.current.rooms[0].currentPlayers).toBe(2);
    });
  });

  it('unsubscribes on unmount', () => {
    const mockRef = {};
    ref.mockReturnValue(mockRef);

    const { unmount } = renderHook(() => useOpenRooms());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(off).toHaveBeenCalledWith(mockRef);
  });

  it('handles error callback', async () => {
    const mockRef = {};
    ref.mockReturnValue(mockRef);
    let mockErrorCallback;

    onValue.mockImplementation((ref, callback, errorCallback) => {
      mockErrorCallback = errorCallback;
      return mockUnsubscribe;
    });

    const { result } = renderHook(() => useOpenRooms());

    act(() => {
      if (mockErrorCallback) {
        mockErrorCallback();
      }
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
