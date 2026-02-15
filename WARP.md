# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This is a Vite + React 18 single-page app that implements an enhanced multi-board Wordle clone ("Wuzzle Games") with:
- Daily mode with configurable number of simultaneous boards
- Marathon mode with staged difficulty and optional speedrun timing
- 1v1 head-to-head mode powered by Firebase Realtime Database
- Firebase Authentication (Google + email/password), friends list, and a speedrun leaderboard
- Feedback submission via EmailJS

## Key commands

All commands are run from the repository root.

- Install dependencies (first-time setup):
  - `npm install`

- Run local development server (Vite):
  - `npm run dev`
  - Uses the Vite dev server; React Router is configured with a `basename` derived from `import.meta.env.BASE_URL`.

- Build for production:
  - `npm run build`

- Preview the production build locally:
  - `npm run preview`

- Deploy to GitHub Pages (to the `gh-pages` branch):
  - `npm run deploy`
  - Assumes the repository is configured for GitHub Pages and uses the `gh-pages` package to publish `dist/`.

- Linting / tests:
  - There are currently **no lint or test scripts** defined in `package.json`; to add tests or linting, introduce the appropriate tooling and update `package.json` and this file accordingly.

## Environment & external services

### GitHub Pages / routing

- `vite.config.js` sets `base: '/wuzzle-games/'` so the app serves under `/wuzzle-games/` on GitHub Pages.
- `src/main.jsx` derives `baseUrl` from `import.meta.env.BASE_URL`, normalizes trailing slashes, and configures `BrowserRouter basename={baseUrl}`.
- There is custom logic in `src/main.jsx` to handle GitHub Pages 404 redirects via `sessionStorage._404_redirect` and to normalize the root URL; be careful when modifying routing or base paths.

### Word lists

- Word lists are served as static assets from `public/`:
  - `public/wordle-answers-alphabetical.txt`
  - `public/valid-wordle-words.txt`
- They are loaded in two places:
  - `src/lib/wordLists.js` (`loadWordLists`) for core game initialization.
  - `src/hooks/useWordLists.js` for a hook-based API that caches and exposes `answerWords` and `allowedSet`.
- Both use `import.meta.env.BASE_URL` to construct fetch URLs; if you change the deployment base, ensure these assets remain reachable under that base.

### Firebase

