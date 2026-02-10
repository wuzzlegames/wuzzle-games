import React from 'react';
import UserCardWithBadges from '../UserCardWithBadges';
import { MAX_BOARDS } from '../../lib/gameConstants';
import './MultiplayerWaitingRoom.css';

export default function MultiplayerWaitingRoom({
  gameCode,
  gameState,
  isHost,
  onReady,
  onStartGame,
  onAddFriend,
  friendRequestSent,
  onShareCode,
  onCancelChallenge,
  friends,
  authUserId,
  onInviteFriend,
  createdAt,
  waitingNowMs,
  waitingTimeoutMs,
  initialBoards,
  onUpdateConfig,
  roomName,
  onUpdateRoomName,
}) {
  const {
    status,
    players: playersMapRaw,
    maxPlayers,
    isPublic,
    speedrun,
  } = gameState || {};

  const playersMap = playersMapRaw || null;
  const currentUserId = authUserId || null;

  // Derive per-player list when using the players map.
  const playerEntries = playersMap
    ? Object.values(playersMap).sort((a, b) => {
        if (a.isHost && !b.isHost) return -1;
        if (!a.isHost && b.isHost) return 1;
        return (a.joinedAt || 0) - (b.joinedAt || 0);
      })
    : [];

  const hasPlayersMap = !!playersMap && playerEntries.length > 0;

  const currentUserReady = (() => {
    if (hasPlayersMap && currentUserId && playersMap[currentUserId]) {
      return !!playersMap[currentUserId].ready;
    }
    return false;
  })();

  const allPlayersReady = hasPlayersMap
    ? playerEntries.length > 0 && playerEntries.every((p) => !!p.ready)
    : false;

  const [showFriendsList, setShowFriendsList] = React.useState(false);

  const hostPlayer = playerEntries.find((p) => !!p.isHost);
  const hostName = hostPlayer?.name || 'Host';
  const defaultRoomName = `${hostName}'s room`;
  const effectiveRoomName = roomName || defaultRoomName;
  const [isEditingRoomName, setIsEditingRoomName] = React.useState(false);
  const [roomNameDraft, setRoomNameDraft] = React.useState(effectiveRoomName);
  React.useEffect(() => {
    setRoomNameDraft(effectiveRoomName);
  }, [effectiveRoomName]);

  const handleRoomNameSave = () => {
    if (!onUpdateRoomName || !isHost) return;
    const trimmed = roomNameDraft.trim();
    const toSave = trimmed || defaultRoomName;
    if (toSave !== effectiveRoomName) {
      onUpdateRoomName(toSave);
    }
    setIsEditingRoomName(false);
  };

  const handleRoomNameCancel = () => {
    setRoomNameDraft(effectiveRoomName);
    setIsEditingRoomName(false);
  };

  // Game configuration for display.
  const boardsLive = Number.isFinite(gameState?.configBoards)
    ? gameState.configBoards
    : Number.isFinite(initialBoards)
    ? initialBoards
    : 1;
  const boards = Math.max(1, boardsLive || 1);
  const maxPlayersConfig = Number.isFinite(maxPlayers) ? maxPlayers : 2;
  const isPublicConfig = isPublic === true;
  const isSpeedrunConfig = !!speedrun;

  // Draft state for host editing of room settings.
  const [isEditingConfig, setIsEditingConfig] = React.useState(false);
  const [boardsDraft, setBoardsDraft] = React.useState(boards);
  const [maxPlayersDraft, setMaxPlayersDraft] = React.useState(maxPlayersConfig);
  const [isPublicDraft, setIsPublicDraft] = React.useState(isPublicConfig);
  const [isSpeedrunDraft, setIsSpeedrunDraft] = React.useState(isSpeedrunConfig);
  
  // Optimistic state for immediate UI feedback
  const [boardsOptimistic, setBoardsOptimistic] = React.useState(boards);
  const [maxPlayersOptimistic, setMaxPlayersOptimistic] = React.useState(maxPlayersConfig);
  const [isPublicOptimistic, setIsPublicOptimistic] = React.useState(isPublicConfig);
  const [isSpeedrunOptimistic, setIsSpeedrunOptimistic] = React.useState(isSpeedrunConfig);
  const [isSavingConfig, setIsSavingConfig] = React.useState(false);
  const [configError, setConfigError] = React.useState(null);

  React.useEffect(() => {
    setBoardsDraft(boards);
    setMaxPlayersDraft(maxPlayersConfig);
    setIsPublicDraft(isPublicConfig);
    setIsSpeedrunDraft(isSpeedrunConfig);
    // Sync optimistic state with live values when server updates come in
    setBoardsOptimistic(boards);
    setMaxPlayersOptimistic(maxPlayersConfig);
    setIsPublicOptimistic(isPublicConfig);
    setIsSpeedrunOptimistic(isSpeedrunConfig);
  }, [boards, maxPlayersConfig, isPublicConfig, isSpeedrunConfig]);

  // Expiry countdown based on createdAt and current time.
  const timeoutMs =
    typeof waitingTimeoutMs === 'number' ? waitingTimeoutMs : 30 * 60 * 1000;
  let expiryLabel = null;
  if (typeof createdAt === 'number' && typeof waitingNowMs === 'number') {
    const elapsed = waitingNowMs - createdAt;
    const remaining = Math.max(0, timeoutMs - elapsed);
    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    expiryLabel =
      minutes > 0
        ? `${minutes}m ${seconds.toString().padStart(2, '0')}s`
        : `${seconds}s`;
  }

  const handleToggleReady = () => {
    if (!onReady) return;
    onReady();
  };

  return (
    <div className="waitingRoomRoot">
      <div className="waitingRoomCard">
        {isHost && onUpdateRoomName && isEditingRoomName ? (
          <div className="waitingRoomTitleEdit">
            <input
              type="text"
              value={roomNameDraft}
              onChange={(e) => setRoomNameDraft(e.target.value)}
              placeholder="Room name"
              className="waitingRoomTitleInput"
              aria-label="Room name"
              autoFocus
            />
            <div className="waitingRoomTitleEditActions">
              <button
                type="button"
                onClick={handleRoomNameCancel}
                className="waitingRoomSecondaryButton waitingRoomTitleEditBtn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoomNameSave}
                className="waitingRoomPrimaryButton waitingRoomTitleEditBtn"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="waitingRoomTitleRow">
            <h2 className="waitingRoomTitle">
              {effectiveRoomName}
            </h2>
            {isHost && onUpdateRoomName && (
              <button
                type="button"
                onClick={() => setIsEditingRoomName(true)}
                className="waitingRoomTitleEditLink"
                aria-label="Edit room name"
              >
                Edit
              </button>
            )}
          </div>
        )}

        {status === 'waiting' && (
          <div>
            <p className="waitingRoomSubtitle">
              Waiting for players to join...
            </p>
            {expiryLabel && (
              <p className="waitingRoomExpiry">
                Room expires in {expiryLabel}.
              </p>
            )}

            {/* Game code / share */}
            <div className="waitingRoomCodeCard">
              <div className="waitingRoomCodeLabel">
                Game Code:
              </div>
              <div className="waitingRoomCodeValue">
                {gameCode}
              </div>
              <p className="waitingRoomCodeHelp">
                Share this code with your opponent
              </p>
              {isHost && onShareCode && (
                <button
                  type="button"
                  onClick={() => onShareCode(gameCode)}
                  className="waitingRoomPrimaryButton"
                >
                  Share Code
                </button>
              )}
            </div>

            {/* Close room for host */}
            {isHost && onCancelChallenge && (
              <button
                type="button"
                onClick={() => onCancelChallenge()}
                className="waitingRoomSecondaryButton waitingRoomCloseRoomButton"
              >
                Close Room
              </button>
            )}

            {/* Game settings summary + optional host editor */}
            <div className="waitingRoomSettings">
              <div className="waitingRoomSettingsHeader">
                <div className="waitingRoomSettingsLabel">Game settings</div>
                {isHost && onUpdateConfig && (
                  <button
                    type="button"
                    onClick={() => setIsEditingConfig((prev) => !prev)}
                    className="waitingRoomSettingsEdit"
                  >
                    {isEditingConfig ? 'Cancel' : 'Edit'}
                  </button>
                )}
              </div>

              {!isEditingConfig && (
                <div className="waitingRoomSettingsSummary">
                  Boards: <strong>{boardsOptimistic}</strong> · Mode:{' '}
                  <strong>{isSpeedrunOptimistic ? 'Speedrun' : 'Standard'}</strong> ·
                  Max players: <strong>{maxPlayersOptimistic}</strong> · Visibility:{' '}
                  <strong>{isPublicOptimistic ? 'Public' : 'Private'}</strong>
                  {isSavingConfig && <span className="waitingRoomSavingIndicator"> (saving...)</span>}
                  {configError && <div className="waitingRoomConfigError">Error: {configError}</div>}
                </div>
              )}

              {isEditingConfig && isHost && onUpdateConfig && (
                <div className="waitingRoomSettingsEditForm">
                  <div className="waitingRoomSettingsRow">
                    <label className="waitingRoomSettingsField">
                      <div className="waitingRoomSettingsFieldLabel">Boards</div>
                      <select
                        className="waitingRoomSelect"
                        value={boardsDraft}
                        onChange={(e) =>
                          setBoardsDraft(
                            Math.min(
                              MAX_BOARDS,
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            ),
                          )
                        }
                      >
                        {Array.from({ length: MAX_BOARDS }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="waitingRoomSettingsField">
                      <div className="waitingRoomSettingsFieldLabel">Max players</div>
                      <select
                        className="waitingRoomSelect"
                        value={maxPlayersDraft}
                        onChange={(e) =>
                          setMaxPlayersDraft(
                            Math.min(
                              8,
                              Math.max(2, parseInt(e.target.value, 10) || 2),
                            ),
                          )
                        }
                      >
                        {Array.from({ length: 7 }, (_, i) => i + 2).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="waitingRoomSettingsToggles">
                    <label className="waitingRoomCheckboxLabel">
                      <input
                        type="checkbox"
                        checked={isSpeedrunDraft}
                        onChange={(e) => setIsSpeedrunDraft(e.target.checked)}
                      />
                      <span>Speedrun mode</span>
                    </label>
                    <div className="waitingRoomVisibilityGroup">
                      <label className="waitingRoomRadioLabel">
                        <input
                          type="radio"
                          checked={isPublicDraft}
                          onChange={() => setIsPublicDraft(true)}
                        />
                        <span>Public</span>
                      </label>
                      <label className="waitingRoomRadioLabel">
                        <input
                          type="radio"
                          checked={!isPublicDraft}
                          onChange={() => setIsPublicDraft(false)}
                        />
                        <span>Private</span>
                      </label>
                    </div>
                  </div>

                  <div className="waitingRoomSettingsButtons">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingConfig(false);
                        setBoardsDraft(boards);
                        setMaxPlayersDraft(maxPlayersConfig);
                        setIsPublicDraft(isPublicConfig);
                        setIsSpeedrunDraft(isSpeedrunConfig);
                      }}
                      className="waitingRoomSecondaryButton waitingRoomSettingsButton"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!onUpdateConfig) return;
                        
                        setIsSavingConfig(true);
                        setConfigError(null);
                        
                        // Optimistically update the display immediately
                        setBoardsOptimistic(boardsDraft);
                        setMaxPlayersOptimistic(maxPlayersDraft);
                        setIsPublicOptimistic(isPublicDraft);
                        setIsSpeedrunOptimistic(isSpeedrunDraft);
                        setIsEditingConfig(false);
                        
                        try {
                          await onUpdateConfig({
                            boards: boardsDraft,
                            maxPlayers: maxPlayersDraft,
                            isPublic: isPublicDraft,
                            speedrun: isSpeedrunDraft,
                          });
                        } catch (err) {
                          // If the request fails, revert the optimistic update
                          setConfigError(err.message || 'Failed to save settings');
                          setBoardsOptimistic(boards);
                          setMaxPlayersOptimistic(maxPlayersConfig);
                          setIsPublicOptimistic(isPublicConfig);
                          setIsSpeedrunOptimistic(isSpeedrunConfig);
                          // Re-open the form so user can try again or discard
                          setIsEditingConfig(true);
                        } finally {
                          setIsSavingConfig(false);
                        }
                      }}
                      disabled={isSavingConfig}
                      className="waitingRoomPrimaryButton waitingRoomSettingsButton"
                    >
                      {isSavingConfig ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Players in room */}
            <div className="waitingRoomPlayersSection">
              <div className="waitingRoomPlayersTitle">
                Players in room:
              </div>
              <div className="waitingRoomPlayersList">
                {playerEntries.map((p) => {
                  const isHostPlayer = !!p.isHost;
                  const isCurrent = currentUserId && p.id === currentUserId;
                  const isAlreadyFriend = friends?.some((f) => f.id === p.id);
                  const showAddFriend = !isCurrent && onAddFriend && !isAlreadyFriend;
                  return (
                    <div
                      key={p.id}
                      className="waitingRoomPlayerCard"
                    >
                      <div className="waitingRoomPlayerInfo">
                        <UserCardWithBadges
                          userId={p.id}
                          username={p.name || 'Player'}
                          isYou={isCurrent}
                          badges={isHostPlayer ? [{ id: 'host', label: 'Host' }] : []}
                          size="sm"
                        />
                        {showAddFriend && (
                          <button
                            type="button"
                            onClick={() => !friendRequestSent && onAddFriend(p.name, p.id)}
                            disabled={friendRequestSent}
                            className="waitingRoomPlayerFriendButton"
                            title={friendRequestSent ? 'Friend request sent' : `Add ${p.name} as friend`}
                          >
                            {friendRequestSent ? '✓' : 'Add friend'}
                          </button>
                        )}
                      </div>
                      <span
                        className={
                          p.ready
                            ? 'waitingRoomPlayerReady waitingRoomPlayerReadyOn'
                            : 'waitingRoomPlayerReady waitingRoomPlayerReadyOff'
                        }
                      >
                        {p.ready ? '✓ Ready' : 'Not Ready'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Ready / Not Ready + Start Game */}
              {onReady && (
                <>
                  {!currentUserReady ? (
                    <button
                      type="button"
                      onClick={handleToggleReady}
                      className="waitingRoomPrimaryButton waitingRoomReadyButton"
                    >
                      Ready
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleToggleReady}
                      disabled={allPlayersReady}
                      className={
                        allPlayersReady
                          ? 'waitingRoomSecondaryButton waitingRoomReadyButton waitingRoomReadyButtonDisabled'
                          : 'waitingRoomSecondaryButton waitingRoomReadyButton'
                      }
                    >
                      {allPlayersReady
                        ? 'All ready'
                        : 'Not Ready'}
                    </button>
                  )}

                  {allPlayersReady && isHost && onStartGame && (
                    <button
                      type="button"
                      onClick={onStartGame}
                      className="waitingRoomStartButton"
                    >
                      Start Game
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Collapsible friends list for inviting friends directly into this room */}
            {friends && friends.length > 0 && onInviteFriend && (
              <div className="waitingRoomInviteSection">
                <button
                  type="button"
                  onClick={() => setShowFriendsList((prev) => !prev)}
                  className="waitingRoomInviteToggle"
                >
                  Invite friends {showFriendsList ? '▾' : '▸'}
                </button>
                {showFriendsList && (
                  <div className="waitingRoomInviteList">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="waitingRoomInviteItem"
                      >
                        <UserCardWithBadges
                          userId={friend.id}
                          username={friend.name}
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={() => onInviteFriend(friend)}
                          className="waitingRoomPrimaryButton waitingRoomInviteButton"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
