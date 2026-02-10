import { useEffect, useState } from 'react';
import { ref, onValue, off, query, orderByChild, startAt, limitToLast } from 'firebase/database';
import { database } from '../config/firebase';
import { MULTIPLAYER_WAITING_TIMEOUT_MS } from '../lib/multiplayerConfig';

/**
 * Subscribe to publicly visible waiting rooms under `multiplayer/*`.
 * Returns a sorted list of room metadata plus a loading flag.
 */
export function useOpenRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const roomsRef = ref(database, 'multiplayer');
    const now = Date.now();
    const minCreatedAt = now - MULTIPLAYER_WAITING_TIMEOUT_MS;
    
    // Optimize: Use Firebase query to filter by createdAt and isPublic
    // This requires a composite index on (isPublic, createdAt) or (status, createdAt)
    // For now, we still fetch all and filter client-side, but we can optimize with:
    // query(roomsRef, orderByChild('createdAt'), startAt(minCreatedAt), limitToLast(100))
    // Note: Firebase Realtime Database doesn't support multiple where clauses easily
    // So we fetch and filter client-side, but limit the data transfer
    const roomsQuery = query(roomsRef, orderByChild('createdAt'), startAt(minCreatedAt), limitToLast(200));

    const unsubscribe = onValue(
      roomsQuery,
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.entries(data)
          .map(([code, room]) => {
            if (!room) return null;

            const playersMap = room.players && typeof room.players === 'object' ? room.players : null;
            const currentPlayers = playersMap ? Object.keys(playersMap).length : 0;

            const maxPlayers = Number.isFinite(room.maxPlayers) ? room.maxPlayers : 2;
            const speedrun = room.speedrun === true;
            const solutions = Array.isArray(room.solutions) && room.solutions.length > 0
              ? room.solutions
              : room.solution
              ? [room.solution]
              : [];
            const explicitBoards = Number.isFinite(room.numBoards) ? room.numBoards : null;
            const boards = explicitBoards || solutions.length || 1;

            const hostEntry = playersMap ? Object.values(playersMap).find((p) => p && p.isHost) : null;
            const hostName = hostEntry?.name || 'Host';
            const roomName = room.roomName || `${hostName}'s room`;

            return {
              code,
              hostName,
              roomName,
              status: room.status || 'waiting',
              isPublic: room.isPublic !== false,
              currentPlayers,
              maxPlayers,
              speedrun,
              boards,
              createdAt: room.createdAt || 0,
            };
          })
          .filter((room) => {
            if (!room) return false;
            if (!room.isPublic) return false;
            if (room.status !== 'waiting') return false;
            if (!room.createdAt) return false;
            // Double-check the time window (query should handle this, but verify)
            return now - room.createdAt <= MULTIPLAYER_WAITING_TIMEOUT_MS;
          })
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setRooms(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );

    return () => {
      // Cleanup: unsubscribe from the listener
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      // Also call off() as a safety net, though unsubscribe() should handle it
      off(roomsQuery);
    };
  }, []);

  return { rooms, loading };
}