- Firebase configuration lives in `src/config/firebase.js` and is driven primarily by Vite env vars:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_DATABASE_URL` (used for Realtime Database)
- For local development, define these in a `.env` file at the repo root (see `README.md` for concrete examples). `firebaseConfig` falls back to placeholder strings if env vars are missing.
- The following features depend on a correctly configured Firebase project:
  - Authentication (`src/hooks/useAuth.js`) via Firebase Auth + Google provider.
  - Friends/friend-requests stored under `users/{uid}` paths in Realtime Database.
  - 1v1 game state (`src/hooks/useOneVOneGame.js`) under `onevone/{code}`.
  - Speedrun leaderboard (`src/hooks/useLeaderboard.js`) under `leaderboard/{mode}`.

### EmailJS

- Email-based feedback is configured in `src/config/emailjs.js`:
  - `EMAILJS_CONFIG` holds `SERVICE_ID`, `TEMPLATE_ID`, `PUBLIC_KEY`, `TO_EMAIL`, and `SUBJECT`.
  - `isEmailJSConfigured()` is used to gate feedback sending logic.
- To change where feedback is sent or which EmailJS app is used, update these constants and keep them in sync with the EmailJS dashboard.

## Architecture overview

### Tooling and entrypoints

- Tooling:
  - Vite (see `vite.config.js`) with `@vitejs/plugin-react`.
  - Pure JavaScript React (no TypeScript).
- Entrypoint:
  - `src/main.jsx` mounts the app, configures `BrowserRouter` with a computed `basename`, and performs GitHub Pages 404 & URL-normalization handling before React Router initializes.
- Top-level app shell:
  - `src/App.jsx` defines the main route structure using `react-router-dom`:
    - `/` → `Home`
    - `/game/*` → `Game`
    - `/profile` → `Profile`
    - `/leaderboard` → `components/Leaderboard`
  - `App` also:
    - Normalizes the root path to include the trailing slash expected by Vite.
    - Restores the current marathon stage index from localStorage (via `marathonMetaKey`).

### Pages / screens

- `src/Home.jsx` (landing screen):
  - Presents the three main modes: Daily, Marathon, and 1v1, plus access to the leaderboard and feedback.
  - Uses `useAuth` for sign-in/sign-out and displays the current user, if any.
  - Uses `useDailyResetTimer` to show a "Reset in" countdown to the next daily reset.
  - Navigates to `/game` with query params (`mode`, `boards`, `speedrun`) and persists some user choices using `saveJSON` / `loadJSON` from `lib/persist`.
  - Hosts modals for feedback (`components/FeedbackModal`), auth (`components/AuthModal`), and 1v1 setup (`components/OneVOneModal`).

- `src/Game.jsx` (core gameplay):
  - Central orchestrator for all game modes:
    - `mode="daily"` or `"marathon"` for solo play.
    - `mode="1v1"` for multiplayer games.
    - `speedrun` query parameter toggles speedrun scoring/timing.
  - Responsibilities span several concerns:
    - **Daily/marathon word selection** via `selectDailyWords` in `lib/dailyWords` using a seeded RNG tied to date, mode, and board count.
    - **Board creation and scoring** using `lib/wordle` (`createBoardState`, `scoreGuess`, `getMaxTurns`, `buildLetterMapFromGuesses`, `getTurnsUsed`).
    - **State persistence** in `localStorage` using `lib/persist` helpers:
      - `makeDailyKey`, `makeMarathonKey` for in-progress games.
      - `makeSolvedKey` for solved runs (per-date, per-mode, per-board-count, and per-marathon-stage).
      - `marathonMetaKey` for marathon meta (current stage, cumulative time, per-stage times).
    - **Speedrun timing** via refs and time deltas (and related helpers in `lib/wordle` / `lib/gameUtils`).
    - **1v1 integration** using `useOneVOneGame` and `useAuth`:
      - Host/guest roles, readiness, whose turn it is, and game lifecycle.
      - Realtime updates of guesses and per-guess color information shared with the opponent.
    - **Leaderboard submission** via `submitSpeedrunScore` from `hooks/useLeaderboard` once a speedrun completes.
    - **UI composition** of game-specific components under `components/game/` (board grid, headers, toasts, popups, board selector, 1v1 views) and keyboard input (`components/Keyboard`).
  - `Game` is the main place to look when changing game rules, persistence, or timing behavior.

- `src/Profile.jsx` (user profile):
  - Requires an authenticated user; otherwise navigates back to `/`.
  - Lets users view their email and update their Firebase Auth display name via `updateUsername` from `useAuth`.

- `src/components/Leaderboard.jsx` (speedrun leaderboard screen):
  - Uses `useLeaderboard` to read entries from `leaderboard/{mode}` in Realtime Database, sorting client-side by score and time.
  - Provides filters for mode (`daily` vs `marathon`) and number of boards.
  - Highlights the current signed-in user's entries using `useAuth`.

### Core game logic & utilities

- `src/lib/wordle.js`:
  - Encapsulates core Wordle mechanics:
    - `WORD_LENGTH`, keyboard layout (`KEYBOARD_ROWS`, `KEYBOARD_HEIGHT`).
    - Turn budgeting per number of boards (`getMaxTurns`).
    - Scoring logic for a guess vs solution (`scoreGuess`).
    - Board representation (`createBoardState`) and per-letter status aggregation (`buildLetterMapFromGuesses`, `mergeStatus`, `colorForStatus`, `colorForMiniCell`).
    - Tracking turns used (`getTurnsUsed`) and time formatting utilities (`formatElapsed`, `sumMs`).

- `src/lib/dailyWords.js`:
  - Implements deterministic daily word selection using a seeded RNG (`SeededRandom`) derived from:
    - Date (`getCurrentDateString`), board index, number of boards, mode, speedrun flag, and marathon stage index.
  - Ensures no duplicate words across boards for a given day (`selectDailyWords`).

- `src/lib/persist.js`:
  - Wraps `localStorage` access for this app:
    - Namespaced keys with the `mw:` prefix.
    - Helpers to load/save/remove keys and to clear all app-specific keys.
    - Key generators for daily, marathon, solved runs, and marathon meta.

- `src/lib/gameUtils.js`:
  - Higher-level scoring and sharing helpers:
    - `calculateNonSpeedrunScore` and `calculateSpeedrunScore` produce user-facing scores based on turn efficiency or elapsed time.
    - `generateShareText` builds shareable result text (including emoji grids) and embeds the public app URL.
    - Misc helpers for emoji conversion and color backgrounds.

### Hooks

- `src/hooks/useAuth.js`:
  - Centralizes Firebase Auth interactions and friend/friend-request state.
  - Exposes:
    - `user`, `loading`, `error` state.
    - Auth operations: `signInWithGoogle`, `signUpWithEmail`, `signInWithEmail`, `signOut`.
    - Profile operation: `updateUsername`.
    - Social operations: `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`.
  - Subscribes to `users/{uid}/friends` and `users/{uid}/friendRequests` in Realtime Database to keep in-memory state in sync.

- `src/hooks/useOneVOneGame.js`:
  - Encapsulates all 1v1 Realtime Database logic under `onevone/{code}`:
    - Game creation (`createGame`) by host with random 6-digit code.
    - Joining existing games (`joinGame`) with validation for existence, capacity, and status.
    - Readiness state updates (`setReady`).
    - Game start (`startGame`) with randomly chosen solution and initial turn.
    - Guess submission (`submitGuess`) with color arrays stored for opponent view.
    - Turn switching (`switchTurn`) and winner resolution (`setWinner`).
  - Exposes `gameState`, `loading`, `error` plus the methods above; `Game` uses these to drive the 1v1 UI and logic.

- `src/hooks/useLeaderboard.js`:
  - Exposes `submitSpeedrunScore` (write API) and `useLeaderboard` (read hook) backed by `leaderboard/{mode}` paths in Realtime Database.

- `src/hooks/useDailyResetTimer.js`:
  - Returns a formatted countdown string until local midnight; used on the home screen.

- `src/hooks/useKeyboard.js` and `src/hooks/useWordLists.js`:
  - `useKeyboard` attaches a global keydown listener and delegates to provided callbacks (`onEnter`, `onBackspace`, `onLetter`), with support for a `disabled` flag.
  - `useWordLists` lazily loads and caches the answer and guess lists and exposes `loading`, `error`, `answerWords`, and `allowedSet`.

- `src/hooks/useStageTimer.js` (not currently wired into `Game.jsx`):
  - Provides a reusable stage timer (`start`, `freeze`, `elapsedMs`) that ticks only when speedrun is enabled.

### UI components

- `src/components/` contains reusable UI pieces:
  - Generic modals (`Modal`, `FeedbackModal`, `AuthModal`, `OneVOneModal`, `FriendsModal`), header/menu (`HamburgerMenu`), and the on-screen keyboard (`Keyboard`).
- `src/components/game/` contains game-specific presentation components:
  - `GameHeader`, `GameToast`, `GameBoard`, `TileRow`, `BoardSelector`, `NextStageBar`, `GamePopup`, `OutOfGuessesPopup`, `OneVOneWaitingRoom`, `OpponentBoardView`.
  - These are mostly stateless or thin wrappers that receive all state and callbacks from `Game.jsx`.

## Notes for future changes

- When changing the deployment base path or GitHub Pages target repo name, update **both** `vite.config.js` (`base`) and any logic that depends on `import.meta.env.BASE_URL` (notably `src/main.jsx`, `useWordLists`, and `lib/wordLists.js`).
- When modifying game rules, persistence, or timing, expect to update code across `src/Game.jsx`, `src/lib/wordle.js`, `src/lib/dailyWords.js`, `src/lib/persist.js`, and `src/lib/gameUtils.js` together.
- Any changes to 1v1 behavior typically touch `src/Game.jsx`, `src/hooks/useOneVOneGame.js`, and the UI components under `src/components/game/` related to multiplayer (waiting room, opponent board, etc.).

## Test cases

- Always include/update unit test cases when writing code.