import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { loadGameRecords, calculateAdvancedStats, formatTime } from '../lib/statsService';
import Modal from './Modal';
import SubscribeModal from './SubscribeModal';

/**
 * Modal for displaying advanced statistics
 * Premium users see all stats, non-premium see first stat only
 */
export default function AdvancedStatsModal({ 
  isOpen, 
  onRequestClose, 
  mode, 
  speedrunEnabled 
}) {
  const { user } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      loadStats();
    } else if (isOpen && !user) {
      setError('You must be signed in to view statistics.');
      setLoading(false);
    }
  }, [isOpen, user, mode, speedrunEnabled]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const gameRecords = await loadGameRecords({
        uid: user.uid,
        mode,
        speedrunEnabled,
      });
      
      if (gameRecords === null) {
        setError('Failed to load statistics.');
        setLoading(false);
        return;
      }
      
      const calculatedStats = calculateAdvancedStats(gameRecords);
      setStats(calculatedStats);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics.');
      setLoading(false);
    }
  };

  const getModeDisplayName = () => {
    const modeName = mode === 'daily' ? 'Daily' : 'Marathon';
    const variantName = speedrunEnabled ? 'Speedrun' : 'Standard';
    const boardText = mode === 'daily' ? '1 board' : '';
    return `${modeName} ${variantName}${boardText ? ' ' + boardText : ''}`;
  };

  const StatCard = ({ title, value, subtitle = null, locked = false, onClick = null }) => {
    const content = (
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 12,
          border: locked ? '2px solid #3A3A3C' : '2px solid #3A3A3C',
          background: locked 
            ? 'linear-gradient(135deg, #372F41 0%, #372F41 100%)' 
            : 'linear-gradient(135deg, #372F41 0%, #372F41 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          opacity: locked ? 0.6 : 1,
          cursor: locked && onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        onClick={locked && onClick ? onClick : undefined}
        onMouseEnter={(e) => {
          if (locked && onClick) {
            e.currentTarget.style.borderColor = '#565758';
            e.currentTarget.style.opacity = 0.8;
          }
        }}
        onMouseLeave={(e) => {
          if (locked && onClick) {
            e.currentTarget.style.borderColor = '#3A3A3C';
            e.currentTarget.style.opacity = 0.6;
          }
        }}
      >
        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
        <div style={{ fontSize: 24, fontWeight: 'bold', color: locked ? '#818384' : '#ffffff' }}>
          {locked ? '🔒' : value}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#818384', marginTop: 2 }}>
            {subtitle}
          </div>
        )}
        {locked && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' }}>
            Premium only
          </div>
        )}
      </div>
    );

    return content;
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        titleId="advanced-stats-modal-title"
        zIndex={3000}
      >
        <div
          style={{
            backgroundColor: '#372F41',
            borderRadius: 20,
            padding: '40px 32px',
            maxWidth: 800,
            width: '92vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 25px 70px rgba(0,0,0,0.9)',
            border: '1px solid #3A3A3C',
          }}
        >
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h2
              id="advanced-stats-modal-title"
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: 0.5,
              }}
            >
              {getModeDisplayName()} Statistics
            </h2>
            <div
              style={{
                fontSize: 14,
                color: '#9ca3af',
                marginTop: 8,
              }}
            >
              {showSubscriptionGate && 'Subscribe to unlock all statistics'}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              Loading statistics...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: 12,
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && stats && (
            <>
              {/* Guess Distribution Section */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: '#ffffff', 
                  marginBottom: 16,
                  borderBottom: '1px solid #3A3A3C',
                  paddingBottom: 8,
                }}>
                  Guess Distribution
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}>
                  {[1, 2, 3, 4, 5, 6].map(guessCount => {
                    const dist = stats.guessDistribution || {};
                    const count = dist[guessCount] || 0;
                    const percentage = stats.solvedGames > 0 
                      ? Math.round((count / stats.solvedGames) * 100 * 100) / 100 
                      : 0;
                    const maxCount = Math.max(0, ...Object.values(dist));
                    const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={guessCount} style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontSize: 11, 
                          color: '#9ca3af', 
                          marginBottom: 8,
                          fontWeight: '600',
                        }}>
                          {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
                        </div>
                        <div style={{
                          height: 120,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          marginBottom: 8,
                        }}>
                          <div style={{
                            height: `${barHeight}%`,
                          backgroundColor: '#50a339',
                            borderRadius: '4px 4px 0 0',
                            minHeight: barHeight > 0 ? '4px' : '0',
                            transition: 'all 0.3s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>
                          {count}
                        </div>
                        <div style={{ fontSize: 11, color: '#818384' }}>
                          {percentage}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Metrics */}
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: '#ffffff', 
                  marginBottom: 16,
                  borderBottom: '1px solid #3A3A3C',
                  paddingBottom: 8,
                }}>
                  Performance Metrics
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 16,
                }}>
                  {/* First stat - always visible */}
                  <StatCard
                    title="Total Games Solved"
                    value={stats.solvedGames}
                    subtitle={`out of ${stats.totalGames} games`}
                  />

                  {/* Premium stats */}
                  <StatCard
                    title="Win Rate"
                    value={`${stats.winRate}%`}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Average Guesses"
                    value={stats.averageGuesses.toFixed(2)}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Median Guesses"
                    value={stats.medianGuesses}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Best Performance"
                    value={stats.bestPerformance !== null ? `${stats.bestPerformance} guess${stats.bestPerformance === 1 ? '' : 'es'}` : 'N/A'}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Worst Performance"
                    value={stats.worstPerformance !== null ? `${stats.worstPerformance} guesses` : 'N/A'}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Perfect Games"
                    value={stats.perfectGames}
                    subtitle={`${stats.perfectGamesPercentage}% of solved games`}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Solved in 3 or Fewer"
                    value={stats.gamesSolvedIn3OrFewer}
                    subtitle={`${stats.gamesSolvedIn3OrFewerPercentage}% of solved games`}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />

                  <StatCard
                    title="Solved in 4 or Fewer"
                    value={stats.gamesSolvedIn4OrFewer}
                    subtitle={`${stats.gamesSolvedIn4OrFewerPercentage}% of solved games`}
                    locked={showSubscriptionGate}
                    onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                  />
                </div>
              </div>

              {/* Time-Based Statistics (Speedrun only) */}
              {speedrunEnabled && (
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: '#ffffff', 
                    marginBottom: 16,
                    borderBottom: '1px solid #3A3A3C',
                    paddingBottom: 8,
                  }}>
                    Time-Based Statistics
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                  }}>
                    <StatCard
                      title="Average Solve Time"
                      value={stats.averageTimeMs !== null ? formatTime(stats.averageTimeMs) : 'N/A'}
                      locked={showSubscriptionGate}
                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                    />

                    <StatCard
                      title="Median Solve Time"
                      value={stats.medianTimeMs !== null ? formatTime(stats.medianTimeMs) : 'N/A'}
                      locked={showSubscriptionGate}
                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                    />

                    <StatCard
                      title="Fastest Solve"
                      value={stats.fastestTimeMs !== null ? formatTime(stats.fastestTimeMs) : 'N/A'}
                      locked={showSubscriptionGate}
                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                    />

                    <StatCard
                      title="Slowest Solve"
                      value={stats.slowestTimeMs !== null ? formatTime(stats.slowestTimeMs) : 'N/A'}
                      locked={showSubscriptionGate}
                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                    />

                    <StatCard
                      title="Average Time per Guess"
                      value={stats.averageTimePerGuess !== null ? formatTime(stats.averageTimePerGuess) : 'N/A'}
                      locked={showSubscriptionGate}
                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                    />
                  </div>
                </div>
              )}

              {stats.solvedGames === 0 && (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: 14,
                }}>
                  No statistics available yet. Complete some games to see your stats!
                </div>
              )}
            </>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 12,
            paddingTop: 24,
            borderTop: '1px solid #3A3A3C',
            marginTop: 32,
          }}>
            <button
              onClick={onRequestClose}
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
        }}
      />
    </>
  );
}
