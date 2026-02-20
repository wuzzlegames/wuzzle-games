import React, { useState, useCallback, useMemo, useEffect, Suspense, lazy } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MAX_BOARDS } from "./lib/gameConstants";
import "./Home.css";
import Modal from "./components/Modal";
import SiteHeader from "./components/SiteHeader";
import { useAuth } from "./hooks/useAuth";

const FeedbackModal = lazy(() => import("./components/FeedbackModal"));
const MultiplayerModal = lazy(() => import("./components/MultiplayerModal"));
const FriendsModal = lazy(() => import("./components/FriendsModal"));
const SignInRequiredModal = lazy(() => import("./components/SignInRequiredModal"));
const OpenRoomsModal = lazy(() => import("./components/OpenRoomsModal"));
import { loadJSON, saveJSON, marathonMetaKey } from "./lib/persist";
import { loadMarathonMeta } from "./lib/marathonMeta";
import { database } from "./config/firebase";
import { ref, get } from "firebase/database";

const BOARD_OPTIONS = Array.from({ length: MAX_BOARDS }, (_, i) => i + 1);

const ModeRow = React.memo(function ModeRow({ title, desc, buttonText, onClick, variant = "green", titleRight, modeVariant = "daily" }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (onClick) onClick();
    }
  };

  return (
    <div
      className={`modeRow modeRow--${modeVariant}`}
      role="button"
      tabIndex={0}
      aria-label={buttonText || title}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="modeRowText">
        <div className="modeRowTitle">
          {title}
          {titleRight ? <span className="modeRowTitleRight">{titleRight}</span> : null}
        </div>
        <div className="modeRowDesc">{desc}</div>
      </div>
    </div>
  );
});

