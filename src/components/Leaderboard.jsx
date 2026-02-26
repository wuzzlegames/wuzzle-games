import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../hooks/useAuth';
import { trackLeaderboardView } from '../lib/analytics';
import { formatElapsed } from '../lib/wordle';
import SiteHeader from './SiteHeader';
import UserCardWithBadges from './UserCardWithBadges';

const FeedbackModal = lazy(() => import('./FeedbackModal'));
import './Leaderboard.css';

function formatDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return '—';
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState('today');
  const [mode, setMode] = useState('daily');
  const [numBoards, setNumBoards] = useState(1);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const { entries, loading, error } = useLeaderboard(mode, mode === 'daily' ? numBoards : null, 100, scope);

  useEffect(() => {
    trackLeaderboardView('mode-specific');
  }, []);

  // All possible board counts for filtering (1-32)
  const boardOptions = [
    1, 2, 3, 4, 5, 6, 7, 8,
    9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 31, 32
  ];

  return (
    <>
      <Helmet>
        <title>Multiplayer & Speedrun Leaderboard – Wuzzle Games</title>
        <meta
          name="description"
          content="View the Wuzzle Games speedrun and Multiplayer Mode leaderboard, compare your multi-board and marathon times, and see how you rank against other players."
        />
      </Helmet>
      <div className="leaderboardRoot">
      <div className="leaderboardInner">
        <SiteHeader onOpenFeedback={() => setShowFeedbackModal(true)} />

        <div className="leaderboardContent">
        <h1 className="leaderboardTitle">Speedrun Leaderboard</h1>

        <div className="leaderboardFilters">
          <div className="leaderboardScopeBar" role="group" aria-label="Time range">
            <button
              type="button"
              className={`leaderboardScopeBtn${scope === 'today' ? ' leaderboardScopeBtn--active' : ''}`}
              onClick={() => setScope('today')}
            >
              Today
            </button>
            <button
              type="button"
              className={`leaderboardScopeBtn${scope === 'allTime' ? ' leaderboardScopeBtn--active' : ''}`}
              onClick={() => setScope('allTime')}
            >
              All Time
            </button>
          </div>
          <div className="leaderboardTabBar" role="tablist" aria-label="Leaderboard mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'daily'}
              className={`leaderboardTab${mode === 'daily' ? ' leaderboardTab--active' : ''}`}
              onClick={() => setMode('daily')}
            >
              Daily
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'solutionhunt'}
              className={`leaderboardTab${mode === 'solutionhunt' ? ' leaderboardTab--active' : ''}`}
              onClick={() => setMode('solutionhunt')}
            >
              Solution Hunt
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'marathon'}
              className={`leaderboardTab${mode === 'marathon' ? ' leaderboardTab--active' : ''}`}
              onClick={() => setMode('marathon')}
            >
              Marathon
            </button>
          </div>

          {mode === 'daily' && (
            <div className="filterGroup">
              <label className="filterLabel">Boards:</label>
              <select
                className="filterSelect"
                value={numBoards}
                onChange={(e) => {
                  setNumBoards(parseInt(e.target.value, 10));
                }}
              >
                {boardOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && (
          <div className="leaderboardError">
            Error loading leaderboard: {error}
          </div>
        )}

        {loading ? (
          <div className="leaderboardLoading">Loading leaderboard...</div>
        ) : entries.length === 0 ? (
          <div className="leaderboardEmpty">
            No entries yet. Be the first to submit a speedrun score!
          </div>
        ) : (
          <div className={`leaderboardTable${scope === 'allTime' ? ' leaderboardTable--allTime' : ''}`}>
            <div className={`leaderboardRow leaderboardHeaderRow${scope === 'allTime' ? ' leaderboardRow--allTime' : ''}`}>
              <div className="leaderboardRank">Rank</div>
              <div className="leaderboardName">Player</div>
              {scope === 'allTime' && <div className="leaderboardDate">Date</div>}
              <div className="leaderboardTime">Time</div>
            </div>
            {entries.map((entry, index) => {
              const isCurrentUser = user && entry.userId === user.uid;
              return (
                <div
                  key={entry.id}
                  className={`leaderboardRow ${scope === 'allTime' ? 'leaderboardRow--allTime' : ''} ${isCurrentUser ? 'leaderboardRowCurrent' : ''}`}
                >
                  <div className="leaderboardRank">#{index + 1}</div>
                  <div className="leaderboardName">
                    <UserCardWithBadges
                      userId={entry.userId}
                      username={entry.userName ?? 'Anonymous'}
                      isYou={isCurrentUser}
                      size="sm"
                    />
                  </div>
                  {scope === 'allTime' && <div className="leaderboardDate">{formatDateKey(entry.dateKey)}</div>}
                  <div className="leaderboardTime">{formatElapsed(entry.timeMs)}</div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={showFeedbackModal}
            onRequestClose={() => setShowFeedbackModal(false)}
          />
        </Suspense>
      </div>
    </div>
    </>
  );
}
