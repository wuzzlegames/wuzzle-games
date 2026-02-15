import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import SiteHeader from "./components/SiteHeader";
import { Suspense, lazy } from "react";
import "./HowToPlay.css";
const FeedbackModal = lazy(() => import("./components/FeedbackModal"));

// Color constants matching the game
const GREEN = "#50a339";
const YELLOW = "#B1A04C";
const GRAY = "#3A3A3C";
const DARK_BG = "#372F41";
const BORDER = "#3A3A3C";

// Example: Solution is CLOUD, guess is DRONE
// O is in correct position (green), D is in word but wrong position (yellow), R/N/E are not in word (gray)
const EXAMPLE_SOLUTION = "CLOUD";
const EXAMPLE_GUESS = "DRONE";

function ExampleTile({ letter, color, size = 40 }) {
  return (
    <div
      className="exampleTile"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        border: `1px solid ${color === GRAY ? BORDER : color === GREEN ? "#538d4e" : "#b59f3b"}`,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        fontWeight: "bold",
        borderRadius: 4,
      }}
    >
      {letter}
    </div>
  );
}

function ExampleRow({ word, colors, size = 40 }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 4 }}>
      {word.split("").map((letter, idx) => (
        <ExampleTile key={idx} letter={letter} color={colors[idx]} size={size} />
      ))}
    </div>
  );
}

function ExampleBoard({ title, rows, size = 40, isSelected = false }) {
  return (
    <div
      className="exampleBoard"
      style={{
        border: isSelected ? "2px solid #facc15" : `1px solid ${BORDER}`,
        borderRadius: 8,
        padding: 12,
        background: DARK_BG,
        boxShadow: isSelected ? "0 0 0 1px rgba(250,204,21,0.53)" : "none",
        minWidth: 220,
      }}
    >
      {title && (
        <div style={{ fontSize: 12, color: "#d7dadc", marginBottom: 8, textAlign: "center" }}>
          {title}
        </div>
      )}
      {rows.map((row, idx) => (
        <ExampleRow key={idx} word={row.word} colors={row.colors} size={size} />
      ))}
    </div>
  );
}

