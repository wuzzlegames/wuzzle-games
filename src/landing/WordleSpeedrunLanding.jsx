import React from "react";
import { Helmet } from "react-helmet-async";
import SeoLandingLayout from "./SeoLandingLayout";
import { Link } from "react-router-dom";

export default function WordleSpeedrunLanding() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Wordle speedrun mode?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Speedrun mode adds a timer so you can race your best times. It rewards fast pattern recognition and efficient guesses.",
        },
      },
      {
        "@type": "Question",
        name: "Does Wuzzle Games support speedrun with multiple boards?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. You can speedrun multi-board puzzles to increase difficulty and create a real skill test.",
        },
      },
      {
        "@type": "Question",
        name: "Can I speedrun marathon mode?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Wuzzle Games includes a marathon speedrun option that tracks time across stages.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Wordle Speedrun | Wuzzle Games</title>
        <meta
          name="description"
          content="Play Wordle speedrun mode in Wuzzle Games. Race the clock on daily and marathon puzzles—including multi-board speedruns—free in your browser."
        />
        <link
          rel="canonical"
          href="https://wisdom-githb.github.io/wuzzle-games/wuzzle-speedrun/"
        />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <SeoLandingLayout
        title="Wordle Speedrun"
        subtitle="Same Wordle-style logic, but timed. Speedrun mode turns casual solving into a clean skill test."
        primaryCta={{
          label: "Play Daily Speedrun (4 boards)",
          to: "/game/daily/4/speedrun",
        }}
      >
        <p>
          A <strong>Wordle speedrun</strong> is simple: solve faster, make fewer mistakes, repeat. Wuzzle Games adds a speedrun option so you can track time and treat Wordle as a training loop instead of a once-a-day snack. If you like improving measurable skills (and you do, because you’re reading this), speedrun mode is the most satisfying way to play.
        </p>

        <h2>What speedrun mode changes</h2>
        <ul>
          <li><strong>Time matters.</strong> Hesitation is a tax—your opener + follow-up guesses need to be purposeful.</li>
          <li><strong>Consistency wins.</strong> Good players don’t just get lucky once; they repeat strong patterns.</li>
          <li><strong>Multi-board is brutal (in a good way).</strong> Speedrunning 2–4 boards forces efficient information gathering.</li>
        </ul>

        <h2>Try these two starts</h2>
        <ul>
          <li><strong>Coverage start:</strong> reveal lots of common letters and vowels quickly.</li>
          <li><strong>Constraint start:</strong> lock in a few placements early, then solve decisively.</li>
        </ul>

        <h2>Marathon speedrun</h2>
        <p>
          Want something longer than a single puzzle? Marathon speedrun tracks your time across stages—great for “one more run” energy.
          Use the marathon speedrun entry here: <Link to="/game?mode=marathon&speedrun=true">Marathon Speedrun</Link>.
        </p>
      </SeoLandingLayout>
    </>
  );
}
