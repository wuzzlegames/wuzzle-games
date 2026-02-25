import React from "react";
import { Helmet } from "react-helmet-async";
import SeoLandingLayout from "./SeoLandingLayout";

export default function MultiBoardWordleLanding() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is multi-board Wordle?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Multi-board Wordle means you solve multiple Wordle-style boards at the same time using the same guesses. It rewards strategy and careful information gathering.",
        },
      },
      {
        "@type": "Question",
        name: "How many boards can I play in Wuzzle Games?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "You can choose from 1 up to many boards (depending on mode). Start small, then increase the board count when you want a harder challenge.",
        },
      },
      {
        "@type": "Question",
        name: "Does multi-board work in daily puzzles too?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Wuzzle Games supports daily multi-board puzzles so you can play the daily challenge with more than one board.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Multi-Board Wordle | Wuzzle Games</title>
        <meta
          name="description"
          content="Play multi-board Wordle-style puzzles in Wuzzle Games. Solve multiple boards at once with shared guesses—daily puzzles, marathon, and speedrun options."
        />
        <link
          rel="canonical"
          href="https://wuzzlegames.com/multi-board-wuzzle"
        />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <SeoLandingLayout
        title="Multi-Board Wordle"
        subtitle="Solve multiple Wordle-style boards at once using the same guesses. It’s the fastest way to make Wordle harder without making it unfair."
        primaryCta={{
          label: "Play a 4‑Board Daily",
          to: "/game/daily/4",
        }}
      >
        <p>
          <strong>Multi-board Wordle</strong> is the “my brain enjoys pain” version of Wordle—in the best way. You don’t solve one hidden word at a time. You solve multiple boards simultaneously, and every guess applies to every board. That means every guess has to do double duty: it should either confirm a path forward or eliminate lots of possibilities across several boards.
        </p>

        <h2>How multi-board changes your strategy</h2>
        <ul>
          <li>
            <strong>Information wins early.</strong> Your first couple guesses should reveal letters and placements that help across all boards.
          </li>
          <li>
            <strong>Don’t tunnel.</strong> It’s easy to fixate on one board—multi-board rewards balancing progress.
          </li>
          <li>
            <strong>Shared constraints.</strong> A letter that’s wrong on one board can still be right on another, so you plan with uncertainty.
          </li>
        </ul>

        <h2>Where to start</h2>
        <p>
          Start with 2 boards if you’re new, then move to 4 when you can reliably manage the mental stack. Wuzzle Games supports multi-board play in daily puzzles and other modes, so you can ramp difficulty without waiting for “hard mode” handcuffs.
        </p>

        <h2>Quick tips</h2>
        <ul>
          <li>Pick openers that cover common letters and vowels.</li>
          <li>Use a second guess to confirm placements rather than chasing a single board’s solution.</li>
          <li>When one board is close, finish it—completed boards reduce noise for the rest.</li>
        </ul>
      </SeoLandingLayout>
    </>
  );
}