function KeyboardKey({ letter, colors = [], showGrid = false, gridCols = 2, gridRows = 2 }) {
  const baseColor = colors.length > 0 && !showGrid ? colors[0] : "#818384";
  
  // Calculate square cell size: grid height is 22px, gap is 2px
  // For 2 columns: (22 - 2) / 2 = 10px per cell
  // For 3 columns: (22 - 4) / 3 ≈ 6px per cell
  const gridHeight = 22;
  const gridGap = 2;
  const cellSize = (gridHeight - (gridGap * (gridCols - 1))) / gridCols;
  
  return (
    <div
      style={{
        position: "relative",
        width: showGrid ? 50 : 40,
        height: showGrid ? 50 : 40,
        backgroundColor: baseColor,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: "bold",
        color: "#ffffff",
        border: "1px solid rgba(0,0,0,0.2)",
      }}
    >
      <span>{letter}</span>
      {showGrid && colors.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            bottom: 6,
            height: gridHeight,
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: gridGap,
            opacity: 0.95,
          }}
        >
          {colors.map((color, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: color,
                borderRadius: 2,
                border: "1px solid rgba(0, 0, 0, 0.25)",
                width: cellSize,
                height: cellSize,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HowToPlay() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedMultiBoard, setSelectedMultiBoard] = useState(0);

  // Single board example: CLOUD solution, DRONE guess
  // D is yellow (in word, wrong position), R is gray (not in word), O is green (correct), N is gray, E is gray
  const singleBoardRows = [
    {
      word: EXAMPLE_GUESS,
      colors: [YELLOW, GRAY, GREEN, GRAY, GRAY], // D=yellow, R=gray, O=green, N=gray, E=gray
    },
  ];

  // Multi-board example: 3 boards with different solutions
  const multiBoardExamples = [
    {
      title: "Board 1",
      rows: [
        { word: "DRONE", colors: [YELLOW, GRAY, GREEN, GRAY, GRAY] },
        { word: "CLOUD", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }, // Solved
      ],
    },
    {
      title: "Board 2",
      rows: [
        { word: "DRONE", colors: [GRAY, GRAY, YELLOW, GRAY, GRAY] },
        { word: "WORLD", colors: [GRAY, GREEN, GRAY, GRAY, GRAY] },
      ],
    },
    {
      title: "Board 3",
      rows: [
        { word: "DRONE", colors: [GRAY, GRAY, GRAY, YELLOW, GRAY] },
        { word: "SPACE", colors: [GRAY, GRAY, GRAY, GRAY, GRAY] },
      ],
    },
  ];

  // Keyboard example: D has different colors across boards
  const keyboardExample = {
    D: [YELLOW, GRAY, GRAY], // Yellow in board 1, gray in boards 2 and 3
    O: [GREEN, YELLOW, GRAY],
    R: [GRAY, GRAY, GRAY],
  };

  return (
    <div className="howToPlayRoot">
      <Helmet>
        <title>How to Play – Wuzzle Games Guide & Tutorial</title>
        <meta
          name="description"
          content="Learn how to play Wuzzle Games with examples of single board, multi-board, keyboard colors, and marathon mode progression."
        />
      </Helmet>

      <div className="howToPlayInner">
        <SiteHeader onOpenFeedback={() => setShowFeedbackModal(true)} />

        <main className="howToPlayMain">
          <header className="howToPlayHeader">
            <h1 className="howToPlayTitle">How to Play Wuzzle Games</h1>
            <p className="howToPlayIntro">
              Wuzzle Games is a Wordle-style puzzle game where you guess five-letter words.
              Each letter in your guess gets color-coded feedback to help you solve the puzzle.
            </p>
          </header>

          {/* Single Board Example */}
          <section className="howToPlaySection">
            <h2 className="howToPlaySectionTitle">Single Board Example</h2>
            <p className="howToPlayParagraph">
              Let's say the solution is <strong>CLOUD</strong> and you guess <strong>DRONE</strong>:
            </p>
            
            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              <ExampleBoard
                title="Solution: CLOUD"
                rows={singleBoardRows}
                size={50}
              />
            </div>

            <div className="colorExplanation">
              <div className="colorItem">
                <div className="colorBox" style={{ backgroundColor: GREEN }} />
                <div>
                  <strong>O</strong> is <span style={{ color: GREEN }}>green</span> – it's in the correct position.
                </div>
              </div>
              <div className="colorItem">
                <div className="colorBox" style={{ backgroundColor: YELLOW }} />
                <div>
                  <strong>D</strong> is <span style={{ color: YELLOW }}>yellow</span> – it's in the word but at a different position.
                </div>
              </div>
              <div className="colorItem">
                <div className="colorBox" style={{ backgroundColor: GRAY }} />
                <div>
                  <strong>R, N, E</strong> are <span style={{ color: "#818384" }}>gray</span> – they're not in the word.
                </div>
              </div>
            </div>
          </section>

          {/* Multi-Board Example */}
          <section className="howToPlaySection">
            <h2 className="howToPlaySectionTitle">Multi-Board Play</h2>
            <p className="howToPlayParagraph">
              In multi-board mode, you play multiple words simultaneously. Each guess applies to all boards,
              and each board shows its own color feedback. This lets you gather information across multiple words at once.
            </p>

            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", margin: "20px 0" }}>
              {multiBoardExamples.map((board, idx) => (
                <ExampleBoard
                  key={idx}
                  title={board.title}
                  rows={board.rows}
                  size={40}
                  isSelected={selectedMultiBoard === idx}
                />
              ))}
            </div>

            <p className="howToPlayParagraph" style={{ marginTop: 16 }}>
              <strong>Click a board to focus it.</strong> When a board is selected (highlighted with a yellow border),
              the keyboard will show colors only for that board. This helps you focus on solving one word at a time
              while still seeing all boards.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0" }}>
              {multiBoardExamples.map((_, idx) => (
                <button
                  key={idx}
                  className="homeBtn homeBtnOutline"
                  onClick={() => setSelectedMultiBoard(idx)}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    opacity: selectedMultiBoard === idx ? 1 : 0.6,
                  }}
                >
                  {idx === selectedMultiBoard ? "✓ Selected" : `Select Board ${idx + 1}`}
                </button>
              ))}
            </div>
          </section>

          {/* Keyboard Grid Explanation */}
          <section className="howToPlaySection">
            <h2 className="howToPlaySectionTitle">Keyboard Color Grid</h2>
            <p className="howToPlayParagraph">
              When playing multiple boards, the keyboard shows a small grid on each letter key.
              Each square in the grid represents one board, showing that letter's color status for that board.
            </p>

            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
              <div
                style={{
                  background: DARK_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  padding: 16,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {Object.entries(keyboardExample).map(([letter, colors]) => (
                  <div key={letter} style={{ textAlign: "center" }}>
                    <KeyboardKey letter={letter} colors={colors} showGrid={true} gridCols={2} gridRows={2} />
                    <div style={{ fontSize: 11, color: "#818384", marginTop: 4 }}>
                      {letter}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="howToPlayParagraph">
              In this example, <strong>D</strong> shows yellow in the first board (top-left square),
              gray in the second and third boards. This helps you see at a glance which letters
              are useful for which boards.
            </p>
          </section>

          {/* Marathon Mode */}
          <section className="howToPlaySection">
            <h2 className="howToPlaySectionTitle">Marathon Mode</h2>
            <p className="howToPlayParagraph">
              Marathon mode is a progressive challenge where you solve increasingly difficult puzzles:
            </p>

            <div className="marathonProgression">
              <div className="marathonStage">
                <div className="marathonStageNumber">1</div>
                <div className="marathonStageContent">
                  <h3 className="marathonStageTitle">Stage 1: 1 Word</h3>
                  <p className="marathonStageDesc">Start with a single word puzzle.</p>
                  <ExampleBoard
                    title="Stage 1"
                    rows={[{ word: "CLOUD", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                    size={35}
                  />
                </div>
              </div>

              <div className="marathonArrow">→</div>

              <div className="marathonStage">
                <div className="marathonStageNumber">2</div>
                <div className="marathonStageContent">
                  <h3 className="marathonStageTitle">Stage 2: 2 Words</h3>
                  <p className="marathonStageDesc">Solve two words simultaneously.</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <ExampleBoard
                      title="Word 1"
                      rows={[{ word: "EARTH", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={30}
                    />
                    <ExampleBoard
                      title="Word 2"
                      rows={[{ word: "WORLD", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={30}
                    />
                  </div>
                </div>
              </div>

              <div className="marathonArrow">→</div>

              <div className="marathonStage">
                <div className="marathonStageNumber">3</div>
                <div className="marathonStageContent">
                  <h3 className="marathonStageTitle">Stage 3: 3 Words</h3>
                  <p className="marathonStageDesc">Three words at once.</p>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                    <ExampleBoard
                      title="Word 1"
                      rows={[{ word: "NIGHT", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={28}
                    />
                    <ExampleBoard
                      title="Word 2"
                      rows={[{ word: "SPACE", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={28}
                    />
                    <ExampleBoard
                      title="Word 3"
                      rows={[{ word: "MUSIC", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={28}
                    />
                  </div>
                </div>
              </div>

              <div className="marathonArrow">→</div>

              <div className="marathonStage">
                <div className="marathonStageNumber">4</div>
                <div className="marathonStageContent">
                  <h3 className="marathonStageTitle">Stage 4: 4 Words</h3>
                  <p className="marathonStageDesc">Final stage – solve all four to complete the marathon!</p>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                    <ExampleBoard
                      title="Word 1"
                      rows={[{ word: "FINAL", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={26}
                    />
                    <ExampleBoard
                      title="Word 2"
                      rows={[{ word: "DREAM", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={26}
                    />
                    <ExampleBoard
                      title="Word 3"
                      rows={[{ word: "LIGHT", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={26}
                    />
                    <ExampleBoard
                      title="Word 4"
                      rows={[{ word: "SWEET", colors: [GREEN, GREEN, GREEN, GREEN, GREEN] }]}
                      size={26}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="howToPlayParagraph" style={{ marginTop: 20 }}>
              Complete all four stages to finish the marathon. In speedrun mode, your total time
              across all stages is tracked and can be submitted to the leaderboard!
            </p>
          </section>

          {/* Tips */}
          <section className="howToPlaySection">
            <h2 className="howToPlaySectionTitle">Tips for Success</h2>
            <ul className="howToPlayList">
              <li>Start with common vowels and consonants (A, E, I, O, U, R, S, T, L, N).</li>
              <li>In multi-board mode, use guesses that test letters across multiple boards.</li>
              <li>Click boards to focus them and see keyboard colors for that specific word.</li>
              <li>Pay attention to the keyboard grid to see which letters work for which boards.</li>
              <li>In marathon mode, plan your guesses carefully as you progress through stages.</li>
            </ul>
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
