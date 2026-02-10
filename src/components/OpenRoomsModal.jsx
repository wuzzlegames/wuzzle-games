import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue, off, remove } from "firebase/database";
import Modal from "./Modal";
import { database, auth } from "../config/firebase";
import { MULTIPLAYER_WAITING_TIMEOUT_MS } from "../lib/multiplayerConfig";
import "./OpenRoomsModal.css";

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

export default function OpenRoomsModal({ isOpen, onRequestClose, adminMode = false }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closingAll, setClosingAll] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  // Local clock so age/expiry labels in the modal update while it is open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    setLoading(true);
    const roomsRef = ref(database, "multiplayer");

    const unsubscribe = onValue(
      roomsRef,
      (snapshot) => {
        const value = snapshot.val() || {};
        const nextRooms = Object.entries(value)
          .map(([code, data]) => ({ code, data }))
          .filter(({ data }) => {
            if (!data) return false;
            const status = data.status || "waiting";

            if (adminMode) {
              // Admin view: show all non-finished rooms, regardless of public/private.
              return status === "waiting" || status === "playing";
            }

            // Normal view: only public rooms that are joinable *and have not started yet*.
            if (data.isPublic !== true) return false;

            // Only list rooms that are still in the waiting lobby. Once the host
            // starts the game (status === "playing"), the room should disappear
            // from the Open Rooms modal.
            if (status !== "waiting") return false;

            const playersMap = data.players || null;
            const playerCount = playersMap ? Object.keys(playersMap).length : 0;
            const maxPlayers = Number.isFinite(data.maxPlayers) ? data.maxPlayers : 2;

            // Hide rooms that are already full so players only see joinable lobbies.
            if (playerCount >= maxPlayers) return false;

            return true;
          })
          .sort((a, b) => {
            const aCreated = a.data.createdAt || 0;
            const bCreated = b.data.createdAt || 0;
            return bCreated - aCreated;
          });

        setRooms(nextRooms);
        setLoading(false);
      },
      () => {
        setRooms([]);
        setLoading(false);
      }
    );

    return () => {
      off(roomsRef);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [isOpen, adminMode]);

  const handleJoin = (room) => {
    const { code, data } = room;
    if (!code) return;
    const boards = Array.isArray(data.solutions) && data.solutions.length > 0
      ? data.solutions.length
      : data.solution
      ? 1
      : 1;
    const speedrun = !!data.speedrun;
    const maxPlayers = Number.isFinite(data.maxPlayers) ? data.maxPlayers : undefined;
    const isPublic = data.isPublic === true;

    const params = [
      "mode=multiplayer",
      `code=${code}`,
      `speedrun=${speedrun}`,
      `boards=${boards}`,
    ];
    if (maxPlayers) params.push(`maxPlayers=${maxPlayers}`);
    params.push(`isPublic=${isPublic}`);

    onRequestClose?.();
    navigate(`/game?${params.join("&")}`);
  };

  const handleCloseRoom = async (code) => {
    if (!code) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await remove(ref(database, `multiplayer/${code}`));
    } catch (e) {
      // best-effort; errors are silently ignored in UI
    }
  };

  const handleCloseAllRooms = async () => {
    // Only meaningful in admin view
    if (!adminMode || closingAll || loading) return;
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const allCodes = rooms.map(({ code }) => code).filter(Boolean);
    if (allCodes.length === 0) return;

    setClosingAll(true);
    try {
      await Promise.all(
        allCodes.map((code) => remove(ref(database, `multiplayer/${code}`)))
      );
    } catch (e) {
      // best-effort; errors are silently ignored in UI
    } finally {
      setClosingAll(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
      <div className="openRoomsModalRoot">
        <h2 className="openRoomsTitle">
          Open Rooms
        </h2>

        {loading ? (
          <div className="openRoomsStatus openRoomsStatusLoading">
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div className="openRoomsStatus openRoomsStatusEmpty">
            {adminMode
              ? "There are no active rooms right now."
              : "There are no public rooms available right now."}
          </div>
        ) : (
          <div className="openRoomsList">
            {rooms.map(({ code, data }) => {
              const playersMap = data.players || null;
              const playerCount = playersMap ? Object.keys(playersMap).length : 0;
              const maxPlayers = Number.isFinite(data.maxPlayers) ? data.maxPlayers : 2;
              const boards = Array.isArray(data.solutions) && data.solutions.length > 0
                ? data.solutions.length
                : data.solution
                ? 1
                : 1;
              const speedrun = !!data.speedrun;
              const hostEntry = playersMap ? Object.values(playersMap).find((p) => p && p.isHost) : null;
              const hostName = hostEntry?.name || "Host";
              const roomDisplayName = data.roomName || `${hostName}'s room`;

              const createdAt = typeof data.createdAt === "number" ? data.createdAt : null;
              const ageMs = createdAt ? Math.max(0, nowMs - createdAt) : null;
              const lifetimeMs = MULTIPLAYER_WAITING_TIMEOUT_MS;
              const remainingMs = createdAt
                ? Math.max(0, lifetimeMs - ageMs)
                : null;

              const expiresLabel = remainingMs != null ? formatDuration(remainingMs) : null;

              return (
                <div
                  key={code}
                  className="openRoomsItem"
                >
                  <div className="openRoomsItemMain">
                    <div className="openRoomsItemTitle">
                      {roomDisplayName}
                    </div>
                    <div className="openRoomsItemMeta">
                      {playerCount}/{maxPlayers} players · {boards} board
                      {boards > 1 ? "s" : ""} · {speedrun ? "Speedrun" : "Standard"}
                    </div>
                    {expiresLabel && (
                      <div className="openRoomsItemExpires">
                        Expires in {expiresLabel}
                      </div>
                    )}
                  </div>
                  <div className="openRoomsItemActions">
                    {adminMode && (
                      <button
                        type="button"
                        onClick={() => handleCloseRoom(code)}
                        className="homeBtn homeBtnOutline openRoomsItemButton"
                      >
                        Close
                      </button>
                    )}
                    {!adminMode && (
                      <button
                        type="button"
                        onClick={() => handleJoin({ code, data })}
                        className="homeBtn homeBtnGreen openRoomsItemButton"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="openRoomsFooter">
          {adminMode && (
            <button
              type="button"
              onClick={handleCloseAllRooms}
              disabled={closingAll || loading || rooms.length === 0}
              className="homeBtn homeBtnOutline homeBtnLg openRoomsFooterButton"
              style={{
                opacity: closingAll || loading || rooms.length === 0 ? 0.7 : 1,
              }}
            >
              {closingAll ? "Closing rooms..." : "Close all rooms"}
            </button>
          )}

          <button
            type="button"
            onClick={onRequestClose}
            className="homeBtn homeBtnGreen homeBtnLg openRoomsFooterButton"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
