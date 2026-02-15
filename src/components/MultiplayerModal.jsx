import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';
import SignInRequiredModal from './SignInRequiredModal';
import { MAX_BOARDS } from '../lib/gameConstants';
import { validateGameCode } from '../lib/validation';

const OpenRoomsModal = lazy(() => import('./OpenRoomsModal'));
const BOARD_OPTIONS = Array.from({ length: MAX_BOARDS }, (_, i) => i + 1);

export default function MultiplayerModal({ isOpen, onRequestClose, showConfigFirst = false, onConfigClose, onConfigOpen }) {
  const navigate = useNavigate();
  const { user, isVerifiedUser } = useAuth();
  const [gameCode, setGameCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [showConfig, setShowConfig] = useState(showConfigFirst);
  const [numBoards, setNumBoards] = useState(1);
  const [gameVariant, setGameVariant] = useState('standard'); // 'standard' | 'speedrun' | 'solutionhunt'
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isPublic, setIsPublic] = useState(true);
  const [showOpenRoomsModal, setShowOpenRoomsModal] = useState(false);

  const handleHost = useCallback(() => {
    setShowConfig(true);
    onConfigOpen?.();
  }, [onConfigOpen]);

  const handleHostWithConfig = useCallback(() => {
    const clampedMaxPlayers = Math.max(2, Math.min(8, maxPlayers));
    navigate(
      `/game?mode=multiplayer&host=true&variant=${gameVariant}&boards=${numBoards}&maxPlayers=${clampedMaxPlayers}&isPublic=${isPublic}`
    );
    setShowConfig(false);
    onConfigClose?.();
    onRequestClose();
  }, [navigate, onRequestClose, gameVariant, numBoards, maxPlayers, isPublic, onConfigClose]);

  const handleJoin = useCallback(() => {
    // Validate game code format
    const codeValidation = validateGameCode(gameCode);
    if (!codeValidation.isValid) {
      setCodeError(codeValidation.errors.join('. ') || 'Please enter a valid 6-digit game code');
      return;
    }

    // Navigate with query params so Game can join the existing multiplayer game via ?code=...
    navigate(`/game?mode=multiplayer&code=${codeValidation.value}`);
    onRequestClose();
  }, [gameCode, navigate, onRequestClose]);


  if (!user) {
    return (
      <SignInRequiredModal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        title="Multiplayer Mode"
        message="You need to sign in to play Multiplayer Mode."
      />
    );
  }

  if (!isVerifiedUser) {
    // Show verification prompt for signed-in but unverified users
    return (
      <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
        <div style={{ padding: '24px' }}>
          <h2 style={{ margin: 0, marginBottom: '16px', fontSize: 20, fontWeight: 'bold', color: '#ffffff' }}>
            Verify your email
          </h2>
          <p style={{ marginBottom: '20px', color: '#d7dadc', fontSize: 14 }}>
            You must verify your email address or sign in with Google to play Multiplayer Mode.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={onRequestClose}
              className="homeBtn homeBtnOutline homeBtnLg"
              style={{ flex: 1, textAlign: 'center' }}
            >
              Close
            </button>
            <button
              onClick={() => {
                onRequestClose();
                navigate('/profile');
              }}
              className="homeBtn homeBtnGreen homeBtnLg"
              style={{ flex: 1, textAlign: 'center' }}
            >
              Go to Profile
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen && !showConfig} onRequestClose={onRequestClose} disableAutoFocus>
      <div style={{ padding: '24px' }}>
        <h2 style={{ margin: 0, marginBottom: '24px', fontSize: 20, fontWeight: 'bold', color: '#ffffff' }}>
          Multiplayer Mode
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <button
              onClick={handleHost}
              className="homeBtn homeBtnGreen homeBtnLg"
              style={{ width: '100%' }}
            >
              Host
            </button>
            <p style={{ fontSize: 12, color: '#818384', marginTop: '8px', textAlign: 'center' }}>
              Create a new room and share the code with friends.
            </p>
            <button
              type="button"
              onClick={() => setShowOpenRoomsModal(true)}
              className="homeBtn homeBtnOutline homeBtnLg"
              style={{ width: '100%', marginTop: '12px' }}
            >
              View open rooms
            </button>
          </div>

          <div style={{ borderTop: '1px solid #3a3a3c', paddingTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#d7dadc', fontSize: 14 }}>
              Enter Game Code:
            </label>
            <input
              type="text"
              value={gameCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setGameCode(value);
                setCodeError('');
              }}
              placeholder="000000"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 6,
                border: `1px solid ${codeError ? '#ED2939' : '#3A3A3C'}`,
                background: '#372F41',
                color: '#ffffff',
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: '4px',
                fontFamily: 'monospace',
                marginBottom: '8px'
              }}
            />
            {codeError && (
              <div style={{ color: '#f06272', fontSize: 12, marginBottom: '12px', textAlign: 'center' }}>
                {codeError}
              </div>
            )}
            <button
              onClick={handleJoin}
              disabled={gameCode.length !== 6}
              className={"homeBtn homeBtnLg " + (gameCode.length === 6 ? "homeBtnGold" : "homeBtnNeutral")}
              style={{
                width: '100%',
                opacity: gameCode.length === 6 ? 1 : 0.75,
                cursor: gameCode.length === 6 ? 'pointer' : 'not-allowed',
              }}
            >
              Join
            </button>
            <button
              type="button"
              onClick={onRequestClose}
              className="homeBtn homeBtnOutline homeBtnLg"
              style={{ width: '100%', marginTop: '12px' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      </Modal>

      <Suspense fallback={null}>
        <OpenRoomsModal
          isOpen={showOpenRoomsModal}
          onRequestClose={() => setShowOpenRoomsModal(false)}
        />
      </Suspense>

      <Modal
        isOpen={isOpen && showConfig}
        onRequestClose={() => {
          setShowConfig(false);
          onConfigClose?.();
        }}
      >
        <div style={{ padding: '24px' }}>
          <h2
            style={{
              margin: 0,
              marginBottom: '24px',
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
            }}
          >
            Multiplayer Game Configuration
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="multiplayer-host-boards"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#d7dadc',
                  fontSize: 14,
                }}
              >
                Number of Boards
              </label>
              <select
                id="multiplayer-host-boards"
                value={numBoards}
                onChange={(e) => setNumBoards(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1px solid #3A3A3C',
                  background: '#372F41',
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {BOARD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="multiplayer-config-variant-host"
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#d7dadc',
                  fontSize: 14,
                }}
              >
                Game Variant
              </label>
              <select
                id="multiplayer-config-variant-host"
                value={gameVariant}
                onChange={(e) => setGameVariant(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1px solid #3A3A3C',
                  background: '#372F41',
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value="standard">Standard (6 guesses)</option>
                <option value="speedrun">Speedrun (Unlimited guesses, timed)</option>
                <option value="solutionhunt">Solution Hunt (See possible words)</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  marginTop: '12px',
                  marginBottom: '8px',
                  color: '#d7dadc',
                  fontSize: 14,
                }}
              >
                Max players in room
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value, 10) || 2)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 6,
                  border: '1px solid #3A3A3C',
                  background: '#372F41',
                  color: '#ffffff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '4px' }}>
              <div
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  color: '#d7dadc',
                  fontSize: 14,
                }}
              >
                Room visibility
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 13, color: '#d7dadc' }}>
                  <input
                    type="radio"
                    name="multiplayer-visibility"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    style={{ cursor: 'pointer' }}
                  />
                  Public (show in Open Rooms)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 13, color: '#d7dadc' }}>
                  <input
                    type="radio"
                    name="multiplayer-visibility"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    style={{ cursor: 'pointer' }}
                  />
                  Private (invite only)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
                onClick={() => {
                  setShowConfig(false);
                  onConfigClose?.();
                }}
                className="homeBtn homeBtnOutline homeBtnLg"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={handleHostWithConfig}
                className="homeBtn homeBtnGreen homeBtnLg"
                style={{ flex: 1, textAlign: 'center' }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
