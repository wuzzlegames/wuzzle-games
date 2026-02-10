// Word list loading utilities with shared caching.

let cachedWordLists = null; // { answerWords, allowedGuesses, allowedSet }
let cachedPromise = null;

export async function loadWordListsOnce() {
  if (cachedWordLists) return cachedWordLists;
  if (cachedPromise) return cachedPromise;

  cachedPromise = (async () => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const [answersRes, guessesRes] = await Promise.all([
      fetch(`${baseUrl}wordle-answers-alphabetical.txt`),
      fetch(`${baseUrl}valid-wordle-words.txt`),
    ]);

    if (!answersRes.ok) {
      throw new Error(`Failed to load answers: ${answersRes.status} ${answersRes.statusText}`);
    }
    if (!guessesRes.ok) {
      throw new Error(`Failed to load guesses: ${guessesRes.status} ${guessesRes.statusText}`);
    }

    const answersText = await answersRes.text();
    const guessesText = await guessesRes.text();

    const answerWords = answersText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length === 5)
      .map((w) => w.toUpperCase());

    const allowedGuesses = guessesText
      .split("\n")
      .map((w) => w.trim())
      .filter((w) => w.length === 5)
      .map((w) => w.toUpperCase());

    cachedWordLists = {
      answerWords,
      allowedGuesses,
      allowedSet: new Set(allowedGuesses),
    };

    return cachedWordLists;
  })();

  return cachedPromise;
}

export async function loadWordLists() {
  const data = await loadWordListsOnce();
  return {
    ANSWER_WORDS: data.answerWords,
    ALLOWED_GUESSES: data.allowedGuesses,
  };
}

export function getCachedWordLists() {
  return cachedWordLists;
}
