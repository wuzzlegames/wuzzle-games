import React from "react";
import SeoLanding from "../SeoLanding";

export default function WordleSpeedrunLanding() {
  return (
    <SeoLanding
      path="/wuzzle-speedrun/"
      title="Wordle Speedrun – Beat Your Time | Wuzzle Games"
      description="Play Wordle Speedrun on Wuzzle Games. Race the clock in daily and marathon speedrun modes, including multi-board speedruns — free in your browser."
      h1="Wordle Speedrun – Beat Your Best Time"
      intro={
        "Wordle Speedrun takes the same guessing rules and adds one ingredient: time pressure. Wuzzle Games includes speedrun variants for daily and marathon play, plus speedrun-friendly multiplayer matches. If you like optimizing, racing your own PB, or settling ties with a stopwatch, speedrun mode is where Wordle stops being chill and starts being a sport."
      }
      primaryCta={{ label: "Start Speedrun", to: "/game/daily/1/speedrun" }}
      howToSteps={[
        "Start a daily game in speedrun mode (or choose marathon speedrun for staged play).",
        "The clock starts immediately — every second counts.",
        "Make fast, information-rich guesses to narrow the answer quickly.",
        "Finish in fewer guesses and less time to set better personal records.",
        "Try multi-board speedruns to increase the challenge without changing the rules."
      ]}
      features={[
        "Speedrun variants for daily and marathon modes.",
        "Multi-board speedruns: race while juggling multiple puzzles at once.",
        "Clear win condition: solve correctly, but solve faster.",
        "Great for friendly competition — compare times with friends or run mini-tournaments.",
        "Works on desktop and mobile, so you can speedrun anywhere."
      ]}
      tips={[
        "Use a consistent opener so you don’t waste time thinking on move one.",
        "If you get strong information early, switch from exploration to exploitation — commit.",
        "In multi-board speedruns, don’t chase perfection on one board; keep progress moving across all boards."
      ]}
      faqs={[
        {
          q: "Is speedrun mode harder than normal Wordle?",
          a: "The word rules are the same, but the decision pressure is higher. You’ll trade careful thinking for tempo — which is exactly the point."
        },
        {
          q: "Can I speedrun multi-board puzzles?",
          a: "Yes. Multi-board speedruns are a great way to increase difficulty while keeping the game familiar."
        },
        {
          q: "How do I start marathon speedrun?",
          a: "Open the game and choose marathon with speedrun enabled. Marathon speedrun adds time-based challenge across progressive stages."
        }
      ]}
    />
  );
}
