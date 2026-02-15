# Bugs, Optimizations, and Refactoring Notes

Codebase review findings. See also `optimization.md` and `BUG_REPORT.md` for prior work.

**Note:** Bugs #1–4, Optimizations #1–5, and Refactoring #1–4 have been addressed in prior work. The section **Remaining / additional findings** below lists issues found in a second pass.

---

## Bugs

### 1. **`marathonMetaKey` used but not imported (GameSinglePlayer)**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Lines 342, 683
- **Issue:** `marathonMetaKey` is called in `commitStageIfNeeded` and `goNextStage` but is **not imported**. It is exported from `src/lib/persist.js`. The component imports other persist helpers (`loadJSON`, `saveJSON`, `makeSolvedKey`, etc.) but not `marathonMetaKey`.
- **Impact:** `ReferenceError` at runtime when:
  - Completing a marathon speedrun stage (commitStageIfNeeded), or
  - Clicking "Next Stage" in the marathon completion popup (goNextStage).
- **Fix:** Add `marathonMetaKey` to the persist import:
  ```js
  import { loadJSON, saveJSON, makeSolvedKey, makeDailyKey, makeMarathonKey,
    makeStreakKey, loadStreak, updateStreakOnWin, marathonMetaKey } from "../../lib/persist";
  ```

### 2. **Marathon "Next Stage" ignores base URL**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Line 688, `goNextStage`
- **Issue:** `window.location.href = \`/game?mode=marathon&speedrun=${speedrunEnabled}\`` uses an absolute path from origin. The app is served under a base path (e.g. `/wuzzle-games/` per `vite.config.js` and `main.jsx`). This navigation goes to `origin/game?...` instead of `origin/wuzzle-games/game?...`.
- **Impact:** When deployed (e.g. GitHub Pages at `/wuzzle-games/`), "Next Stage" can 404 or load the wrong route.
- **Fix:** Use the app base URL when building the href, e.g.:
  ```js
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
  window.location.href = `${base}/game?mode=marathon&speedrun=${speedrunEnabled}`;
  ```
  or use `navigate()` from React Router and avoid full-page reload if the rest of the flow allows it.

### 3. **ErrorBoundary "Go to home" ignores base URL**

- **File:** `src/components/ErrorBoundary.jsx`
- **Location:** Line 72
- **Issue:** `window.location.href = '/'` navigates to origin root. With a base path like `/wuzzle-games/`, users should go to `/wuzzle-games/` (or `/wuzzle-games`), not `/`.
- **Impact:** Same as above when deployed with a base path.
- **Fix:** Use base-aware URL, e.g.:
  ```js
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
  window.location.href = base ? `${base}/` : '/';
  ```

### 4. **OpenRoomsModal Firebase `onValue` error callback**

- **File:** `src/components/OpenRoomsModal.jsx`
- **Location:** Lines 75–77 (error callback)
- **Issue:** On Firebase `onValue` error, only `setLoading(false)` is called. `rooms` state is left as-is. If the listener errors after a prior successful fetch, the UI can show stale rooms.
- **Impact:** Minor; edge case when permissions or network cause the listener to error after data was loaded.
- **Fix:** In the error callback, also `setRooms([])` (and optionally set an error state) so the UI reflects "no rooms" or an error instead of stale data.

---

## Optimizations

### 1. **`useGameMode`: unstable `searchParams` in `useMemo` deps**

- **File:** `src/hooks/useGameMode.js`
- **Location:** Lines 17–19
- **Issue:** `gameConfig` depends on `[params, searchParams]`. `searchParams` from `useSearchParams()` can get a new reference when the URL is unchanged, causing unnecessary recomputation.
- **Fix:** Use a stable representation in deps, e.g. `searchParams.toString()`, or `useMemo` only on the values you actually use from `searchParams`.

### 2. **`useGameMode`: `buildUrl` recreated every render**

- **File:** `src/hooks/useGameMode.js`
- **Location:** Line 51
- **Issue:** `buildUrl: (overrides = {}) => buildGameUrl({ ...gameConfig, ...overrides })` is a new function each render. Consumers that pass it as a prop or use it in effect deps may re-render or re-run effects unnecessarily.
- **Fix:** Wrap in `useCallback` with `[gameConfig]` (or the minimal gameConfig fields used).

