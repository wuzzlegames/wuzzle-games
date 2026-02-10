import React from "react";
import SeoLanding from "../SeoLanding";

export default function WordleMarathonLanding() {
  return (
    <SeoLanding
      path="/wuzzle-marathon/"
      title="Wordle Marathon – Unlimited Stages | Wuzzle Games"
      description="Play Wordle Marathon on Wuzzle Games. Progress through staged multi-board puzzles, optionally in speedrun style — free in your browser."
      h1="Wordle Marathon – Keep Solving, Keep Leveling"
      intro={
        "Daily Wordle is a single puzzle. Marathon Wordle is a whole session. Wuzzle Games' marathon mode is built for players who want more than one round: you progress through stages, board counts can increase, and you can track your run like a mini campaign. It’s the ‘one more game’ loop — but with five-letter words."
      }
      primaryCta={{ label: "Start Marathon", to: "/game/marathon" }}
      howToSteps={[
        "Start Marathon mode from the game.",
        "Solve the current stage (often with multiple boards).",
        "Advance to the next stage to increase difficulty and keep the run going.",
        "If you want the adrenaline version, enable speedrun to make time part of the score.",
        "Finish a full run, then come back later and try to beat your previous stage/time."
      ]}
      features={[
        "Progressive stages that keep the challenge rising instead of stopping after one puzzle.",
        "Multi-board marathon stages for strategy and information management.",
        "Optional marathon speedrun for time-based runs.",
        "Great practice for improving your Wordle instincts (letter frequency, constraint satisfaction, risk).",
        "Pairs well with leaderboard/competition — marathon is a skill signal, not just luck."
      ]}
      tips={[
        "Treat early stages as information warm-up: build momentum and confidence.",
        "As stages increase, prioritize guesses that split possibilities instead of chasing one narrow line.",
        "If you’re speedrunning, keep a consistent rhythm: guess → read feedback → decide → guess."
      ]}
      faqs={[
        {
          q: "Is marathon mode unlimited?",
          a: "Marathon is designed for longer sessions with multiple stages. Exact staging depends on the game configuration, but the goal is always ‘keep going’ rather than ‘done for the day.’"
        },
        {
          q: "Can I do marathon with multiple boards?",
          a: "Yes — marathon is one of the best places to use multi-board play because stages naturally scale difficulty over time."
        },
        {
          q: "What’s the best way to improve in marathon?",
          a: "Focus on information efficiency: guesses that reduce uncertainty across boards and stages. Over time you’ll build pattern recognition for common letter combinations and word structures."
        }
      ]}
    />
  );
}
