import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { loadGameRecords, calculateAdvancedStats, formatTime } from '../lib/statsService';
import Modal from './Modal';
import SubscribeModal from './SubscribeModal';

/**
 * Modal for displaying cross-mode comparison statistics
 * Compares performance across all 4 modes: Daily Standard, Daily Speedrun, Marathon Standard, Marathon Speedrun
 * Premium feature
 */
export default function CrossModeComparisonModal({ 
  isOpen, 
  onRequestClose
}) {
  const { user } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const modes = [
    { mode: 'daily', speedrunEnabled: false, label: 'Daily Standard' },
    { mode: 'daily', speedrunEnabled: true, label: 'Daily Speedrun' },
    { mode: 'marathon', speedrunEnabled: false, label: 'Marathon Standard' },
    { mode: 'marathon', speedrunEnabled: true, label: 'Marathon Speedrun' },
  ];

  useEffect(() => {
    if (isOpen && user) {
      loadComparisonData();
    } else if (isOpen && !user) {
      setError('You must be signed in to view cross-mode comparisons.');
      setLoading(false);
    }
  }, [isOpen, user]);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allStats = {};
      
      // Load stats for all modes
      for (const { mode, speedrunEnabled, label } of modes) {
        const gameRecords = await loadGameRecords({
          uid: user.uid,
          mode,
          speedrunEnabled,
        });
        
        if (gameRecords !== null) {
          const calculatedStats = calculateAdvancedStats(gameRecords);
          allStats[label] = {
            ...calculatedStats,
            mode,
            speedrunEnabled,
            gameRecords,
          };
        } else {
          allStats[label] = {
            mode,
            speedrunEnabled,
            solvedGames: 0,
            totalGames: 0,
          };
        }
      }
      
      setComparisonData(allStats);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load comparison data:', err);
      setError('Failed to load comparison data.');
      setLoading(false);
    }
  };

  const ComparisonRow = ({ label, getValue, formatValue = (v) => v, showBest = false, showWorst = false }) => {
    if (!comparisonData) return null;
    
    const values = {};
    let bestValue = null;
    let bestLabel = null;
    let worstValue = null;
    let worstLabel = null;
    
    modes.forEach(({ label: modeLabel }) => {
      const stats = comparisonData[modeLabel];
      if (stats && stats.solvedGames > 0) {
        try {
          const value = getValue(stats);
          values[modeLabel] = value;
          
          // Handle both number values and object values (for percentage rows)
          if (value !== null && value !== undefined) {
            const compareValue = typeof value === 'object' && value !== null ? value.count : value;
            if (typeof compareValue === 'number' && !isNaN(compareValue)) {
              const currentBest = typeof bestValue === 'object' && bestValue !== null ? bestValue.count : bestValue;
              const currentWorst = typeof worstValue === 'object' && worstValue !== null ? worstValue.count : worstValue;
              
              // For "best" metrics (lower is better), showBest should be true
              // For "worst" metrics (higher is better), showWorst should be true
              // For general metrics (higher is better), neither flag is set
              if (showBest) {
                // Lower is better
                if (bestValue === null || compareValue < currentBest) {
                  bestValue = value;
                  bestLabel = modeLabel;
                }
              } else if (showWorst) {
                // Higher is worse (for worst performance)
                if (worstValue === null || compareValue > currentWorst) {
                  worstValue = value;
                  worstLabel = modeLabel;
                }
              } else {
                // Higher is better (default)
                if (bestValue === null || compareValue > currentBest) {
                  bestValue = value;
                  bestLabel = modeLabel;
                }
              }
            }
          }
        } catch (err) {
          values[modeLabel] = null;
        }
      } else {
        values[modeLabel] = null;
      }
    });

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px repeat(4, 1fr)',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #3A3A3C',
        alignItems: 'center',
      }}>
        <div style={{ 
          fontSize: 13, 
          fontWeight: '600', 
          color: '#d7dadc',
        }}>
          {label}
        </div>
        {modes.map(({ label: modeLabel }) => {
          const value = values[modeLabel];
          const isBest = showBest && bestLabel === modeLabel && value !== null;
          const isWorst = showWorst && worstLabel === modeLabel && value !== null;
          
          return (
            <div
              key={modeLabel}
              style={{
                fontSize: 14,
                color: value === null ? '#818384' : isBest ? '#50a339' : isWorst ? '#B1A04C' : '#d7dadc',
                fontWeight: isBest || isWorst ? 'bold' : 'normal',
                textAlign: 'center',
                padding: '4px 8px',
                borderRadius: 6,
                background: isBest ? 'rgba(80, 163, 57, 0.15)' : isWorst ? 'rgba(177, 160, 76, 0.15)' : 'transparent',
              }}
            >
              {value === null ? 'N/A' : formatValue(value)}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  // Premium check (only after subscription has settled to avoid flash for subscribed users)
  if (showSubscriptionGate) {
    return (
      <>
        <Modal
          isOpen={isOpen}
          onRequestClose={onRequestClose}
          titleId="cross-mode-modal-title"
          zIndex={3000}
        >
          <div
            style={{
            backgroundColor: '#372F41',
            borderRadius: 20,
            padding: '40px 32px',
            maxWidth: 600,
            width: '92vw',
            boxShadow: '0 25px 70px rgba(0,0,0,0.9)',
            border: '1px solid #3A3A3C',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 id="cross-mode-modal-title" style={{
              margin: 0,
              marginBottom: 16,
              fontSize: 24,
              fontWeight: 'bold',
              color: '#ffffff',
            }}>
              Premium Feature
            </h2>
            <p style={{
              fontSize: 14,
              color: '#9ca3af',
              marginBottom: 24,
              lineHeight: 1.6,
            }}>
              Cross-mode comparisons are available for premium members only. Subscribe to unlock this feature and compare your performance across all game modes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowSubscribeModal(true)}
                style={{
                  padding: '14px 32px',
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
                  e.currentTarget.style.opacity = 0.9;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = 1;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Subscribe
              </button>
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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#3A3A3C';
                  e.currentTarget.style.color = '#d7dadc';
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        titleId="cross-mode-comparison-title"
        zIndex={3000}
      >
        <div
          style={{
            backgroundColor: '#372F41',
            borderRadius: 20,
            padding: '40px 32px',
            maxWidth: 1000,
            width: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 70px rgba(0,0,0,0.9)',
            border: '1px solid #3A3A3C',
          }}
        >
          <div style={{ marginBottom: 32, textAlign: 'center' }}>
            <h2
              id="cross-mode-comparison-title"
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 28,
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: 0.5,
              }}
            >
              Cross-Mode Comparison
            </h2>
            <div
              style={{
                fontSize: 14,
                color: '#9ca3af',
                marginTop: 8,
              }}
            >
              Compare your performance across all game modes
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
              Loading comparison data...
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

          {!loading && !error && comparisonData && (
            <>
              {/* Header Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '200px repeat(4, 1fr)',
                gap: 12,
                padding: '16px',
                backgroundColor: '#372F41',
                borderRadius: 12,
                marginBottom: 16,
                border: '1px solid #3A3A3C',
              }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 'bold', 
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  Metric
                </div>
                {modes.map(({ label }) => (
                  <div
                    key={label}
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#d7dadc',
                      textAlign: 'center',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div style={{
                backgroundColor: '#372F41',
                borderRadius: 12,
                border: '1px solid #3A3A3C',
                overflow: 'hidden',
                marginBottom: 32,
              }}>
                {/* Basic Stats */}
                <div style={{ padding: '16px 0' }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: 12,
                    padding: '0 16px',
                  }}>
                    Basic Statistics
                  </div>
                  
                  <ComparisonRow
                    label="Total Games"
                    getValue={(stats) => stats.totalGames}
                  />
                  
                  <ComparisonRow
                    label="Games Solved"
                    getValue={(stats) => stats.solvedGames}
                  />
                  
                  <ComparisonRow
                    label="Win Rate"
                    getValue={(stats) => stats.winRate}
                    formatValue={(v) => `${v.toFixed(1)}%`}
                    showBest={false}
                  />
                </div>

                {/* Performance Metrics */}
                <div style={{ padding: '16px 0', borderTop: '1px solid #3A3A3C' }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: 12,
                    padding: '0 16px',
                  }}>
                    Performance Metrics
                  </div>
                  
                  <ComparisonRow
                    label="Average Guesses"
                    getValue={(stats) => stats.averageGuesses}
                    formatValue={(v) => v.toFixed(2)}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Median Guesses"
                    getValue={(stats) => stats.medianGuesses}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Best Performance"
                    getValue={(stats) => stats.bestPerformance}
                    formatValue={(v) => v !== null ? `${v} guess${v === 1 ? '' : 'es'}` : 'N/A'}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Worst Performance"
                    getValue={(stats) => stats.worstPerformance}
                    formatValue={(v) => v !== null ? `${v} guesses` : 'N/A'}
                    showWorst={true}
                  />
                  
                  <ComparisonRow
                    label="Perfect Games"
                    getValue={(stats) => {
                      if (stats.solvedGames > 0) {
                        const percentage = stats.perfectGamesPercentage || 0;
                        return { count: stats.perfectGames, percentage };
                      }
                      return null;
                    }}
                    formatValue={(v) => {
                      if (v === null) return 'N/A';
                      return `${v.count} (${v.percentage.toFixed(1)}%)`;
                    }}
                    showBest={false}
                  />
                  
                  <ComparisonRow
                    label="Solved in ≤3 Guesses"
                    getValue={(stats) => {
                      if (stats.solvedGames > 0) {
                        const percentage = stats.gamesSolvedIn3OrFewerPercentage || 0;
                        return { count: stats.gamesSolvedIn3OrFewer, percentage };
                      }
                      return null;
                    }}
                    formatValue={(v) => {
                      if (v === null) return 'N/A';
                      return `${v.count} (${v.percentage.toFixed(1)}%)`;
                    }}
                    showBest={false}
                  />
                  
                  <ComparisonRow
                    label="Solved in ≤4 Guesses"
                    getValue={(stats) => {
                      if (stats.solvedGames > 0) {
                        const percentage = stats.gamesSolvedIn4OrFewerPercentage || 0;
                        return { count: stats.gamesSolvedIn4OrFewer, percentage };
                      }
                      return null;
                    }}
                    formatValue={(v) => {
                      if (v === null) return 'N/A';
                      return `${v.count} (${v.percentage.toFixed(1)}%)`;
                    }}
                    showBest={false}
                  />
                </div>

                {/* Time-Based Stats (for speedrun modes) */}
                <div style={{ padding: '16px 0', borderTop: '1px solid #3A3A3C' }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: 12,
                    padding: '0 16px',
                  }}>
                    Time-Based Statistics (Speedrun Modes)
                  </div>
                  
                  <ComparisonRow
                    label="Average Solve Time"
                    getValue={(stats) => (stats.speedrunEnabled && stats.averageTimeMs !== null) ? stats.averageTimeMs : null}
                    formatValue={(v) => v !== null ? formatTime(v) : 'N/A'}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Median Solve Time"
                    getValue={(stats) => (stats.speedrunEnabled && stats.medianTimeMs !== null) ? stats.medianTimeMs : null}
                    formatValue={(v) => v !== null ? formatTime(v) : 'N/A'}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Fastest Solve"
                    getValue={(stats) => (stats.speedrunEnabled && stats.fastestTimeMs !== null) ? stats.fastestTimeMs : null}
                    formatValue={(v) => v !== null ? formatTime(v) : 'N/A'}
                    showBest={true}
                  />
                  
                  <ComparisonRow
                    label="Slowest Solve"
                    getValue={(stats) => (stats.speedrunEnabled && stats.slowestTimeMs !== null) ? stats.slowestTimeMs : null}
                    formatValue={(v) => v !== null ? formatTime(v) : 'N/A'}
                    showWorst={true}
                  />
                  
                  <ComparisonRow
                    label="Avg Time per Guess"
                    getValue={(stats) => (stats.speedrunEnabled && stats.averageTimePerGuess !== null) ? stats.averageTimePerGuess : null}
                    formatValue={(v) => v !== null ? formatTime(v) : 'N/A'}
                    showBest={true}
                  />
                </div>
              </div>

              {/* Summary Insights */}
              {comparisonData && Object.values(comparisonData).some(s => s && s.solvedGames > 0) && (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#372F41',
                  borderRadius: 12,
                  border: '1px solid #3A3A3C',
                  marginBottom: 24,
                }}>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: '#ffffff',
                    marginBottom: 12,
                  }}>
                    Performance Insights
                  </h3>
                  <div style={{ fontSize: 13, color: '#d7dadc', lineHeight: 1.8 }}>
                    {(() => {
                      const validStats = Object.entries(comparisonData)
                        .filter(([_, stats]) => stats && stats.solvedGames > 0)
                        .map(([label, stats]) => ({ label, ...stats }));
                      
                      if (validStats.length === 0) return null;
                      
                      // Best mode (lowest average guesses)
                      const bestMode = validStats.reduce((best, current) => {
                        if (!best || (current.averageGuesses < best.averageGuesses)) return current;
                        return best;
                      }, null);
                      
                      // Most active mode
                      const mostActive = validStats.reduce((most, current) => {
                        if (!most || current.totalGames > most.totalGames) return current;
                        return most;
                      }, null);
                      
                      // Best win rate
                      const bestWinRate = validStats.reduce((best, current) => {
                        if (!best || current.winRate > best.winRate) return current;
                        return best;
                      }, null);
                      
                      return (
                        <>
                          {bestMode && (
                            <div>🏆 <strong>Best Performance:</strong> {bestMode.label} with {bestMode.averageGuesses.toFixed(2)} average guesses</div>
                          )}
                          {mostActive && (
                            <div>📊 <strong>Most Active:</strong> {mostActive.label} with {mostActive.totalGames} total games</div>
                          )}
                          {bestWinRate && (
                            <div>✅ <strong>Highest Win Rate:</strong> {bestWinRate.label} with {bestWinRate.winRate.toFixed(1)}%</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {Object.values(comparisonData).every(s => !s || s.solvedGames === 0) && (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontSize: 14,
                }}>
                  No comparison data available yet. Complete games in multiple modes to see comparisons!
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
                e.currentTarget.style.borderColor = '#3A3A3C';
                e.currentTarget.style.color = '#d7dadc';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
