import React from "react";
import SeoLanding from "../SeoLanding";

export default function MultiBoardWordleLanding() {
  return (
    <SeoLanding
      path="/multi-board-wuzzle/"
      title="Multi‑Board Wordle – Solve 2–32 Boards | Wuzzle Games"
      description="Play Multi‑Board Wordle on Wuzzle Games. Choose 2–32 boards for daily puzzles, marathon stages, or competitive multiplayer — free in your browser."
      h1="Multi‑Board Wordle – Solve More Than One Puzzle"
      intro={
        "Multi‑Board Wordle is Wordle turned into a strategy game. Instead of solving one puzzle at a time, Wuzzle Games lets you play multiple boards in parallel — from a modest 2-board challenge to the full ‘how is this even legal’ 32-board mode. It’s harder, but it’s also more satisfying: each guess can teach you something on multiple boards at once."
      }
      primaryCta={{ label: "Play Multi‑Board", to: "/game/daily/4" }}
      howToSteps={[
        "Pick how many boards you want (2–32) from the home screen or a game mode.",
        "Start a Daily multi-board game (or jump into Marathon for staged difficulty).",
        "Each guess applies across all boards — you’ll see feedback for each board simultaneously.",
        "Use shared information: letters discovered on one board can unlock another.",
        "Solve all boards to finish. Try again with more boards when you’re feeling brave."
      ]}
      features={[
        "Daily multi-board puzzles so you can increase difficulty without changing the core rules.",
        "Board counts up to 32 for players who want maximum challenge.",
        "Marathon mode for progressive multi-board stages (great for skill-building).",
        "Speedrun variants when you want time pressure on top of complexity.",
        "Multiplayer supports multi-board matches, so you can race friends on the same set of boards."
      ]}
      tips={[
        "Use a high-coverage opener (or two) to reveal letters across all boards quickly.",
        "After the first guess, switch to targeted guesses that resolve your most constrained boards.",
        "Treat each guess as an investment: a ‘meh’ guess on one board can be a jackpot on another."
      ]}
      faqs={[
        {
          q: "What’s a good number of boards to start with?",
          a: "Start with 2–4 boards. It’s enough to feel different from normal Wordle without becoming overwhelming. Once you’re comfortable, jump to 8 or 16."
        },
        {
          q: "Do guesses apply to all boards?",
          a: "Yes — the same guess is checked on each board. That’s what makes multi-board play strategic: one guess can generate information in multiple puzzles."
        },
        {
          q: "Can I do multi-board in multiplayer?",
          a: "Yep. Multiplayer rooms can be configured for multiple boards, which is an excellent way to turn Wordle into a competitive team sport."
        }
      ]}
    />
  );
}
