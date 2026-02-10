import React, { Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import SiteHeader from "./components/SiteHeader";
const FeedbackModal = lazy(() => import("./components/FeedbackModal"));
import "./Faq.css";

export default function Faq() {
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);

  return (
    <div className="faqRoot">
      <Helmet>
        <title>FAQ – Wuzzle Games Alternative & Multiplayer Wordle-Style Game</title>
        <meta
          name="description"
          content="Learn what Wuzzle Games is, how multi-board daily puzzles, marathon and speedrun modes, and Multiplayer Mode battles with friends work."
        />
      </Helmet>

      <div className="faqInner">
        <SiteHeader onOpenFeedback={() => setShowFeedbackModal(true)} />

        <main className="faqMain">
          <header className="faqHeader">
            <h1 className="faqTitle">Wuzzle Games FAQ</h1>
            <p className="faqIntro">
              Wuzzle Games is a browser-based Wordle alternative with advanced
              modes like multi-board daily puzzles, marathon and speedrun
              challenges, and real-time Multiplayer Mode battles with friends.
              This page answers common questions about how it works.
            </p>
          </header>

          <section className="faqSection" aria-labelledby="faq-what-is">
            <h2 id="faq-what-is" className="faqSectionTitle">
              What is Wuzzle Games?
            </h2>
            <p className="faqParagraph">
              Wuzzle Games is an advanced Wordle-style puzzle game that you play
              in your browser. It keeps the familiar letter-colour feedback you
              know from classic Wordle, but adds multi-board puzzles, marathon
              progressions, speedrun timers, a global leaderboard and
              multiplayer Wordle-style battles.
            </p>
          </section>

          <section className="faqSection" aria-labelledby="faq-multi-board">
            <h2 id="faq-multi-board" className="faqSectionTitle">
              How does multi-board play work?
            </h2>
            <p className="faqParagraph">
              In Wuzzle Games you can choose how many boards to play at once,
              from a single word up to 32 simultaneous Wordle-style boards.
              Every guess is applied to all active boards, and each board shows
              its own colour feedback. This turns Wordle into a denser strategic
              puzzle where a single guess gives you information across many
              words.
            </p>
            <p className="faqParagraph">
              Use the "Simultaneous words" selector on the Daily panel to pick
              your board count before starting a daily game.
            </p>
          </section>

          <section className="faqSection" aria-labelledby="faq-modes">
            <h2 id="faq-modes" className="faqSectionTitle">
              What are Daily, Marathon and Speedrun modes?
            </h2>
            <p className="faqParagraph">
              The Daily mode gives you a fresh set of multi-board puzzles each
              day. You choose how many boards to play at once and solve them
              with a limited number of guesses (standard) or unlimited guesses
              against a timer (speedrun).
            </p>
            <p className="faqParagraph">
              Marathon mode is a longer run: you start with 1 board, then move
              to 2, then 3, and finish at 4 boards. In standard marathon you
              still have limited guesses, while in speedrun marathon your total
              time across stages is tracked and can be submitted to the global
              leaderboard.
            </p>
          </section>

          <section className="faqSection" aria-labelledby="faq-multiplayer">
            <h2 id="faq-multiplayer" className="faqSectionTitle">
              How do I play Multiplayer Mode battles with friends?
            </h2>
            <p className="faqParagraph">
              Multiplayer Mode lets you challenge friends to solve the same
              Wordle-style puzzles at the same time. One player hosts a multiplayer
              room, shares the code, and everyone joins. You can choose the
              number of boards to play and whether to use standard or speedrun
              rules.
            </p>
            <p className="faqParagraph">
              To start Multiplayer Mode, open the home page and use the Multiplayer
              section. Once everyone is ready, Wuzzle Games tracks your guesses and
              times so you can see who solved the boards faster.
            </p>
          </section>

          <section className="faqSection" aria-labelledby="faq-different">
            <h2 id="faq-different" className="faqSectionTitle">
              How is Wuzzle Games different from the original Wordle?
            </h2>
            <p className="faqParagraph">
              Classic Wordle gives you one word per day with a fixed number of
              guesses. Wuzzle Games is designed as a Wordle alternative for
              players who want more challenge and variety: multi-board games,
              marathon progressions, speedrun timers, a competitive leaderboard
              and Multiplayer Mode friend battles.
            </p>
            <p className="faqParagraph">
              The letter feedback rules and five-letter word format will feel
              familiar, but the added modes make it easier to play more than one
              game per day and to compete with friends.
            </p>
          </section>

          <section className="faqSection" aria-labelledby="faq-leaderboard">
            <h2 id="faq-leaderboard" className="faqSectionTitle">
              How does the Wuzzle Games leaderboard work?
            </h2>
            <p className="faqParagraph">
              When you sign in and play speedrun modes, your best times and
              scores can be submitted to the global Wuzzle Games leaderboard.
              You can filter by daily or marathon and see how your multi-board
              runs compare to other players.
            </p>
            <p className="faqParagraph">
              You can access the leaderboard from the header or directly at the
              leaderboard page to see top performances across board counts and
              modes.
            </p>
          </section>
        </main>

        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={showFeedbackModal}
            onRequestClose={() => setShowFeedbackModal(false)}
          />
        </Suspense>
      </div>
    </div>
  );
}
