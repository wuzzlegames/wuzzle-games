import React, { Suspense, lazy } from "react";
import { useInRouterContext } from "react-router-dom";
import GameHeader from "./GameHeader";
import GameStatusBar from "./GameStatusBar";
import GameToast from "./GameToast";
import GameBoard from "./GameBoard";
import NextStageBar from "./NextStageBar";
import BoardSelector from "./BoardSelector";
import OutOfGuessesPopup from "./OutOfGuessesPopup";
import GamePopup from "./GamePopup";
import Keyboard from "../Keyboard";
import SiteHeader from "../SiteHeader";
import CommentsSection from "./CommentsSection";
import { KEYBOARD_HEIGHT } from "../../lib/wordle";

const FeedbackModal = lazy(() => import("../FeedbackModal"));

export default function SinglePlayerGameView({
  mode,
  numBoards,
  speedrunEnabled,
  archiveDate = null,
  allSolved,
  finished,
  solutionsText,
  message,
  boards,
  maxTurns,
  turnsUsed,
  isUnlimited,
  currentGuess,
  invalidCurrentGuess,
  revealId,
  selectedBoardIndex,
  setSelectedBoardIndex,
  boardRefs,
  gridCols,
  gridRows,
  perBoardLetterMaps,
  focusedLetterMap,
  showNextStageBar,
  marathonNextBoards,
  goNextStage,
  showBoardSelector,
  setShowBoardSelector,
  statusText,
  showOutOfGuesses,
  exitFromOutOfGuesses,
  continueAfterOutOfGuesses,
  showPopup,
  stageElapsedMs,
  popupTotalMs,
  formatElapsed,
  solvedCount,
  marathonHasNext,
  handleShare,
  freezeStageTimer,
  isMarathonSpeedrun,
  commitStageIfNeeded,
  handleVirtualKey,
  allowNextStageAfterPopup,
  showFeedbackModal,
  setShowFeedbackModal,
  setShowPopup,
  setShowOutOfGuesses,
  showComments,
  commentThreadId,
  canShare,
  streakLabel,
  wordListError,
  onRetryWordLists,
  countdownRemaining,
}) {
  const inRouter = useInRouterContext();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#121213",
        color: "#ffffff",
      }}
    >
      {inRouter && (
        <SiteHeader onOpenFeedback={() => setShowFeedbackModal(true)} />
      )}

      {speedrunEnabled && countdownRemaining != null && countdownRemaining > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(18, 18, 19, 0.95)",
            zIndex: 9999,
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              letterSpacing: 4,
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            Timer starts in {countdownRemaining}
          </div>
        </div>
      )}

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom:
            (finished ? 16 : KEYBOARD_HEIGHT) + (showNextStageBar ? 62 : 16),
        }}
      >
        <GameHeader
          mode={mode}
          numBoards={numBoards}
          speedrunEnabled={speedrunEnabled}
          archiveDate={archiveDate}
        />

        {solutionsText && solutionsText.length > 0 && (
          <div
            style={{
              padding: "0 16px 8px",
              fontSize: 12,
              color: "#d7dadc",
              textTransform: "uppercase",
              fontWeight: "normal",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {solutionsText}
          </div>
        )}

        <div style={{ padding: "16px" }}>
          {/* Status bar: boards, guesses, timer */}
          <GameStatusBar
            numBoards={numBoards}
            speedrunEnabled={speedrunEnabled}
            isMarathonSpeedrun={isMarathonSpeedrun}
            formatElapsed={formatElapsed}
            stageElapsedMs={stageElapsedMs}
            displayTotalMs={popupTotalMs || stageElapsedMs}
            turnsUsed={turnsUsed}
            maxTurns={maxTurns}
          />

          {wordListError && (
            <div
              style={{
                marginTop: 12,
                marginBottom: 12,
                padding: "12px 16px",
                borderRadius: 8,
                backgroundColor: "#3a3a3c",
                color: "#ffffff",
                fontSize: 14,
              }}
            >
              <div style={{ marginBottom: onRetryWordLists ? 8 : 0 }}>
                {wordListError}
              </div>
              {onRetryWordLists && (
                <button
                  type="button"
                  className="homeBtn homeBtnGreen"
                  onClick={onRetryWordLists}
                  style={{ marginTop: 4 }}
                >
                  Retry loading word lists
                </button>
              )}
            </div>
          )}

          {streakLabel && (
            <div
              style={{
                marginTop: 8,
                marginBottom: 8,
                fontSize: 13,
                color: "#d7dadc",
              }}
            >
              {streakLabel}
            </div>
          )}

          <GameToast message={message} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(${numBoards >= 16 ? 160 : 180}px, 1fr))`,
              gap: 16,
            }}
          >
            {boards.map((board, index) => (
              <GameBoard
                key={index}
                board={board}
                index={index}
                numBoards={numBoards}
                maxTurns={maxTurns}
                isUnlimited={isUnlimited}
                currentGuess={currentGuess}
                invalidCurrentGuess={invalidCurrentGuess}
                revealId={revealId}
                isSelected={selectedBoardIndex === index}
                onToggleSelect={() =>
                  setSelectedBoardIndex((prev) => (prev === index ? null : index))
                }
                boardRef={(el) => {
                  boardRefs.current[index] = el;
                }}
                speedrunEnabled={speedrunEnabled}
              />
            ))}
          </div>

          {showComments && commentThreadId && (
            <CommentsSection threadId={commentThreadId} />
          )}
        </div>
      </main>

      {showNextStageBar && (
        <NextStageBar
          marathonNextBoards={marathonNextBoards}
          onNextStage={goNextStage}
        />
      )}

      {/* Fixed keyboard footer - hide once the stage is finished (either all boards are
          solved or the player is out of guesses), so the keyboard disappears instead of
          just blocking input. */}
      {!finished && (
        <footer className="keyboardFooter">
          <Keyboard
            numBoards={numBoards}
            selectedBoardIndex={selectedBoardIndex}
            perBoardLetterMaps={perBoardLetterMaps}
            focusedLetterMap={focusedLetterMap}
            gridCols={gridCols}
            gridRows={gridRows}
            onVirtualKey={handleVirtualKey}
          />
        </footer>
      )}

      {!finished && (
        <BoardSelector
          numBoards={numBoards}
          showBoardSelector={showBoardSelector}
          setShowBoardSelector={setShowBoardSelector}
          boards={boards}
          selectedBoardIndex={selectedBoardIndex}
          setSelectedBoardIndex={setSelectedBoardIndex}
          boardRefs={boardRefs}
          isUnlimited={isUnlimited}
          speedrunEnabled={speedrunEnabled}
          statusText={statusText}
        />
      )}

      {showOutOfGuesses && (
        <OutOfGuessesPopup
          maxTurns={maxTurns}
          mode={mode}
          marathonHasNext={marathonHasNext}
          onExit={exitFromOutOfGuesses}
          onContinue={continueAfterOutOfGuesses}
          onNextStage={goNextStage}
          freezeStageTimer={freezeStageTimer}
          setShowOutOfGuesses={setShowOutOfGuesses}
          setShowPopup={setShowPopup}
        />
      )}

      {showPopup && (
        <GamePopup
          allSolved={allSolved}
          boards={boards}
          speedrunEnabled={speedrunEnabled}
          stageElapsedMs={stageElapsedMs}
          popupTotalMs={popupTotalMs}
          formatElapsed={formatElapsed}
          solvedCount={solvedCount}
          mode={mode}
          marathonHasNext={marathonHasNext}
          turnsUsed={turnsUsed}
          maxTurns={maxTurns}
          onShare={handleShare}
          onClose={() => setShowPopup(false)}
          onNextStage={goNextStage}
          freezeStageTimer={freezeStageTimer}
          isMarathonSpeedrun={isMarathonSpeedrun}
          commitStageIfNeeded={commitStageIfNeeded}
          canShare={canShare}
          allowNextStageAfterPopup={allowNextStageAfterPopup}
          hasCommentsSection={showComments}
          streakLabel={streakLabel}
        />
      )}

      <Suspense fallback={null}>
        <FeedbackModal
          isOpen={showFeedbackModal}
          onRequestClose={() => setShowFeedbackModal(false)}
        />
      </Suspense>
    </div>
  );
}
