import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from './hooks/useAuth';
import { useSubscription } from './hooks/useSubscription';
import {
  loadGameRecords,
  loadMarathonStageRecords,
  calculateAdvancedStats,
  calculateMarathonStageStats,
  calculateMarathonSummaryFromGames,
  formatTime,
} from './lib/statsService';
import SiteHeader from './components/SiteHeader';
import SubscribeModal from './components/SubscribeModal';
import './AdvancedStats.css';

const MODES = [
  { mode: 'daily', speedrunEnabled: false, label: 'Daily Standard' },
  { mode: 'daily', speedrunEnabled: true, label: 'Daily Speedrun' },
  { mode: 'marathon', speedrunEnabled: false, label: 'Marathon Standard' },
  { mode: 'marathon', speedrunEnabled: true, label: 'Marathon Speedrun' },
  { mode: 'solutionhunt', speedrunEnabled: false, label: 'Solution Hunt Standard' },
  { mode: 'solutionhunt', speedrunEnabled: true, label: 'Solution Hunt Speedrun' },
];

export default function AdvancedStats() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get('mode') || 'daily';
  const speedrunParam = searchParams.get('speedrun') === 'true';
  const { user, loading: authLoading } = useAuth();
  const { showSubscriptionGate } = useSubscription(user);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [marathonSummary, setMarathonSummary] = useState(null);
  const [marathonStageStats, setMarathonStageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mode = MODES.some(m => m.mode === modeParam) ? modeParam : 'daily';
  const speedrunEnabled = speedrunParam;

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user, mode, speedrunEnabled]);

  async function loadStats() {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      if (mode === 'marathon') {
        const [gameRecords, stageRecords] = await Promise.all([
          loadGameRecords({ uid: user.uid, mode, speedrunEnabled }),
          loadMarathonStageRecords({ uid: user.uid, speedrunEnabled }),
        ]);
        if (gameRecords === null) {
          setError('Failed to load statistics.');
          setStats(null);
          setMarathonSummary(null);
          setMarathonStageStats(null);
        } else {
          setStats(null);
          setMarathonSummary(calculateMarathonSummaryFromGames(gameRecords, speedrunEnabled));
          setMarathonStageStats(calculateMarathonStageStats(stageRecords || [], speedrunEnabled));
        }
      } else {
        const gameRecords = await loadGameRecords({
          uid: user.uid,
          mode,
          speedrunEnabled,
        });
        if (gameRecords === null) {
          setError('Failed to load statistics.');
          setStats(null);
        } else {
          setStats(calculateAdvancedStats(gameRecords));
          setMarathonSummary(null);
          setMarathonStageStats(null);
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load statistics.');
      setStats(null);
      setMarathonSummary(null);
      setMarathonStageStats(null);
    } finally {
      setLoading(false);
    }
  }

  const setMode = (newMode, newSpeedrun) => {
    setSearchParams({ mode: newMode, speedrun: newSpeedrun ? 'true' : 'false' });
  };

  const getModeDisplayName = () => {
    const m = MODES.find(m => m.mode === mode && m.speedrunEnabled === speedrunEnabled);
    if (m) return m.label;
    const base = mode === 'daily' ? 'Daily' : mode === 'solutionhunt' ? 'Solution Hunt' : 'Marathon';
    return `${base} ${speedrunEnabled ? 'Speedrun' : 'Standard'}`;
  };

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

  const pageTitle = `${getModeDisplayName()} Statistics | Wuzzle Games`;

  function StatCard({ title, value, subtitle = null, locked = false, onClick = null }) {
    return (
      <div
        className={`stats-card ${locked ? 'stats-card--locked' : ''} ${locked && onClick ? 'stats-card--clickable' : ''}`}
        onClick={locked && onClick ? onClick : undefined}
        role={locked && onClick ? 'button' : undefined}
      >
        <div className="stats-card__label">{title}</div>
        <div className="stats-card__value">{locked ? '🔒' : value}</div>
        {subtitle && <div className="stats-card__subtitle">{subtitle}</div>}
        {locked && <div className="stats-card__premium">Premium only</div>}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={`Your ${getModeDisplayName()} statistics and performance on Wuzzle Games.`} />
      </Helmet>
      <div className="stats-page">
        <SiteHeader />
        <main className="stats-main">
          <div className="stats-container">
            <nav className="stats-nav">
              <button
                type="button"
                className="stats-back"
                onClick={() => navigate('/profile')}
              >
                ← Back to Profile
              </button>
            </nav>

            <header className="stats-header">
              <h1 className="stats-title">Statistics</h1>
              <p className="stats-subtitle">{getModeDisplayName()}</p>
              <div className="stats-mode-tabs">
                {MODES.map((m) => (
                  <button
                    key={`${m.mode}-${m.speedrunEnabled}`}
                    type="button"
                    className={`stats-mode-tab ${m.mode === mode && m.speedrunEnabled === speedrunEnabled ? 'stats-mode-tab--active' : ''}`}
                    onClick={() => setMode(m.mode, m.speedrunEnabled)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {showSubscriptionGate && (
                <p className="stats-premium-cta">
                  Subscribe to unlock all statistics.
                  <button
                    type="button"
                    className="stats-subscribe-btn"
                    onClick={() => setShowSubscribeModal(true)}
                  >
                    Subscribe
                  </button>
                </p>
              )}
            </header>

            {loading && (
              <div className="stats-loading">Loading statistics…</div>
            )}

            {error && (
              <div className="stats-error">{error}</div>
            )}

            {!loading && !error && (stats || (mode === 'marathon' && marathonSummary && marathonStageStats)) && (
              <>
                {mode === 'marathon' && marathonSummary && marathonStageStats ? (
                  /* Marathon layout: overall summary + per-stage sections */
                  <>
                    <section className="stats-section">
                      <h2 className="stats-section-title">Overall marathon summary</h2>
                      <div className="stats-grid">
                        <StatCard
                          title="Total marathons completed"
                          value={marathonSummary.totalMarathons}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Average total guesses"
                          value={marathonSummary.averageTotalGuesses.toFixed(2)}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Best marathon"
                          value={marathonSummary.bestMarathonGuesses != null ? `${marathonSummary.bestMarathonGuesses} guesses` : '—'}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Worst marathon"
                          value={marathonSummary.worstMarathonGuesses != null ? `${marathonSummary.worstMarathonGuesses} guesses` : '—'}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        {speedrunEnabled && (
                          <>
                            <StatCard
                              title="Average marathon time"
                              value={marathonSummary.averageTimeMs != null ? formatTime(marathonSummary.averageTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Fastest marathon"
                              value={marathonSummary.fastestTimeMs != null ? formatTime(marathonSummary.fastestTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Slowest marathon"
                              value={marathonSummary.slowestTimeMs != null ? formatTime(marathonSummary.slowestTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                          </>
                        )}
                      </div>
                    </section>

                    {[1, 2, 3, 4].map((numBoards) => {
                      const stageData = marathonStageStats.byStage[numBoards];
                      const hasData = stageData && stageData.solvedGames > 0;
                      const dist = stageData?.guessDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                      const maxCount = Math.max(...Object.values(dist), 1);
                      return (
                        <section key={numBoards} className="stats-section stats-section-stage">
                          <h2 className="stats-section-title">
                            {numBoards}-board stage
                          </h2>
                          {hasData ? (
                            <>
                              <div className="stats-chart-horizontal">
                                <div className="stats-chart-x-label">Number of stage completions</div>
                                <div className="stats-chart-body">
                                  {[1, 2, 3, 4, 5, 6].map((guessCount) => {
                                    const count = dist[guessCount] || 0;
                                    const percentage = stageData.solvedGames > 0
                                      ? Math.round((count / stageData.solvedGames) * 100 * 100) / 100
                                      : 0;
                                    const barWidthPct = (count / maxCount) * 100;
                                    return (
                                      <div key={guessCount} className="stats-chart-row">
                                        <div className="stats-chart-y-label">
                                          {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
                                        </div>
                                        <div className="stats-chart-bar-track">
                                          <div
                                            className="stats-chart-bar-fill"
                                            style={{ width: `${barWidthPct}%` }}
                                          />
                                        </div>
                                        <div className="stats-chart-bar-meta">
                                          <span className="stats-chart-bar-count">{count}</span>
                                          <span className="stats-chart-bar-pct">{percentage}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="stats-grid">
                                <StatCard
                                  title="Stages completed"
                                  value={stageData.solvedGames}
                                  locked={showSubscriptionGate}
                                  onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                />
                                <StatCard
                                  title="Average guesses"
                                  value={stageData.averageGuesses.toFixed(2)}
                                  locked={showSubscriptionGate}
                                  onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                />
                                <StatCard
                                  title="Best"
                                  value={stageData.bestPerformance != null ? `${stageData.bestPerformance} guess${stageData.bestPerformance === 1 ? '' : 'es'}` : '—'}
                                  locked={showSubscriptionGate}
                                  onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                />
                                <StatCard
                                  title="Worst"
                                  value={stageData.worstPerformance != null ? `${stageData.worstPerformance} guesses` : '—'}
                                  locked={showSubscriptionGate}
                                  onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                />
                                {speedrunEnabled && stageData.averageTimeMs != null && (
                                  <>
                                    <StatCard
                                      title="Average stage time"
                                      value={formatTime(stageData.averageTimeMs)}
                                      locked={showSubscriptionGate}
                                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                    />
                                    <StatCard
                                      title="Fastest stage"
                                      value={stageData.fastestTimeMs != null ? formatTime(stageData.fastestTimeMs) : '—'}
                                      locked={showSubscriptionGate}
                                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                    />
                                    <StatCard
                                      title="Slowest stage"
                                      value={stageData.slowestTimeMs != null ? formatTime(stageData.slowestTimeMs) : '—'}
                                      locked={showSubscriptionGate}
                                      onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                                    />
                                  </>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="stats-empty stats-empty-stage">No {numBoards}-board stage completions yet.</p>
                          )}
                        </section>
                      );
                    })}

                    {marathonSummary.totalMarathons === 0 && marathonStageStats.totals.totalStages === 0 && (
                      <p className="stats-empty">No marathon statistics yet. Complete stages to see your stats.</p>
                    )}
                  </>
                ) : (
                  /* Daily layout */
                  <>
                    {/* Guess Distribution - horizontal chart: Y = guess count, X = number of games */}
                    <section className="stats-section">
                      <h2 className="stats-section-title">Guess distribution</h2>
                      <div className="stats-chart-horizontal">
                        <div className="stats-chart-x-label">Number of games</div>
                        <div className="stats-chart-body">
                          {[1, 2, 3, 4, 5, 6].map((guessCount) => {
                            const dist = stats.guessDistribution || {};
                            const count = dist[guessCount] || 0;
                            const percentage = stats.solvedGames > 0
                              ? Math.round((count / stats.solvedGames) * 100 * 100) / 100
                              : 0;
                            const maxCount = Math.max(1, ...Object.values(dist));
                            const barWidthPct = (count / maxCount) * 100;
                            return (
                              <div key={guessCount} className="stats-chart-row">
                                <div className="stats-chart-y-label">
                                  {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}
                                </div>
                                <div className="stats-chart-bar-track">
                                  <div
                                    className="stats-chart-bar-fill"
                                    style={{ width: `${barWidthPct}%` }}
                                  />
                                </div>
                                <div className="stats-chart-bar-meta">
                                  <span className="stats-chart-bar-count">{count}</span>
                                  <span className="stats-chart-bar-pct">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    <section className="stats-section">
                      <h2 className="stats-section-title">Performance</h2>
                      <div className="stats-grid">
                        <StatCard
                          title="Total games solved"
                          value={stats.solvedGames}
                          subtitle={`of ${stats.totalGames} games`}
                        />
                        <StatCard
                          title="Win rate"
                          value={`${stats.winRate}%`}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Average guesses"
                          value={stats.averageGuesses.toFixed(2)}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Median guesses"
                          value={stats.medianGuesses}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Best"
                          value={stats.bestPerformance !== null ? `${stats.bestPerformance} guess${stats.bestPerformance === 1 ? '' : 'es'}` : '—'}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Worst"
                          value={stats.worstPerformance !== null ? `${stats.worstPerformance} guesses` : '—'}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Perfect games"
                          value={stats.perfectGames}
                          subtitle={`${stats.perfectGamesPercentage}% of solved`}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Solved in 3 or fewer"
                          value={stats.gamesSolvedIn3OrFewer}
                          subtitle={`${stats.gamesSolvedIn3OrFewerPercentage}% of solved`}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                        <StatCard
                          title="Solved in 4 or fewer"
                          value={stats.gamesSolvedIn4OrFewer}
                          subtitle={`${stats.gamesSolvedIn4OrFewerPercentage}% of solved`}
                          locked={showSubscriptionGate}
                          onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                        />
                      </div>
                    </section>

                    {speedrunEnabled && (
                      <>
                        <section className="stats-section">
                          <h2 className="stats-section-title">Time-based</h2>
                          <div className="stats-grid">
                            <StatCard
                              title="Average solve time"
                              value={stats.averageTimeMs != null ? formatTime(stats.averageTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Median solve time"
                              value={stats.medianTimeMs != null ? formatTime(stats.medianTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Fastest solve"
                              value={stats.fastestTimeMs != null ? formatTime(stats.fastestTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Slowest solve"
                              value={stats.slowestTimeMs != null ? formatTime(stats.slowestTimeMs) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                            <StatCard
                              title="Avg time per guess"
                              value={stats.averageTimePerGuess != null ? formatTime(stats.averageTimePerGuess) : '—'}
                              locked={showSubscriptionGate}
                              onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                            />
                          </div>
                        </section>
                        {stats.sub30Count !== undefined && (
                          <section className="stats-section">
                            <h2 className="stats-section-title">Speed categories</h2>
                            <div className="stats-grid">
                              <StatCard
                                title="Sub-30s"
                                value={stats.sub30Count}
                                subtitle={`${stats.sub30Percentage}% of solved`}
                                locked={showSubscriptionGate}
                                onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                              />
                              <StatCard
                                title="Sub-1 min"
                                value={stats.sub60Count}
                                subtitle={`${stats.sub60Percentage}% of solved`}
                                locked={showSubscriptionGate}
                                onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                              />
                              <StatCard
                                title="Sub-2 min"
                                value={stats.sub120Count}
                                subtitle={`${stats.sub120Percentage}% of solved`}
                                locked={showSubscriptionGate}
                                onClick={() => showSubscriptionGate && setShowSubscribeModal(true)}
                              />
                            </div>
                          </section>
                        )}
                        {stats.avgTimeMsByGuesses && (
                          <section className="stats-section">
                            <h2 className="stats-section-title">Average time by guess count</h2>
                            <div className="stats-time-by-guess">
                              {[1, 2, 3, 4, 5, 6].map((g) => {
                                const ms = stats.avgTimeMsByGuesses[g];
                                return (
                                  <div key={g} className="stats-time-by-guess-row">
                                    <span className="stats-time-by-guess-label">
                                      {g} {g === 1 ? 'guess' : 'guesses'}
                                    </span>
                                    <span className="stats-time-by-guess-value">
                                      {ms != null ? formatTime(ms) : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        )}
                      </>
                    )}

                    {stats.solvedGames === 0 && (
                      <p className="stats-empty">No statistics yet. Complete some games to see your stats.</p>
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