export default function Home({
  dailyBoards,
  setDailyBoards,

  marathonLevels
}) {
  const navigate = useNavigate();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [showMultiplayerConfig, setShowMultiplayerConfig] = useState(false);
  const [showVerifyEmailModal, setShowVerifyEmailModal] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");

  const [activeTab, setActiveTab] = useState("singleplayer");
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showOpenRoomsModal, setShowOpenRoomsModal] = useState(false);
  const [showSignInRequired, setShowSignInRequired] = useState(false);
  const [showMpVerifyModal, setShowMpVerifyModal] = useState(false);

  const { user: authUser, isVerifiedUser } = useAuth();

  // Track separate stage indices for standard and speedrun marathon for display.
  const [marathonStandardIndexUI, setMarathonStandardIndexUI] = useState(0);
  const [marathonSpeedrunIndexUI, setMarathonSpeedrunIndexUI] = useState(0);

  // Initialize stage indices from persisted marathon meta on mount. For
  // signed-in users we prefer the server copy so stage numbers stay in sync
  // across devices, falling back to local storage when offline or on error.
  useEffect(() => {
    let isMounted = true;

    const loadMetaFor = async (speedrunEnabledFlag) => {
      const metaKey = marathonMetaKey(speedrunEnabledFlag);
      let meta = null;

      if (authUser) {
        try {
          const metaRef = ref(
            database,
            `users/${authUser.uid}/singlePlayer/meta/${metaKey}`,
          );
          const snap = await get(metaRef);
          if (snap.exists()) {
            meta = snap.val() || null;
            // Mirror server meta into local storage so GameSinglePlayer can
            // pick it up even when we navigate directly.
            if (meta) {
              saveJSON(metaKey, meta);
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to load remote marathon meta for home", err);
        }
      }

      if (!meta) {
        meta = loadMarathonMeta(speedrunEnabledFlag);
      }

      return meta;
    };

    (async () => {
      const [standardMeta, speedrunMeta] = await Promise.all([
        loadMetaFor(false),
        loadMetaFor(true),
      ]);

      const standardIndex =
        standardMeta && typeof standardMeta.index === "number" ? standardMeta.index : 0;
      const speedrunIndex =
        speedrunMeta && typeof speedrunMeta.index === "number" ? speedrunMeta.index : 0;

      setMarathonStandardIndexUI(standardIndex >= marathonLevels.length ? 0 : standardIndex);
      setMarathonSpeedrunIndexUI(speedrunIndex >= marathonLevels.length ? 0 : speedrunIndex);
    })();

    return () => {
      isMounted = false;
    };
  }, [authUser]);
  
  const marathonMaxLabel = useMemo(() => marathonLevels[marathonLevels.length - 1], [marathonLevels]);
  const currentStandardBoards = useMemo(
    () => marathonLevels[marathonStandardIndexUI] || marathonLevels[0],
    [marathonLevels, marathonStandardIndexUI]
  );
  const currentSpeedrunBoards = useMemo(
    () => marathonLevels[marathonSpeedrunIndexUI] || marathonLevels[0],
    [marathonLevels, marathonSpeedrunIndexUI]
  );
  
  const handleCloseFeedback = useCallback(() => setShowFeedbackModal(false), []);
  const handleOpenFeedback = useCallback(() => setShowFeedbackModal(true), []);
  
  const handleDailyStandard = useCallback(() => {
    saveJSON("mw:dailyBoards", dailyBoards);
    navigate(`/game/daily/${dailyBoards}`);
  }, [dailyBoards, navigate]);
  
  const handleDailySpeedrun = useCallback(() => {
    saveJSON("mw:dailyBoards", dailyBoards);
    navigate(`/game/daily/${dailyBoards}/speedrun`);
  }, [dailyBoards, navigate]);

  const handleSolutionHunt = useCallback(() => {
    navigate('/game/solutionhunt');
  }, [navigate]);

  const handleSolutionHuntSpeedrun = useCallback(() => {
    navigate('/game/solutionhunt/speedrun');
  }, [navigate]);
  
  const handleMarathonStandard = useCallback(() => {
    navigate(`/game/marathon`);
  }, [navigate]);
  
  const handleMarathonSpeedrun = useCallback(() => {
    // Use query params so Game.jsx can read mode=marathon & speedrun=true
    navigate(`/game?mode=marathon&speedrun=true`);
  }, [navigate]);
  
  const dailyWordsRight = (
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      Words:&nbsp;
      <select
        value={dailyBoards}
        onChange={(e) => { e.stopPropagation(); setDailyBoards(parseInt(e.target.value, 10)); }}
        className="modeRowTitleSelect"
        aria-label="Number of words"
      >
        {BOARD_OPTIONS.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </span>
  );

  const handleJoinRoom = useCallback(() => {
    if (!authUser) {
      setShowSignInRequired(true);
      return;
    }
    if (!isVerifiedUser) {
      setShowMpVerifyModal(true);
      return;
    }
    setShowOpenRoomsModal(true);
  }, [authUser, isVerifiedUser]);

  const handleHostRoom = useCallback(() => {
    setShowMultiplayerConfig(true);
    setShowMultiplayerModal(true);
  }, []);

  const handleChallengeFriend = useCallback(() => {
    if (!authUser) {
      setShowSignInRequired(true);
      return;
    }
    setShowFriendsModal(true);
  }, [authUser]);

  return (
    <>
      <Helmet>
        <title>Wuzzle Games</title>
        <meta
          name="description"
          content="Wuzzle Games is a Wordle alternative with multi-board daily puzzles, marathon and speedrun modes, and Multiplayer Mode battles with friends."
        />
      </Helmet>
      <div className="homeRoot">
      <div className="homeInner">
        <SiteHeader
          onOpenFeedback={handleOpenFeedback}
          onSignUpComplete={(email) => {
            setVerifyEmailAddress(email);
            setShowVerifyEmailModal(true);
          }}
        />

        <Modal
          isOpen={showVerifyEmailModal}
          onRequestClose={() => setShowVerifyEmailModal(false)}
          titleId="verify-email-modal-title"
        >
          <div style={{ padding: "24px", textAlign: "left" }}>
            <h2
              id="verify-email-modal-title"
              style={{
                margin: "0 0 16px 0",
                fontSize: 20,
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              Verify your email
            </h2>
            <p
              style={{
                margin: "0 0 12px 0",
                fontSize: 14,
                color: "#d7dadc",
                lineHeight: 1.5,
              }}
            >
              We&apos;ve sent a verification link to
              {" "}
              <span style={{ fontWeight: "bold" }}>
                {verifyEmailAddress || "your email address"}
              </span>
              .
            </p>
            <p
              style={{
                margin: "0 0 16px 0",
                fontSize: 14,
                color: "#d7dadc",
                lineHeight: 1.5,
              }}
>
              Please open that email and click the link to verify your account.
              Once verified, you&apos;ll be able to play Multiplayer Mode and add friends.
              Check your Spam or Junk folder for the verification link.
            </p>
            <div className="flexRow justifyEnd">
              <button
                type="button"
                className="homeBtn homeBtnGreen homeBtnLg"
                onClick={() => setShowVerifyEmailModal(false)}
                style={{
                  minWidth: 120,
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </Modal>

        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={showFeedbackModal}
            onRequestClose={handleCloseFeedback}
          />
        </Suspense>

        {showMultiplayerModal && (
          <Suspense fallback={null}>
            <MultiplayerModal
              isOpen
              onRequestClose={() => {
                setShowMultiplayerModal(false);
                setShowMultiplayerConfig(false);
              }}
              showConfigFirst={showMultiplayerConfig}
              onConfigClose={() => {
                setShowMultiplayerConfig(false);
                setShowMultiplayerModal(false);
              }}
              onConfigOpen={() => setShowMultiplayerConfig(true)}
            />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <FriendsModal
            isOpen={showFriendsModal}
            onRequestClose={() => setShowFriendsModal(false)}
          />
        </Suspense>

        <Suspense fallback={null}>
          <SignInRequiredModal
            isOpen={showSignInRequired}
            onRequestClose={() => setShowSignInRequired(false)}
            title="Multiplayer Mode"
            message="You need to sign in to play Multiplayer Mode."
          />
        </Suspense>

        <Suspense fallback={null}>
          <OpenRoomsModal
            isOpen={showOpenRoomsModal}
            onRequestClose={() => setShowOpenRoomsModal(false)}
          />
        </Suspense>

        <Modal
          isOpen={showMpVerifyModal}
          onRequestClose={() => setShowMpVerifyModal(false)}
          titleId="mp-verify-email-modal-title"
        >
          <div style={{ padding: "24px" }}>
            <h2
              id="mp-verify-email-modal-title"
              style={{
                margin: "0 0 16px 0",
                fontSize: 20,
                fontWeight: "bold",
                color: "#ffffff",
              }}
            >
              Verify your email
            </h2>
            <p style={{ marginBottom: "20px", color: "#d7dadc", fontSize: 14 }}>
              You must verify your email address or sign in with Google to play Multiplayer Mode.
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                onClick={() => setShowMpVerifyModal(false)}
                className="homeBtn homeBtnOutline homeBtnLg"
                style={{ flex: 1, textAlign: "center" }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowMpVerifyModal(false);
                  navigate("/profile");
                }}
                className="homeBtn homeBtnGreen homeBtnLg"
                style={{ flex: 1, textAlign: "center" }}
              >
                Go to Profile
              </button>
            </div>
          </div>
        </Modal>

        <main>
          <div className="homeTabBar">
            <button
              className={`homeTab${activeTab === 'singleplayer' ? ' homeTab--active' : ''}`}
              onClick={() => setActiveTab('singleplayer')}
            >
              Single Player
            </button>
            <button
              className={`homeTab${activeTab === 'multiplayer' ? ' homeTab--active' : ''}`}
              onClick={() => setActiveTab('multiplayer')}
            >
              Multiplayer
            </button>
          </div>

          {activeTab === 'singleplayer' && (
            <section className="panel">
              <div className="spGrid">
                <div className="spGridHeaders">
                  <div className="spGridHeader">Standard</div>
                  <div className="spGridHeader">Speedrun</div>
                </div>

                {/* Daily Row */}
                <div className="spGridRowGroup">
                  <div className="spGridRow">
                    <ModeRow
                      title="Daily (standard)"
                      desc="Limited turns. No timer. Good for casual play."
                      buttonText="Play Daily"
                      onClick={handleDailyStandard}
                      variant="green"
                      modeVariant="daily"
                      titleRight={dailyWordsRight}
                    />
                    <ModeRow
                      title="Daily (speedrun)"
                      desc="Unlimited guesses. Timer starts immediately."
                      buttonText="Speedrun Daily"
                      onClick={handleDailySpeedrun}
                      variant="green"
                      modeVariant="speedrun"
                      titleRight={dailyWordsRight}
                    />
                  </div>
                </div>

                {/* Solution Hunt Row */}
                <div className="spGridRowGroup">
                  <div className="spGridRow">
                    <ModeRow
                      title="Solution Hunt (standard)"
                      desc="See all possible remaining words as you guess. Great for learning."
                      buttonText="Play Solution Hunt"
                      onClick={handleSolutionHunt}
                      variant="green"
                      modeVariant="daily"
                    />
                    <ModeRow
                      title="Solution Hunt (speedrun)"
                      desc="Solution Hunt with timer. Unlimited guesses, see remaining words."
                      buttonText="Speedrun Solution Hunt"
                      onClick={handleSolutionHuntSpeedrun}
                      variant="green"
                      modeVariant="speedrun"
                    />
                  </div>
                </div>

                {/* Marathon Row */}
                <div className="spGridRowGroup">
                  <div className="spGridRow">
                    <ModeRow
                      title="Marathon (standard)"
                      desc="Play standard marathon. Limited turns. No timer."
                      buttonText="Play Marathon"
                      onClick={handleMarathonStandard}
                      variant="gold"
                      modeVariant="daily"
                      titleRight={`Stage ${marathonStandardIndexUI + 1}/${marathonLevels.length}`}
                    />
                    <ModeRow
                      title="Marathon (speedrun)"
                      desc="Play speedrun marathon. Unlimited guesses, timed cumulative."
                      buttonText="Speedrun Marathon"
                      onClick={handleMarathonSpeedrun}
                      variant="gold"
                      modeVariant="speedrun"
                      titleRight={`Stage ${marathonSpeedrunIndexUI + 1}/${marathonLevels.length}`}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'multiplayer' && (
            <section className="panel">
              <div className="panelTop">
                <div>
                  <h2 className="panelTitle">Multiplayer Wordle Battles</h2>
                  <div className="panelDesc">
                    Host or join real-time rooms with friends and play together.
                  </div>
                </div>
              </div>

              <div className="mpGrid">
                <div
                  className="mpGridBtn"
                  role="button"
                  tabIndex={0}
                  onClick={handleJoinRoom}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleJoinRoom(); } }}
                >
                  <div className="mpGridBtnTitle">Join Room</div>
                  <div className="mpGridBtnDesc">Browse open rooms or enter a room code.</div>
                </div>
                <div
                  className="mpGridBtn"
                  role="button"
                  tabIndex={0}
                  onClick={handleHostRoom}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHostRoom(); } }}
                >
                  <div className="mpGridBtnTitle">Host a Room</div>
                  <div className="mpGridBtnDesc">Create a new room and configure settings.</div>
                </div>
                <div
                  className="mpGridBtn"
                  role="button"
                  tabIndex={0}
                  onClick={handleChallengeFriend}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChallengeFriend(); } }}
                >
                  <div className="mpGridBtnTitle">Challenge a Friend</div>
                  <div className="mpGridBtnDesc">Pick a friend and start a battle.</div>
                </div>
                <div
                  className="mpGridBtn mpGridBtn--disabled"
                  role="button"
                  tabIndex={-1}
                  aria-disabled="true"
                >
                  <div className="mpGridBtnTitle">Ranked Mode</div>
                  <div className="mpGridBtnDesc">(Coming Soon)</div>
                </div>
              </div>
            </section>
          )}

          {/* INTRO (moved to bottom for less visual weight, still visible for SEO) */}
          <section className="homeIntro">
            <details className="homeIntroDetails">
              <summary className="homeIntroSummary">
                Click here to know more about Wuzzle Games.
              </summary>
              <h1 className="homeTitle">
                Wuzzle Games – Advanced Multi-Board &amp; Multiplayer Wordle-Style Game
              </h1>
              <p className="homeIntroParagraph">
                Wuzzle Games is a free, browser-based Wordle-style puzzle game that you
                can play on any device. No downloads or sign-in required to get started –
                just open the site and start solving.
              </p>
              <p className="homeIntroParagraph">
                Play up to 32 boards at once with daily multi-board puzzles, push
                yourself with marathon stages and speedrun timers, and challenge
                friends in real-time Multiplayer Mode battles. Your best speedrun
                times can appear on the global Wuzzle Games leaderboard.
              </p>
              <p className="homeIntroParagraph">
                New to Wuzzle Games? Read the{" "}
                <Link to="/faq" className="homeLink">
                  Wuzzle Games FAQ
                </Link>{" "}
                or jump straight to the{" "}
                <Link to="/leaderboard" className="homeLink">
                  global Wuzzle Games leaderboard
                </Link>{" "}
                to see top players.
                You can also explore specific modes: <Link to="/multiplayer-wuzzle" className="homeLink">multiplayer battles</Link>,{" "}
                <Link to="/multi-board-wuzzle" className="homeLink">multi-board Wordle</Link>,{" "}
                <Link to="/wuzzle-speedrun" className="homeLink">Wordle speedrun</Link>, and{" "}
                <Link to="/wuzzle-marathon" className="homeLink">Wordle marathon</Link>.
              </p>
            </details>
          </section>
        </main>
      </div>
    </div>
    </>
  );
}
