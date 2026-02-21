import React, { useState, useCallback } from 'react';
import AuthModal from './AuthModal';
import Modal from './Modal';

/**
 * Reusable modal shown when a user must sign in to access a feature.
 * Used by MultiplayerModal (home multiplayer) and HamburgerMenu (Profile, Friends, etc.).
 */
export default function SignInRequiredModal({
  isOpen,
  onRequestClose,
  title = 'Sign in required',
  message = 'You need to sign in to access this feature.',
  onSignUpComplete,
}) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSignInClick = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const handleAuthClose = useCallback(() => {
    setShowAuthModal(false);
    onRequestClose();
  }, [onRequestClose]);

  return (
    <>
      <Modal isOpen={isOpen} onRequestClose={onRequestClose}>
        <div style={{ padding: '24px' }}>
          <h2
            style={{
              margin: 0,
              marginBottom: '16px',
              fontSize: 20,
              fontWeight: 'bold',
              color: 'var(--c-text-strong)',
            }}
          >
            {title}
          </h2>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ marginBottom: '20px', color: 'var(--c-text)' }}>{message}</p>
            <button
              onClick={handleSignInClick}
              className="homeBtn homeBtnGreen homeBtnLg"
              style={{ minWidth: 140 }}
            >
              Sign In
            </button>
          </div>
        </div>
      </Modal>
      <AuthModal
        isOpen={showAuthModal}
        onRequestClose={handleAuthClose}
        onSignUpComplete={onSignUpComplete}
      />
    </>
  );
}
