import React, { useState, useMemo, useCallback } from "react";
import Modal from "../Modal";
import "./SolutionHuntModal.css";

/**
 * Modal showing filtered possible words for Solution Hunt mode.
 * Users can search and click words to type them into the guess input.
 */
export default function SolutionHuntModal({
  isOpen,
  onRequestClose,
  words = [],
  onSelectWord,
  totalWords = 0,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter words by search query
  const filteredWords = useMemo(() => {
    if (!searchQuery.trim()) return words;
    const query = searchQuery.toUpperCase().trim();
    return words.filter((word) => word.includes(query));
  }, [words, searchQuery]);

  const handleWordClick = useCallback(
    (word) => {
      if (onSelectWord) {
        onSelectWord(word);
      }
      onRequestClose();
    },
    [onSelectWord, onRequestClose]
  );

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  // Clear search when modal closes
  const handleClose = useCallback(() => {
    setSearchQuery("");
    onRequestClose();
  }, [onRequestClose]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      titleId="solution-hunt-modal-title"
      panelClassName="modalPanel--wide solutionHuntModal"
    >
      <div className="solutionHuntModalContent">
        <h2 id="solution-hunt-modal-title" className="solutionHuntTitle">
          Possible Words
        </h2>

        <div className="solutionHuntStats">
          <span className="solutionHuntCount">
            {words.length === totalWords
              ? `${words.length} words`
              : `${words.length} of ${totalWords} words remaining`}
          </span>
        </div>

        <div className="solutionHuntSearchContainer">
          <input
            type="text"
            className="solutionHuntSearch"
            placeholder="Filter words..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoComplete="off"
            autoCapitalize="characters"
          />
          {searchQuery && (
            <button
              type="button"
              className="solutionHuntSearchClear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {filteredWords.length > 0 ? (
          <div className="solutionHuntWordGrid">
            {filteredWords.map((word) => (
              <button
                key={word}
                type="button"
                className="solutionHuntWord"
                onClick={() => handleWordClick(word)}
                title={`Click to type "${word}"`}
              >
                {word}
              </button>
            ))}
          </div>
        ) : (
          <div className="solutionHuntEmpty">
            {searchQuery
              ? "No words match your filter"
              : "No possible words remaining"}
          </div>
        )}

        <div className="solutionHuntFooter">
          <p className="solutionHuntHint">
            Click a word to type it into your guess
          </p>
          <button
            type="button"
            className="solutionHuntCloseBtn"
            onClick={handleClose}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
