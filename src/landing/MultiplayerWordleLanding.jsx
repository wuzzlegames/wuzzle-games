import React from "react";
import { Helmet } from "react-helmet-async";
import SeoLandingLayout from "./SeoLandingLayout";

export default function MultiplayerWordleLanding() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do multiplayer rooms work in Wuzzle Games?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Open Multiplayer Mode, host a room, and share the room code. Friends join with the code and you all play the same multi-board puzzle.",
        },
      },
      {
        "@type": "Question",
        name: "Can I play with one friend?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Multiplayer supports two or more players. Host a room, invite one friend, and race to solve the puzzle faster.",
        },
      },
      {
        "@type": "Question",
        name: "Do we need to install an app?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "No. Wuzzle Games runs in your browser on desktop and mobile.",
        },
      },
      {
        "@type": "Question",
        name: "Can we choose more than one board in multiplayer?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Yes. Multiplayer supports multi-board puzzles so you can make battles easier (1 board) or chaotic (multiple boards).",
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Multiplayer Wordle | Wuzzle Games</title>
        <meta
          name="description"
          content="Play multiplayer Wordle-style battles in Wuzzle Games. Host or join a room, share a code with friends, and race through multi-board puzzles."
        />
        <link
          rel="canonical"
          href="https://wuzzlegames.com/multiplayer-wuzzle/"
        />
        <script type="application/ld+json">
          {JSON.stringify(faqJsonLd)}
        </script>
      </Helmet>

      <SeoLandingLayout
        title="Multiplayer Wordle"
        subtitle="Wuzzle Games lets you host a room, share a code, and play the same puzzle with friends—whether it’s a full group or a head-to-head match."
        primaryCta={{
          label: "Open Multiplayer Mode",
          to: "/game?mode=multiplayer",
        }}
      >
        <p>
          Searching for a <strong>multiplayer Wordle</strong> that actually works in a browser? Wuzzle Games' Multiplayer Mode is built for quick “join by code” games and friendly trash talk. It also works for a head-to-head match—just host a room and invite one person.
        </p>

        <h2>How to play</h2>
        <ul>
          <li><strong>Open Multiplayer Mode</strong> (button above).</li>
          <li><strong>Host</strong> a room to generate a code.</li>
          <li><strong>Share the code</strong> with friends.</li>
          <li>Friends <strong>join the lobby</strong> using the code.</li>
          <li>Start the match and race to solve—faster + fewer mistakes wins.</li>
        </ul>

        <h2>Why it’s better for group play</h2>
        <ul>
          <li><strong>Room codes</strong> keep joining simple—no accounts required to play.</li>
          <li><strong>Multi-board battles</strong> (1 board to many) for whatever chaos level you want.</li>
          <li><strong>Speedrun option</strong> for “who’s fastest” bragging rights.</li>
          <li><strong>Works on mobile</strong> so your group chat can immediately become your group battleground.</li>
          <li><strong>Leaderboard support</strong> so wins feel like they count.</li>
        </ul>

        <h2>Tips for winning</h2>
        <ul>
          <li>Start with a strong opener (good vowel coverage), then switch to information-gathering guesses.</li>
          <li>In multi-board games, prioritize letters that can eliminate options across all boards.</li>
          <li>If you’re down, don’t panic—play for certainty and avoid “hope guesses.”</li>
        </ul>
      </SeoLandingLayout>
    </>
  );
}