### 3. **`persistForUser` recreated every render (GameSinglePlayer)**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Lines 61–72
- **Issue:** `persistForUser` is a plain function. It is in the dependency arrays of `saveGameState` and `clearGameState`, so those callbacks change every render, which can trigger extra work wherever they are used as deps.
- **Fix:** Wrap `persistForUser` in `useCallback` with `[authUser]` (and any other captured deps).

### 4. **`formatDuration` defined inside `.map` (OpenRoomsModal)**

- **File:** `src/components/OpenRoomsModal.jsx`
- **Location:** Lines 189–197 (inside `rooms.map`)
- **Issue:** `formatDuration` is defined inside the map callback, so it is recreated for every room on every render.
- **Fix:** Hoist `formatDuration` outside the map (e.g. at module level or inside the component but outside the map) and reuse it.

### 5. **`useConnectionStatus` interval when online**

- **File:** `src/hooks/useConnectionStatus.js`
- **Location:** Lines 29–32
- **Issue:** A 1s interval updates `queueSize` even when `!hasQueuedUpdates`. When online with no queued updates, this is redundant.
- **Fix:** Only run the interval (or skip updates) when `hasQueuedUpdates` is true, or use a different strategy to avoid unnecessary ticks.

---

## Refactoring / code quality

### 1. **Inconsistent prop indentation (GameSinglePlayer → SinglePlayerGameView)**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Around lines 762–764
- **Issue:** Some props passed to `SinglePlayerGameView` use different indentation (e.g. `isMarathonSpeedrun`, `commitStageIfNeeded` vs. `freezeStageTimer`). Inconsistent style.
- **Fix:** Use a single indentation level for all props and run the project formatter/linter.

### 2. **Hardcoded `true` in `commitStageIfNeeded`**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Lines 341–342 (`saveMarathonMeta(true, ...)`, `marathonMetaKey(true)`)
- **Issue:** The block is already under `if (speedrunEnabled && mode === "marathon")`, so `true` is correct but redundant. Using `speedrunEnabled` would make the code clearer and consistent with `goNextStage` (line 683).
- **Fix:** Use `speedrunEnabled` instead of `true` for both calls.

### 3. **`useKeyboard` `disabled` vs. `isInputBlocked()`**

- **File:** `src/components/game/GameSinglePlayer.jsx`  
  **Hook:** `src/hooks/useKeyboard.js`
- **Issue:** `useKeyboard({ disabled: isInputBlocked(), ... })` passes the result of `isInputBlocked()`. The hook stores it in a ref and updates via `useEffect`. This is fine, but `isInputBlocked` is a `useCallback` that depends on `allSolved`, `showPopup`, `showOutOfGuesses`. Ensure those values are updated before keyboard handlers run so there is no stale "disabled" state. No bug found, but worth keeping in mind when changing input-blocking logic.

### 4. **Save-game `useEffect` deps (GameSinglePlayer)**

- **File:** `src/components/game/GameSinglePlayer.jsx`
- **Location:** Lines 537–546
- **Issue:** Effect deps are `[boards, currentGuess, isUnlimited]`; `saveGameState` is intentionally excluded (eslint-disable). The effect calls `saveGameState` inside. If `saveGameState` ever changes in a way that affects what gets persisted (e.g. new deps), the effect could use a stale closure. Currently this is documented and accepted.
- **Recommendation:** Re-evaluate if `saveGameState`’s implementation or deps change; consider explicitly depending on a stable "save version" or key if needed.

---

## Remaining / additional findings (second pass)

### Bugs

#### 5. **ErrorBoundary: unused `useNavigate` import**

- **File:** `src/components/ErrorBoundary.jsx`
- **Location:** Line 3
- **Issue:** `useNavigate` is imported from `react-router-dom` but never used. `ErrorBoundary` uses a **class** component (`ErrorBoundaryClass`), so hooks cannot be used. The "Go to home" button uses `window.location.href` instead.
- **Impact:** Dead code; minor bundle cost. No runtime bug.
- **Fix:** Remove the `useNavigate` import.

#### 6. **OpenRoomsModal: `adminMode` missing from Firebase effect deps**

- **File:** `src/components/OpenRoomsModal.jsx`
- **Location:** `useEffect` with `onValue` (lines 33–95); deps `[isOpen]`
- **Issue:** The `onValue` callback filters rooms using `adminMode` (admin vs. normal view). The effect depends only on `[isOpen]`. When `adminMode` changes while the modal is open, the listener keeps using the **previous** `adminMode` from closure until the modal is closed and reopened.
- **Impact:** Toggling admin mode (if that exists in the UI) while the modal is open does not update the room list until close/reopen.
- **Fix:** Add `adminMode` to the effect dependency array. Unsubscribe and resubscribe when `adminMode` changes so the filter uses the current value.

