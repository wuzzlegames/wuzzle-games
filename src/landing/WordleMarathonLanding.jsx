import React from "react";
import { Helmet } from "react-helmet-async";
import SeoLandingLayout from "./SeoLandingLayout";
import { Link } from "react-router-dom";

export default function WordleMarathonLanding() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Wordle marathon mode?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Marathon mode is an extended Wordle-style session with multiple stages. It’s built for people who want more than one puzzle without waiting for tomorrow.",
        },
      },
      {
        "@type": "Question",
        name: "Does marathon get harder?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Marathon progresses through stages and can increase the number of boards, so difficulty rises as you go.",
        },
      },
      {
        "@type": "Question",
        name: "Is there a marathon speedrun?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Enable speedrun to track time across the whole marathon and race your best runs.",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Wordle Marathon | Wuzzle Games</title>
        <meta
          name="description"
          content="Play Wordle marathon mode in Wuzzle Games. Go beyond one daily puzzle with multi-stage, multi-board runs—plus optional speedrun timing."
        />
        <link
          rel="canonical"
          href="https://wuzzlegames.com/wuzzle-marathon/"
        />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <SeoLandingLayout
        title="Wordle Marathon"
        subtitle="For when one puzzle is a warm‑up. Marathon mode stacks stages so you can keep playing and keep improving."
        primaryCta={{ label: "Start Marathon", to: "/game/marathon" }}
      >
        <p>
          A <strong>Wordle marathon</strong> is the antidote to “one puzzle per day.” Wuzzle Games' marathon mode is designed for longer sessions: you play through stages, build momentum, and earn that satisfying feeling of solving under pressure without needing a new browser tab every five minutes.
        </p>

        <h2>What you’ll do in marathon mode</h2>
        <ul>
          <li>Play through multiple stages in one run.</li>
          <li>Handle increasing challenge—often by increasing board count as stages advance.</li>
          <li>Track your progress and return later if you want to continue.</li>
        </ul>

        <h2>Marathon speedrun (timed)</h2>
        <p>
          Want a clean metric to chase? Marathon speedrun tracks time across stages so you can compare runs and improve.
          Jump in here: <Link to="/game?mode=marathon&speedrun=true">Marathon Speedrun</Link>.
        </p>

        <h2>How to get better fast</h2>
        <ul>
          <li><strong>Use repeatable openers</strong> so you don’t waste brain cycles deciding your first guess.</li>
          <li><strong>Play for information early</strong>, then switch to “solve mode” once you have constraints.</li>
          <li><strong>Keep notes mentally</strong> across boards—marathon punishes forgetfulness more than luck.</li>
        </ul>
      </SeoLandingLayout>
    </>
  );
}
