import React from "react";
import SeoLanding from "../SeoLanding";

export default function MultiplayerWordleLanding() {
  return (
    <SeoLanding
      path="/multiplayer-wuzzle/"
      title="Multiplayer Wordle – Play With Friends | Wuzzle Games"
      description="Play Multiplayer Wordle on Wuzzle Games: host or join rooms, race on multi-board puzzles, and climb the global leaderboard — free in your browser."
      h1="Multiplayer Wordle – Play With Friends"
      intro={
        "Multiplayer Wordle is the fastest way to turn a daily word puzzle into a friendly competition. Wuzzle Games lets you host or join a room, pick how many boards you want, and race to solve Wordle-style puzzles faster than your friends. No app install, no paywall, and no waiting for ‘tomorrow’ — just share a code and play."
      }
      primaryCta={{ label: "Start Multiplayer", to: "/game?mode=multiplayer" }}
      howToSteps={[
        "Open Multiplayer Mode and choose how many boards you want (1 board for speed, multiple boards for chaos).",
        "Create a room to get a shareable code, or enter a friend’s code to join.",
        "Everyone plays the same puzzles in the same room — the clock starts when the match begins.",
        "Use the keyboard to submit guesses; color feedback works like Wordle (green/yellow/gray).",
        "Finish first (or finish with the best time in speedrun) to win the round and earn bragging rights.",
      ]}
      features={[
        "Host or join rooms using a simple code — perfect for quick games on Discord or in class.",
        "Multi-board matches: choose more than one puzzle at once for a harder, more strategic game.",
        "Speedrun option for time-based competition (solve cleanly, but also solve fast).",
        "Friends + challenges (when signed in) so you can send invites and track rivalries.",
        "Global leaderboard so wins and performance feel like they actually count.",
        "Works on desktop and mobile — play anywhere a browser exists.",
      ]}
      tips={[
        "In multi-board matches, start with a ‘high coverage’ opener to reveal letters across boards quickly.",
        "Don’t overfit to one board — a single stuck board can lose the match.",
        "If you’re racing, aim for ‘good enough’ guesses that keep information flowing.",
      ]}
      faqs={[
        {
          q: "Is Wuzzle Games Multiplayer free?",
          a: "Yes. Multiplayer mode is free to play in your browser. Some features (like friends and challenges) may require signing in so the app can associate games with your account.",
        },
        {
          q: "Do we all get the same words?",
          a: "In a multiplayer room, players compete on the same Wordle-style puzzles for that match, so it’s a fair race.",
        },
        {
          q: "Can we play with one friend?",
          a: "Yes. Multiplayer supports 2 or more players. Host a room and invite one friend for a head-to-head match.",
        },
        {
          q: "Does it work on mobile?",
          a: "Yes — the UI is built for desktop and mobile browsers. Multiplayer is great on phones when you’re playing on the go.",
        },
      ]}
    />
  );
}
