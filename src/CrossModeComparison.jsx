import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import { loadGameRecords, calculateAdvancedStats, formatTime } from './lib/statsService';
import SiteHeader from './components/SiteHeader';
import SubscribeModal from './components/SubscribeModal';
import './AdvancedStats.css';

const MODES = [
  { mode: 'daily', speedrunEnabled: false, label: 'Daily Standard' },
  { mode: 'daily', speedrunEnabled: true, label: 'Daily Speedrun' },
  { mode: 'marathon', speedrunEnabled: false, label: 'Marathon Standard' },
  { mode: 'marathon', speedrunEnabled: true, label: 'Marathon Speedrun' },
  { mode: 'solutionhunt', speedrunEnabled: false, label: 'Solution Hunt' },
  { mode: 'solutionhunt', speedrunEnabled: true, label: 'Sol. Hunt Speedrun' },
];

export default function CrossModeComparison() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadComparisonData();
    } else if (!authLoading) {
      setError('You must be signed in to view cross-mode comparisons.');
      setLoading(false);
    }
  }, [user, authLoading]);

  const loadComparisonData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const allStats = {};
      for (const { mode, speedrunEnabled, label } of MODES) {
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
    } catch (err) {
      console.error('Failed to load comparison data:', err);
      setError('Failed to load comparison data.');
    } finally {
      setLoading(false);
    }
  };

  function ComparisonRow({ label, getValue, formatValue = (v) => v, showBest = false, showWorst = false }) {
    if (!comparisonData) return null;
    const values = {};
    let bestValue = null;
    let bestLabel = null;
    let worstValue = null;
    let worstLabel = null;
    MODES.forEach(({ label: modeLabel }) => {
      const stats = comparisonData[modeLabel];
      if (stats && stats.solvedGames > 0) {
        try {
          const value = getValue(stats);
          values[modeLabel] = value;
          if (value !== null && value !== undefined) {
            const compareValue = typeof value === 'object' && value !== null ? value.count : value;
            if (typeof compareValue === 'number' && !isNaN(compareValue)) {
              const currentBest = typeof bestValue === 'object' && bestValue !== null ? bestValue.count : bestValue;
              const currentWorst = typeof worstValue === 'object' && worstValue !== null ? worstValue.count : worstValue;
              if (showBest) {
                if (bestValue === null || compareValue < currentBest) {
                  bestValue = value;
                  bestLabel = modeLabel;
                }
              } else if (showWorst) {
                if (worstValue === null || compareValue > currentWorst) {
                  worstValue = value;
                  worstLabel = modeLabel;
                }
              } else {
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
      <div className="compare-row">
        <div className="compare-row-label">{label}</div>
        {MODES.map(({ label: modeLabel }) => {
          const value = values[modeLabel];
          const isBest = showBest && bestLabel === modeLabel && value !== null;
          const isWorst = showWorst && worstLabel === modeLabel && value !== null;
          return (
            <div
              key={modeLabel}
              className={`compare-row-cell ${value === null ? 'compare-row-cell--empty' : ''} ${isBest ? 'compare-row-cell--best' : ''} ${isWorst ? 'compare-row-cell--worst' : ''}`}
            >
              {value === null ? 'N/A' : formatValue(value)}
            </div>
          );
        })}
      </div>
    );
  }

  if (!authLoading && !user) {
    navigate('/', { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="stats-page">
        <SiteHeader />
        <main className="stats-main">
          <div className="stats-container">
            <div className="stats-loading">Loading…</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Cross-Mode Comparison | Wuzzle Games</title>
        <meta name="description" content="Compare your performance across all Wuzzle Games modes." />
      </Helmet>
      <div className="stats-page">
        <SiteHeader />
        <main className="stats-main">
          <div className="stats-container">
            <nav className="stats-nav">
              <button type="button" className="stats-back" onClick={() => navigate('/profile')}>
                ← Back to Profile
              </button>
            </nav>

            <header className="stats-header">
              <h1 className="stats-title">Cross-Mode Comparison</h1>
              <p className="stats-subtitle">Compare your performance across all game modes</p>
            </header>

            {showSubscriptionGate && (
              <div className="compare-gate">
                <div className="compare-gate-icon">🔒</div>
                <h2 className="compare-gate-title">Premium Feature</h2>
                <p className="compare-gate-text">
                  Cross-mode comparisons are available for premium members only. Subscribe to unlock this feature and compare your performance across all game modes.
                </p>
                <div className="compare-gate-actions">
                  <button type="button" className="compare-gate-btn compare-gate-btn--primary" onClick={() => setShowSubscribeModal(true)}>
                    Subscribe
                  </button>
                  <button type="button" className="compare-gate-btn compare-gate-btn--outline" onClick={() => navigate('/profile')}>
                    Back to Profile
                  </button>
                </div>
              </div>
            )}

            {!showSubscriptionGate && (
              <>
                {loading && <div className="stats-loading">Loading comparison data…</div>}
                {error && <div className="stats-error">{error}</div>}

                {!loading && !error && comparisonData && (
                  <>
                    <div className="compare-table-wrapper">
                      <div className="compare-header-row">
                        <div className="compare-header-metric">Metric</div>
                        {MODES.map(({ label }) => (
                          <div key={label} className="compare-header-cell">
                            {label}
                          </div>
                        ))}
                      </div>

                      <div className="compare-section">
                        <div className="compare-section-title">Basic Statistics</div>
                        <ComparisonRow label="Total Games" getValue={(stats) => stats.totalGames} />
                        <ComparisonRow label="Games Solved" getValue={(stats) => stats.solvedGames} />
                        <ComparisonRow
                          label="Win Rate"
                          getValue={(stats) => stats.winRate}
                          formatValue={(v) => `${v.toFixed(1)}%`}
                        />
                      </div>

                      <div className="compare-section">
                        <div className="compare-section-title">Performance Metrics</div>
                        <ComparisonRow
                          label="Average Guesses"
                          getValue={(stats) => stats.averageGuesses}
                          formatValue={(v) => v.toFixed(2)}
                          showBest
                        />
                        <ComparisonRow label="Median Guesses" getValue={(stats) => stats.medianGuesses} showBest />
                        <ComparisonRow
                          label="Best Performance"
                          getValue={(stats) => stats.bestPerformance}
                          formatValue={(v) => (v !== null ? `${v} guess${v === 1 ? '' : 'es'}` : 'N/A')}
                          showBest
                        />
                        <ComparisonRow
                          label="Worst Performance"
                          getValue={(stats) => stats.worstPerformance}
                          formatValue={(v) => (v !== null ? `${v} guesses` : 'N/A')}
                          showWorst
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
                          formatValue={(v) => (v === null ? 'N/A' : `${v.count} (${v.percentage.toFixed(1)}%)`)}
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
                          formatValue={(v) => (v === null ? 'N/A' : `${v.count} (${v.percentage.toFixed(1)}%)`)}
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
                          formatValue={(v) => (v === null ? 'N/A' : `${v.count} (${v.percentage.toFixed(1)}%)`)}
                        />
                      </div>

                      <div className="compare-section">
                        <div className="compare-section-title">Time-Based Statistics (Speedrun Modes)</div>
                        <ComparisonRow
                          label="Average Solve Time"
                          getValue={(stats) => (stats.speedrunEnabled && stats.averageTimeMs !== null ? stats.averageTimeMs : null)}
                          formatValue={(v) => (v !== null ? formatTime(v) : 'N/A')}
                          showBest
                        />
                        <ComparisonRow
                          label="Median Solve Time"
                          getValue={(stats) => (stats.speedrunEnabled && stats.medianTimeMs !== null ? stats.medianTimeMs : null)}
                          formatValue={(v) => (v !== null ? formatTime(v) : 'N/A')}
                          showBest
                        />
                        <ComparisonRow
                          label="Fastest Solve"
                          getValue={(stats) => (stats.speedrunEnabled && stats.fastestTimeMs !== null ? stats.fastestTimeMs : null)}
                          formatValue={(v) => (v !== null ? formatTime(v) : 'N/A')}
                          showBest
                        />
                        <ComparisonRow
                          label="Slowest Solve"
                          getValue={(stats) => (stats.speedrunEnabled && stats.slowestTimeMs !== null ? stats.slowestTimeMs : null)}
                          formatValue={(v) => (v !== null ? formatTime(v) : 'N/A')}
                          showWorst
                        />
                        <ComparisonRow
                          label="Avg Time per Guess"
                          getValue={(stats) => (stats.speedrunEnabled && stats.averageTimePerGuess !== null ? stats.averageTimePerGuess : null)}
                          formatValue={(v) => (v !== null ? formatTime(v) : 'N/A')}
                          showBest
                        />
                      </div>
                    </div>

                    {Object.values(comparisonData).some((s) => s && s.solvedGames > 0) && (
                      <div className="compare-insights">
                        <h3 className="compare-insights-title">Performance Insights</h3>
                        <div className="compare-insights-body">
                          {(() => {
                            const validStats = Object.entries(comparisonData)
                              .filter(([_, stats]) => stats && stats.solvedGames > 0)
                              .map(([label, stats]) => ({ label, ...stats }));
                            if (validStats.length === 0) return null;
                            const bestMode = validStats.reduce((best, current) => {
                              if (!best || current.averageGuesses < best.averageGuesses) return current;
                              return best;
                            }, null);
                            const mostActive = validStats.reduce((most, current) => {
                              if (!most || current.totalGames > most.totalGames) return current;
                              return most;
                            }, null);
                            const bestWinRate = validStats.reduce((best, current) => {
                              if (!best || current.winRate > best.winRate) return current;
                              return best;
                            }, null);
                            return (
                              <>
                                {bestMode && (
                                  <div>
                                    🏆 <strong>Best Performance:</strong> {bestMode.label} with {bestMode.averageGuesses.toFixed(2)} average guesses
                                  </div>
                                )}
                                {mostActive && (
                                  <div>
                                    📊 <strong>Most Active:</strong> {mostActive.label} with {mostActive.totalGames} total games
                                  </div>
                                )}
                                {bestWinRate && (
                                  <div>
                                    ✅ <strong>Highest Win Rate:</strong> {bestWinRate.label} with {bestWinRate.winRate.toFixed(1)}%
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {Object.values(comparisonData).every((s) => !s || s.solvedGames === 0) && (
                      <p className="stats-empty">No comparison data available yet. Complete games in multiple modes to see comparisons!</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      <SubscribeModal
        isOpen={showSubscribeModal}
        onRequestClose={() => setShowSubscribeModal(false)}
        onSubscriptionComplete={() => setShowSubscribeModal(false)}
      />
    </>
  );
}
