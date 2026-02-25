import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * When the user is in a multiplayer waiting room, this context provides gameCode and
 * setFriendRequestStatus so that when they decline a friend request from the modal,
 * we can clear the sender's "Friend request sent" state in the waiting room.
 */
export const MultiplayerFriendRequestContext = createContext(null);

export function MultiplayerFriendRequestProvider({ children }) {
  const [value, setValue] = useState(null);
  const setContext = useCallback((gameCode, setFriendRequestStatus) => {
    setValue(gameCode != null && setFriendRequestStatus ? { gameCode, setFriendRequestStatus } : null);
  }, []);
  const contextValue = value ? { ...value, setContext } : { gameCode: null, setFriendRequestStatus: null, setContext };
  return (
    <MultiplayerFriendRequestContext.Provider value={contextValue}>
      {children}
    </MultiplayerFriendRequestContext.Provider>
  );
}

export function useMultiplayerFriendRequest() {
  return useContext(MultiplayerFriendRequestContext);
}
