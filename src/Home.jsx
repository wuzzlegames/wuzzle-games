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

  const { user: authUser } = useAuth();

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

      setMarathonStandardIndexUI(standardIndex);
      setMarathonSpeedrunIndexUI(speedrunIndex);
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
  
  const handleMarathonStandard = useCallback(() => {
    navigate(`/game/marathon`);
  }, [navigate]);
  
  const handleMarathonSpeedrun = useCallback(() => {
    // Use query params so Game.jsx can read mode=marathon & speedrun=true
    navigate(`/game?mode=marathon&speedrun=true`);
  }, [navigate]);
  
  const dailyTitleRight = useMemo(() => `${dailyBoards} board${dailyBoards > 1 ? "s" : ""}`, [dailyBoards]);

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

        <Suspense fallback={null}>
          <MultiplayerModal
            isOpen={showMultiplayerModal}
            onRequestClose={() => setShowMultiplayerModal(false)}
            showConfigFirst={showMultiplayerConfig}
            onConfigClose={() => setShowMultiplayerConfig(false)}
            onConfigOpen={() => setShowMultiplayerConfig(true)}
          />
        </Suspense>

        <main>
          {/* DAILY */}
          <section className="panel">
            <div className="panelTop">
              <div>
                <h2 className="panelTitle">Daily Puzzles</h2>
                <div className="panelDesc">
                  Choose how many words you want to play simultaneously.
                </div>
              </div>

              <div className="selector">
                <label className="label" htmlFor="dailyBoards">
                  Simultaneous words
                </label>
                <select
                  id="dailyBoards"
                  value={dailyBoards}
                  onChange={(e) => setDailyBoards(parseInt(e.target.value, 10))}
                  className="select"
                >
                  {BOARD_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="panelBody">
              <ModeRow
                title="Daily (standard)"
                desc="Limited turns. No timer. Good for casual play."
                buttonText="Play Daily"
                onClick={handleDailyStandard}
                variant="green"
                modeVariant="daily"
                titleRight={dailyTitleRight}
              />

              <ModeRow
                title="Daily (speedrun)"
                desc="Unlimited guesses. Timer starts immediately."
                buttonText="Speedrun Daily"
                onClick={handleDailySpeedrun}
                variant="green"
                modeVariant="daily"
                titleRight={dailyTitleRight}
              />

              <ModeRow
                title="Solution Hunt"
                desc="See all possible remaining words as you guess. Great for learning."
                buttonText="Play Solution Hunt"
                onClick={handleSolutionHunt}
                variant="green"
                modeVariant="daily"
                titleRight="1 board"
              />
            </div>
          </section>

          {/* MARATHON */}
          <section className="panel">
            <div className="panelTop">
              <div>
                <h2 className="panelTitle">Marathon Puzzles</h2>
                <div className="panelDesc">
                  Solve 1 word, then 2, then 3, ending at 4. Complete all stages to
                  win.
                </div>
              </div>
            </div>

            <div className="panelBody">
              <ModeRow
                title="Marathon (standard)"
                desc="Play standard marathon. Limited turns. No timer."
                buttonText="Play Marathon"
                onClick={handleMarathonStandard}
                variant="gold"
                modeVariant="marathon"
                titleRight={`Stage ${marathonStandardIndexUI + 1}/${marathonLevels.length}`}
              />

              <ModeRow
                title="Marathon (speedrun)"
                desc="Play speedrun marathon. Unlimited guesses, timed cumulative."
                buttonText="Speedrun Marathon"
                onClick={handleMarathonSpeedrun}
                variant="gold"
                modeVariant="marathon"
                titleRight={`Stage ${marathonSpeedrunIndexUI + 1}/${marathonLevels.length}`}
              />
            </div>
          </section>

          {/* MULTIPLAYER MODE */}
          <section className="panel">
            <div className="panelTop">
              <div>
                <h2 className="panelTitle">Multiplayer Wordle Battles With Friends</h2>
                <div className="panelDesc">
                  Host or join real-time rooms with friends and play together.
                </div>
              </div>
            </div>

            <div className="panelBody">
              <ModeRow
                title="Multiplayer Mode"
                desc="Create a room, invite friends, or join by code."
                buttonText="Play Multiplayer"
                onClick={() => setShowMultiplayerModal(true)}
                variant="gold"
                modeVariant="pvp"
              />
            </div>
          </section>

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
