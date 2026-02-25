import React, { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import Home from "./Home";
import { getAllGameModes } from "./lib/gameModes";
import ErrorBoundary from "./components/ErrorBoundary";
import { useConnectionStatus } from "./hooks/useConnectionStatus";
import { useAuth } from "./hooks/useAuth";
import { trackPageView } from "./lib/gtm";
import { trackSubscription } from "./lib/analytics";
import { MultiplayerFriendRequestProvider } from "./contexts/MultiplayerFriendRequestContext";
import { BadgeEarnedToastProvider } from "./contexts/BadgeEarnedToastContext";
import "./Game.css"; // For utility classes like loadingContainer
const Game = lazy(() => import("./Game"));
const Profile = lazy(() => import("./Profile"));
const AdvancedStats = lazy(() => import("./AdvancedStats"));
const CrossModeComparison = lazy(() => import("./CrossModeComparison"));
const Leaderboard = lazy(() => import("./components/Leaderboard"));
const Faq = lazy(() => import("./Faq"));
const HowToPlay = lazy(() => import("./HowToPlay"));
const MultiplayerWordleLanding = lazy(() => import("./landing/MultiplayerWordleLanding.jsx"));
const MultiBoardWordleLanding = lazy(() => import("./landing/MultiBoardWordleLanding.jsx"));
const WordleSpeedrunLanding = lazy(() => import("./landing/WordleSpeedrunLanding.jsx"));
const WordleMarathonLanding = lazy(() => import("./landing/WordleMarathonLanding.jsx"));

const MARATHON_LEVELS = [1, 2, 3, 4];

function App() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dailyBoards, setDailyBoards] = useState(1);
  const { isOnline, queueSize, hasQueuedUpdates } = useConnectionStatus();
  const { user } = useAuth();

  // Handle subscription success/cancel redirects from Stripe. When subscription is disabled (isSubscriptionAllowed false), these params have no user-visible effect.
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    if (subscriptionStatus === 'success') {
      // Remove the query parameter
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('subscription');
        return newParams;
      });
      
      console.log('Subscription successful! Premium features are now active.');
      trackSubscription('complete');
      
      // Force refresh auth token to get latest custom claims (stripeRole)
      // This triggers the useSubscription hook to re-check the subscription status
      if (user) {
        user.getIdTokenResult(true)
          .then(() => {
            console.log('Auth token refreshed with latest custom claims');
          })
          .catch((err) => {
            console.error('Failed to refresh token:', err);
          });
      }
    } else if (subscriptionStatus === 'cancelled') {
      // Remove the query parameter
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('subscription');
        return newParams;
      });
      console.log('Subscription cancelled.');
      trackSubscription('cancelled');
    }
  }, [searchParams, setSearchParams, user]);

  // Reset dailyBoards to 1 only when navigating to the actual home route.
  // This avoids coupling behavior to trailing slashes on non-home routes.
  useEffect(() => {
    if (location.pathname === '/') {
      setDailyBoards(1);
    }
  }, [location.pathname]);

  // On mobile devices, always scroll to top when navigating to a new route.
  // Desktop users keep their scroll position between route changes.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
      if (isMobile) {
        // Use "auto" for broad browser support; "instant" is non‑standard.
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    }
  }, [location.pathname]);

  // Track page views for analytics
  useEffect(() => {
    // Get page title from document or use pathname
    const pageTitle = document.title || location.pathname;
    trackPageView(location.pathname, pageTitle);
  }, [location.pathname]);

  const marathonLevelsMemo = useMemo(() => MARATHON_LEVELS, []);
  const gameModes = useMemo(() => getAllGameModes(), []);

  return (
    <ErrorBoundary>
      <MultiplayerFriendRequestProvider>
      <BadgeEarnedToastProvider>
      {/* Connection status indicator */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--c-error)',
          color: 'var(--c-text)',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 10000,
          pointerEvents: 'none',
        }}>
          Offline - Changes will be saved when connection is restored
          {hasQueuedUpdates && ` (${queueSize} update${queueSize !== 1 ? 's' : ''} queued)`}
        </div>
      )}
      {isOnline && hasQueuedUpdates && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--c-correct)',
          color: 'var(--c-text)',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 10000,
          pointerEvents: 'none',
        }}>
          Syncing {queueSize} update{queueSize !== 1 ? 's' : ''}...
        </div>
      )}
      <Suspense fallback={<div className="loadingContainer">Loading…</div>}>
        <Routes>
        <Route 
          path="/" 
          element={
            <Home
              dailyBoards={dailyBoards}
              setDailyBoards={setDailyBoards}
              marathonLevels={marathonLevelsMemo}
            />
          } 
        />
        {/* Game routes - supports both query params and route params for backward compatibility */}
        {/* Route params format: /game/:mode/:boards?/:variant? */}
        {/* Query params format: /game?mode=:mode&boards=:boards&speedrun=true */}
        <Route path="/game" element={<Game marathonLevels={marathonLevelsMemo} />} />
        <Route path="/game/:mode" element={<Game marathonLevels={marathonLevelsMemo} />} />
        <Route path="/game/:mode/:boards" element={<Game marathonLevels={marathonLevelsMemo} />} />
        <Route path="/game/:mode/:boards/:variant" element={<Game marathonLevels={marathonLevelsMemo} />} />
        {/* Multiplayer routes - special handling for game codes */}
        <Route path="/game/multiplayer/:code" element={<Game marathonLevels={marathonLevelsMemo} />} />
        <Route path="/game/multiplayer/:code/:variant" element={<Game marathonLevels={marathonLevelsMemo} />} />
        {/* Static pages */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/stats" element={<AdvancedStats />} />
        <Route path="/stats/compare" element={<CrossModeComparison />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/how-to-play" element={<HowToPlay />} />
        {/* SEO landing pages */}
        <Route path="/multiplayer-wuzzle" element={<MultiplayerWordleLanding />} />
        <Route path="/multi-board-wuzzle" element={<MultiBoardWordleLanding />} />
        <Route path="/wuzzle-speedrun" element={<WordleSpeedrunLanding />} />
        <Route path="/wuzzle-marathon" element={<WordleMarathonLanding />} />
        {/* Catch-all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </BadgeEarnedToastProvider>
      </MultiplayerFriendRequestProvider>
    </ErrorBoundary>
  );
}

export default App;
