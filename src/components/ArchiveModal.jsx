import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { getArchiveDates, formatArchiveDate } from '../lib/archiveService';
import Modal from './Modal';
import SubscribeModal from './SubscribeModal';

/**
 * Modal for viewing and selecting archived games
 * Shows 14 dates before current date
 * Premium users can access all dates, non-premium see locked dates
 */
export default function ArchiveModal({ 
  isOpen, 
  onRequestClose, 
  mode, 
  speedrunEnabled 
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubscribed, loading: subscriptionLoading, showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [archiveDates, setArchiveDates] = useState([]);

  // All dates in the 14-day archive window are playable (solutions are seeded on demand when the game loads)
  useEffect(() => {
    if (!isOpen) return;
    const dates = getArchiveDates();
    setArchiveDates(dates);
  }, [isOpen, mode, speedrunEnabled]);

  const getModeDisplayName = () => {
    const modeName = mode === 'daily' ? 'Daily' : 'Marathon';
    const variantName = speedrunEnabled ? 'Speedrun' : 'Standard';
    const boardText = mode === 'daily' ? '1 board' : '';
    return `${modeName} ${variantName}${boardText ? ' ' + boardText : ''}`;
  };

  const handleDateClick = (dateString) => {
    if (showSubscriptionGate) {
      setShowSubscribeModal(true);
      return;
    }

    // Navigate to game with archive date (solutions are seeded on demand if missing)
    // Format: /game?mode=daily&boards=1&archiveDate=2026-01-24
    const modeParam = mode;
    const boardsParam = mode === 'daily' ? 1 : null; // Marathon will use default
    const speedrunParam = speedrunEnabled ? 'true' : undefined;
    
    let gameUrl = `/game?mode=${modeParam}`;
    if (boardsParam) {
      gameUrl += `&boards=${boardsParam}`;
    }
    if (speedrunParam) {
      gameUrl += `&speedrun=${speedrunParam}`;
    }
    gameUrl += `&archiveDate=${dateString}`;

    onRequestClose();
    navigate(gameUrl);
  };

  const handleClose = () => {
    setShowSubscribeModal(false);
    onRequestClose();
  };

  const isLocked = showSubscriptionGate;

  return (
    <>
      <style>{`
        .modalPanel--archive {
          max-height: 85vh;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .modalPanel--archive::-webkit-scrollbar {
          width: 8px;
        }
        .modalPanel--archive::-webkit-scrollbar-track {
          background: #372F41;
          border-radius: 4px;
        }
        .modalPanel--archive::-webkit-scrollbar-thumb {
          background: #3A3A3C;
          border-radius: 4px;
        }
        .modalPanel--archive::-webkit-scrollbar-thumb:hover {
          background: #565758;
        }
      `}</style>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleClose}
        titleId="archive-modal-title"
        zIndex={3000}
        panelClassName="modalPanel--wide modalPanel--archive"
      >
        <div
          style={{
            backgroundColor: '#372F41',
            borderRadius: 20,
            padding: '28px 24px 24px',
            maxWidth: 640,
            width: '100%',
            boxSizing: 'border-box',
            boxShadow: '0 25px 70px rgba(0,0,0,0.9)',
            border: '1px solid #3A3A3C',
          }}
        >
          <div style={{ marginBottom: 24, textAlign: 'center', flexShrink: 0 }}>
            <h2
              id="archive-modal-title"
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 22,
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: 0.5,
              }}
            >
              {getModeDisplayName()} Archive
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: '#9ca3af',
                lineHeight: 1.4,
              }}
            >
              {subscriptionLoading
                ? 'Loading...'
                : isSubscribed
                  ? 'Select a date to play that day\'s game'
                  : 'Subscribe to unlock archive access'}
            </p>
            {isLocked && (
              <button
                type="button"
                onClick={() => setShowSubscribeModal(true)}
                style={{
                  marginTop: 16,
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, #e56b6f 0%, #d55a5e 100%)',
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: '600',
                  cursor: 'pointer',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.95';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Subscribe to unlock
              </button>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}
          >
            {archiveDates.map((dateString) => (
                <button
                  key={dateString}
                  onClick={() => handleDateClick(dateString)}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 14,
                    border: isLocked 
                      ? '2px solid #3A3A3C' 
                      : '2px solid #50a339',
                    background: isLocked 
                      ? 'linear-gradient(135deg, #372F41 0%, #372F41 100%)' 
                      : 'linear-gradient(135deg, rgba(80, 163, 57, 0.15) 0%, rgba(80, 163, 57, 0.05) 100%)',
                    color: isLocked ? '#9ca3af' : '#ffffff',
                    fontSize: 13,
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: isLocked ? 0.7 : 1,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLocked) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(80, 163, 57, 0.3)';
                      e.currentTarget.style.borderColor = '#50a339';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(80, 163, 57, 0.25) 0%, rgba(80, 163, 57, 0.1) 100%)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLocked) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = '#50a339';
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(80, 163, 57, 0.15) 0%, rgba(80, 163, 57, 0.05) 100%)';
                    }
                  }}
                >
                  {isLocked && (
                    <div style={{ 
                      fontSize: 24,
                      marginBottom: 4,
                      lineHeight: 1,
                    }}>
                      🔒
                    </div>
                  )}
                  {!isLocked && (
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%',
                      backgroundColor: 'rgba(80, 163, 57, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                    }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                          stroke="#50a339"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: '600',
                    lineHeight: 1.4,
                    textAlign: 'center',
                  }}>
                    {formatArchiveDate(dateString)}
                  </div>
                </button>
            ))}
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            paddingTop: 16,
            borderTop: '1px solid #3A3A3C',
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '14px 32px',
                borderRadius: 12,
                border: '2px solid #3A3A3C',
                background: 'transparent',
                color: '#d7dadc',
                fontSize: 14,
                fontWeight: '600',
                cursor: 'pointer',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#565758';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(58, 58, 60, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#3a3a3c';
                e.currentTarget.style.color = '#d7dadc';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      <SubscribeModal
        isOpen={showSubscribeModal}
        onRequestClose={() => setShowSubscribeModal(false)}
        onSubscriptionComplete={() => {
          setShowSubscribeModal(false);
          // After subscription, user can click the date again
        }}
      />
    </>
  );
}
