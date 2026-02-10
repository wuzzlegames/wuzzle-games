import { useEffect, useState } from "react";
import { loadWordListsOnce, getCachedWordLists } from "../lib/wordLists";

export function useWordLists() {
  const initialCache = getCachedWordLists();
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState(null);
  const [answerWords, setAnswerWords] = useState(initialCache?.answerWords || []);
  const [allowedSet, setAllowedSet] = useState(initialCache?.allowedSet || new Set());

  const reload = async () => {
    // optional: allow manual retry
    setLoading(true);
    setError(null);
    try {
      const data = await loadWordListsOnce();
      setAnswerWords(data.answerWords);
      setAllowedSet(data.allowedSet);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load word lists");
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    if (getCachedWordLists()) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadWordListsOnce();
        if (!alive) return;
        setAnswerWords(data.answerWords);
        setAllowedSet(data.allowedSet);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load word lists");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { loading, error, answerWords, allowedSet, reload };
}