### Improvements / code quality

#### 7. **`wordLists.js`: `BASE_URL` has no fallback**

- **File:** `src/lib/wordLists.js`
- **Location:** Line 11, `const baseUrl = import.meta.env.BASE_URL;`
- **Issue:** If `import.meta.env.BASE_URL` is `undefined` (e.g. in some build or edge environment), fetch URLs become `"undefinedwordle-answers-alphabetical.txt"` and requests fail.
- **Fix:** Use a fallback, e.g. `const baseUrl = import.meta.env.BASE_URL || '/';`.

#### 8. **Leaderboard: duplicate `formatElapsed` and inconsistent format**

- **File:** `src/components/Leaderboard.jsx`
- **Location:** Lines 11–20 (local `formatElapsed`)
- **Issue:** Leaderboard defines its own `formatElapsed` (e.g. `m:ss.x` or `ss.x`) while `src/lib/wordle.js` exports `formatElapsed` (mm:ss.tenths). Two implementations with different formats; duplication and inconsistency.
- **Fix:** Use the shared `formatElapsed` from `wordle.js`, or extract a shared formatting helper and use it in both. Ensure Leaderboard's `formatElapsed` guards against non-finite `ms` (like `wordle`'s) if it stays.

#### 9. **Profile: streak load failure has no user-facing error**

- **File:** `src/Profile.jsx`
- **Location:** Lines 77–79 (`loadProfileStreaks` catch)
- **Issue:** On streak load failure, the code `console.error`s and `setStreaks(null)`. There is no user-visible error message, so users do not know that loading failed.
- **Fix:** Add an error state (e.g. `streakLoadError`) and show a short message or retry when load fails.

#### 10. **FeedbackModal: `setTimeout` not cleared on unmount**

- **File:** `src/components/FeedbackModal.jsx`
- **Location:** Lines 18–20 (clear status after 3s), 43–46 (close modal after 2s)
- **Issue:** `setTimeout` is used to clear `submitStatus` and to call `onRequestClose` after success. If the user navigates away or closes the modal before the timer fires, the timeouts still run and can call `setSubmitStatus` / `onRequestClose` after unmount.
- **Fix:** Store timeout IDs in a ref and clear them in a `useEffect` cleanup (or when the modal closes) to avoid updates after unmount.

#### 11. **GameSinglePlayer / useSinglePlayerGame: flip and popup `setTimeout`s not cleared**

- **File:** `src/components/game/GameSinglePlayer.jsx` (e.g. lines 486–487, 496–497, 601–602), `src/hooks/useSinglePlayerGame.js` (e.g. line 195)
- **Issue:** `setTimeout` is used for flip completion and showing the popup. If the user leaves the game (e.g. navigates away) before the timer fires, callbacks can run after unmount and trigger `setState` on an unmounted component.
- **Fix:** Keep timeout IDs (e.g. in a ref) and clear them in `useEffect` cleanup or when the component unmounts.

#### 12. **GamePopup: index used as `key` for solution boards**

- **File:** `src/components/game/GamePopup.jsx`
- **Location:** Lines 597 (`key={i}`), 635 (`key={idx}`)
- **Issue:** Boards/solutions are keyed by array index. For static lists this is usually fine, but it can cause unnecessary re-renders or odd behavior if the list is ever reordered or filtered. Prefer stable IDs when available.
- **Fix:** Use a stable id (e.g. `b.solution`, `word`, or a board id) as `key` when possible, instead of `i` / `idx`.

---

## Summary

| Type            | Count (original) | Remaining / additional |
|-----------------|------------------|-------------------------|
| Bugs            | 4 (fixed)        | 2 (##5–6)               |
| Optimizations   | 5 (fixed)        | —                       |
| Refactoring     | 4 (fixed)        | —                         |
| Improvements    | —                | 6 (##7–12)              |

**High priority (original):** Bugs #1–4 and related optimizations/refactors have been addressed.

**Remaining:** Fix unused `useNavigate` (##5), add `adminMode` to OpenRoomsModal effect deps (##6), and consider the improvements in ##7–12 (BASE_URL fallback, shared `formatElapsed`, Profile error UX, `setTimeout` cleanup, stable keys).
