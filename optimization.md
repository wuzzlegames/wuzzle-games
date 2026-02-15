# Optimization, Refactoring, and Bug-Fix Plan
This document outlines concrete bugs, refactors, and optimizations across game modes, profile, friends, multiplayer, and shared infrastructure, with the goal of making the app more scalable and maintainable.

References use `path:line` (or approximate ranges).

## 1. Routing, App Shell, and URL Handling

### 1.1 `App.jsx` and URL normalization

**Files**
- `src/App.jsx`
- `src/main.jsx`

**Issues and fixes**

1. **Over-eager daily board reset**  
   - Code: `App.jsx:32–37` resets `dailyBoards` whenever `location.pathname === '/' || location.pathname.endsWith('/')`.  
   - Problem: Any future route that ends with `/` (e.g. `/profile/`) would also reset `dailyBoards`, which is surprising and tightly couples behavior to trailing slashes.  
   - Fix: Narrow the condition so only the actual home route resets `dailyBoards`, for example:
     - Use only `location.pathname === '/'`, or
     - Compare against the known basename-adjusted home path instead of using `.endsWith('/')`.

2. **Duplicated base-URL normalization logic**  
   - Code: `main.jsx:8–35` performs `BASE_URL` normalization and 404 redirect handling; `App.jsx:15–30` also manipulates `window.location` for trailing slashes.  
   - Problem: Two places own URL normalization, increasing risk of drift and hard-to-debug navigation edge cases.  
   - Fix:
     - Move all base-URL and trailing-slash normalization into `main.jsx` before `BrowserRouter` is mounted.  
     - Remove the direct `window.location` manipulation from `App.jsx` (or reduce it to a simple React Router navigation) so routing concerns live in one place.

---

## 2. Single-Player Game Modes (Daily / Marathon / Speedrun)

**Key files**
- `src/components/game/GameSinglePlayer.jsx`
- `src/hooks/useSinglePlayerGame.js`
- `src/lib/persist.js`
- `src/lib/dailyWords.js`
- `src/lib/wordle.js`
- `src/lib/gameUtils.js`

### 2.1 Persistence and configuration robustness

1. **Marathon meta key behavior is spread out**  
   - Code: `persist.marathonMetaKey:57–59`, plus multiple reads/writes in `GameSinglePlayer.jsx`.  
   - Problem: Marathon meta (index, cumulative times, stage times) is keyed per variant (`standard`/`speedrun`) but read/written in several places, making it easy to introduce subtle key mismatches if behavior changes.  
   - Fix: Add a small helper module (e.g. `lib/marathonMeta.js`) that exposes functions like `loadMarathonMeta(speedrunEnabled)`, `saveMarathonMeta(speedrunEnabled, meta)` and `advanceMarathonIndex(...)`. Replace direct uses of `marathonMetaKey` and raw `loadJSON`/`saveJSON` in components with these helpers.

2. **Local vs server state divergence (single-player)**  
   - Code: `useSinglePlayerGame.js:69–88, 190–214`; `GameSinglePlayer.jsx:237–245, 545–555`.  
   - Problem: Several call sites implement their own "server-first then local fallback" logic for `gameStates`, `solvedStates`, and `streaks`. This is correct in spirit but duplicated, and makes it harder to guarantee consistent merge rules across all single-player flows.  
   - Fix:
     - Introduce a small persistence helper layer for single-player, e.g. `singlePlayerStore.ts`/`.js`, that provides:
       - `loadSolvedState(key)` / `saveSolvedState(key, value)`
       - `loadGameState(key)` / `saveGameState(key, value)`
       - `loadStreakRemoteAware(mode, speedrunEnabled)` / `saveStreakRemoteAware(...)`  
     - Have these helpers implement the server-first-then-local fallback and local-mirror behavior in one place, and update `useSinglePlayerGame` and `GameSinglePlayer` to use them.

### 2.2 Refactoring timers, word lists, and sharing

1. **Timer and speedrun state is overly spread across refs**  
   - Code: `GameSinglePlayer.jsx:127–133, 191–198, 275–295, 296–328`.  
   - Problem: Stage timing is implemented via several refs (`stageStartRef`, `stageEndRef`, `committedRef`, `committedStageMsRef`) plus `nowMs`, and derived values like `stageElapsedMs` and `popupTotalMs`. This works but is hard to reason about and easy to break when adding new timed features.  
   - Fix: Extract a dedicated hook (e.g. `useStageTimer`) that owns:
     - Starting/resuming/stopping the timer
     - Committing a stage time
     - Computing `elapsedMs` and `committedMs`  
     and returns a clear API like `{ elapsedMs, committedMs, start, freeze, commit }`. Replace the manual ref choreography in `GameSinglePlayer` with this hook.

2. **Marathon aggregation logic is too tightly coupled to `GameSinglePlayer`**  
   - Code: `GameSinglePlayer.jsx:793–879`.  
   - Problem: Aggregating per-stage marathon totals (turns, times, solved counts) and building the structures that feed `generateShareText` is done inline in the component. This makes the component large and the logic difficult to test independently.  
   - Fix: Extract this into a pure helper (e.g. `buildMarathonShareTotals(...)` in `lib/gameUtils.js` or a new `lib/marathonShare.js`), and write tests around complex cases (partial runs, final stage, exits after out of guesses). Then call that helper from `GameSinglePlayer`.

3. **Duplicated word-list loading logic (hook vs direct)**  
   - Code: `lib/wordLists.js`, `hooks/useWordLists.js`, plus direct `loadWordLists` usage in `useSinglePlayerGame` and multiplayer code.  
   - Problem: There are two different patterns for loading word lists: a hook with global caching (`useWordLists`) and a direct loader (`loadWordLists`). Error handling and caching behavior can diverge.  
   - Fix:
     - Make `loadWordListsOnce` the single low-level loader (similar to `useWordLists` internals), and export it from a shared module.  
     - Make both `useSinglePlayerGame` and multiplayer code call either `useWordLists` or `loadWordListsOnce` consistently, so all paths benefit from the same caching and error behavior.

### 2.3 Word-list loading robustness

1. **Consolidate word-list loading behavior**  
   - Problem: As above, different parts of the app treat fetch errors and caching in slightly different ways.  
   - Fix:
     - Ensure all word-list consumers use `useWordLists` or a shared `loadWordListsOnce` wrapper.  
     - In error cases, surface a consistent error banner/message and an explicit retry button rather than only a one-off toast.

2. **Improve fetch-error UX**  
   - Code: `useSinglePlayerGame.js:315–320` shows a toast-like message for failures.  
   - Fix:
     - Add a global, visible error state in the game view when word lists fail to load (e.g. a panel explaining that the dictionary failed to load, with a "Retry" button that calls the shared loader again).

---

## 3. Multiplayer / 1v1 / Rooms / Chat

**Key files**
- `src/components/game/GameMultiplayer.jsx`
- `src/components/game/MultiplayerGameView.jsx`
- `src/components/game/MultiplayerWaitingRoom.jsx`
- `src/hooks/useMultiplayerGame.js`
- `src/hooks/useMultiplayerController.js`
- `src/hooks/useOpenRooms.js`
- `src/components/OpenRoomsModal.jsx`
- `src/components/game/MultiplayerChat.jsx`
- `src/hooks/useAuth.js`
- `src/lib/multiplayerConfig.js`

### 3.1 Bugs and correctness issues

1. **Ready-state bug for >2 players**  
   - Code: `useMultiplayerController.js:675–688`, `useMultiplayerGame.setReady:283–315`.  
   - Problem: `handleOneVOneReady` computes `currentReady` only from `hostReady`/`guestReady`. For games with more than two players in `players`, a non-host/non-guest player will toggle the wrong ready flag when calling `setReady`.  
   - Fix:
     - In `handleOneVOneReady`, when `gameState.players` exists and contains `authUser.uid`, derive `currentReady` from `gameState.players[authUser.uid].ready`.  
     - Only fall back to host/guest flags when no `players` map exists (true legacy 2-player games).  
     - This keeps `setReady` in sync with actual per-player readiness in multi-player rooms.

2. **Host/guest vs `players` map duplication (refactor away legacy fields)**  
   - Code: multiple branches in `useMultiplayerGame` (`createGame`, `joinGame`, `startGame`, `submitGuess`, `setReady`, `leaveGame`), `useMultiplayerController.handleOneVOneGame`, and several view components that treat `hostId`, `guestId`, and `players` differently.  
   - Problem: Legacy host/guest fields (`hostGuesses`, `guestGuesses`, `hostReady`, `guestReady`, `hostTimeMs`, `guestTimeMs`, etc.) duplicate information in the newer `players` map and complicate logic. You no longer need backward compatibility for older formats, so this duplication becomes pure overhead and a source of bugs.  
   - Fix:
     - Migrate the data model so `players` is the single source of truth for multiplayer rooms:
       - Represent every participant as an entry under `players/<uid>` with `ready`, `guesses`, `timeMs`, etc.  
       - Remove or stop writing legacy host/guest fields from `useMultiplayerGame` (`hostGuesses`, `guestGuesses`, `hostReady`, `guestReady`, `hostTimeMs`, `guestTimeMs`, etc.).  
     - Update all consumers:
       - `useMultiplayerController` should use only the `players` map for guesses, times, and ready checks.  
       - View components (`MultiplayerGameView`, `MultiplayerWaitingRoom`, etc.) should derive player lists solely from `players`, not host/guest branches.  
     - Write a one-time migration or resilience logic that can handle rooms still using the legacy fields during rollout, then remove the old shape once all clients write the new format.

3. **Room-config editing not immediately reflected in host UI**  
   - Code: `MultiplayerWaitingRoom.jsx:248–465` delegating to `onUpdateConfig`, `useMultiplayerGame.updateConfig:879–937`.  
   - Problem: After the host saves new settings (boards, maxPlayers, visibility, speedrun), the waiting-room summary depends on what the server writes back, so there can be a noticeable delay before the new values appear.  
   - Fix:
     - When `onUpdateConfig` is called, optimistically update local state in `MultiplayerWaitingRoom` based on the draft values (`boardsDraft`, `maxPlayersDraft`, `isPublicDraft`, `isSpeedrunDraft`) so the summary text immediately reflects the pending settings.  
     - If `onUpdateConfig` rejects, revert the draft values and show a toast explaining that the update failed.

4. **Inconsistent expiry logic between room listing and join-time checks**  
   - Code: `useOpenRooms.js:58–61`, `OpenRoomsModal.jsx:31–70`, `useMultiplayerGame.joinGame:205–215`, and `MULTIPLAYER_WAITING_TIMEOUT_MS`.  
   - Problem: `useOpenRooms` and `OpenRoomsModal` list rooms based on a 24h window, while `joinGame` and `GameMultiplayer` consider rooms expired after `MULTIPLAYER_WAITING_TIMEOUT_MS` (30 minutes) and may delete them. Users can see rooms in the "open rooms" UI that are no longer joinable.  
   - Fix:
     - Align listing with room lifetime:
       - Change the filters in `useOpenRooms` and `OpenRoomsModal` to only include rooms whose `createdAt` is within `MULTIPLAYER_WAITING_TIMEOUT_MS` of `Date.now()`.  
       - Optionally surface an "expired" label or auto-hide rooms whose `createdAt` delta exceeds that timeout.

5. **Redundant object property in `createGame`**  
   - Code: `useMultiplayerGame.js:111–117` has `hostName` defined twice in the `gameData` object literal.  
   - Fix: Remove the duplicate property so `gameData` is clearly defined:
     ```js
     const gameData = {
       hostId: user.uid,
       hostName,
       hostReady: false,
       // ...
     };
     ```

6. **Friend-request status comment mismatch**  
   - Code: `useMultiplayerGame.setFriendRequestStatus:640–683`.  
   - Problem: The comment mentions tracking `friendRequestFrom`, but the implementation only updates `friendRequestStatus` and `hostFriendRequestSent` / `guestFriendRequestSent`. No code sets `friendRequestFrom`, which can confuse future maintainers or any UI that expects that field.  
   - Fix:
     - Either:
       - Add `friendRequestFrom: user.uid` when status is set to `'pending'`, and keep clearing it when status is cleared, **or**  
       - Remove `friendRequestFrom` from comments and any unused fields in the schema if you do not plan to track it.

### 3.2 Refactors for clarity and scalability

1. **Unify multiplayer naming and layout**  
   - Problem: Code and data paths still mix historical `onevone`/"1v1" naming and newer "multiplayer" terminology. This increases mental overhead and makes it harder to evolve room-based play beyond 2 players.  
   - Fix:
     - At the UI/API level, treat all games under the `onevone` path as generic "multiplayer rooms", with 1v1 being the special case `maxPlayers = 2`.  
     - Rename internal hooks and components (e.g. `useOneVOneGame`, `OneVOneWaitingRoom`) to multiplayer-centric names over time, keeping the DB path as `onevone` for backward compatibility.

2. **Encapsulate solution normalization**  
   - Problem: Many call sites manually normalize `solution`/`solutions` into arrays, each with slightly different fallback rules.  
   - Fix:
     - Add a helper like `getSolutionArray(gameState)` in a shared module (e.g. `lib/multiplayerConfig.js`).  
     - Replace inline patterns such as:
       ```js
       const solutionArray =
         Array.isArray(solutions) && solutions.length > 0
           ? solutions
           : solution
           ? [solution]
           : [];
       ```
       with calls to the helper everywhere (controller, views, hooks).

3. **Chat and comments can grow unboundedly**  
   - Code: `MultiplayerChat.jsx:21–47`, `CommentsSection.jsx:61–88`.  
   - Problem: Both components currently read *all* entries in the corresponding collections, and never enforce a limit. Over time a popular room/thread could accumulate many messages, impacting client performance.  
   - Fix:
     - For chat, use `limitToLast(N)` (e.g. last 100 messages) and only render that slice.  
     - For comments, consider a higher but finite cap (e.g. last 200–300 comments) or pagination if you expect heavy use.

4. **Listener cleanup pattern inconsistency**  
   - Problem: Some code paths use the unsubscribe function returned by `onValue`, others also call `off(ref)` manually. This is redundant and can cause confusion about the correct cleanup pattern.  
   - Fix:
     - Standardize on the `onValue` subscription pattern: retain and call the returned unsubscribe function in the cleanup of each effect, and remove direct `off(ref)` calls where not strictly necessary.

### 3.3 Room lifetime and backend scalability

1. **Room and chat lifetime depends on clients being active**  
   - Code: `useMultiplayerGame.joinGame:208–215` (client-side expiry + delete), `GameMultiplayer.jsx:141–158` (auto-expire when a client is running), plus `MULTIPLAYER_WAITING_TIMEOUT_MS`.  
   - Problem: Rooms and their `chat` subtrees are only expired when a client attempts to join or when an active client timer fires. Inactive rooms with no clients may linger indefinitely, growing the database.  
   - Fix:
     - Add a backend job (Cloud Function / scheduled task) that periodically scans `onevone/*` and deletes rooms whose `createdAt` is older than `MULTIPLAYER_WAITING_TIMEOUT_MS`.  
     - Optionally also prune `chat` subtrees under those rooms as part of the same job.

---

## 4. Friends, Challenges, and Profile

**Key files**
- `src/hooks/useAuth.js`
- `src/components/FriendsModal.jsx`
- `src/Profile.jsx`

### 4.1 Auth and friends system

1. **Repeated "verified user" checks across helpers**  
   - Code: `useAuth.sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`, `sendChallenge` each compute `isVerifiedUser` inline.  
   - Problem: The same condition (verified email or Google sign-in) is implemented in multiple places. Changing verification rules later would require touching every function.  
   - Fix:
     - Add a small utility in `useAuth` like `const isVerifiedSocialUser = (u) => u.emailVerified || (u.providerData || []).some(p => p.providerId === 'google.com');`.  
     - Use this helper everywhere the verification requirement is enforced.

2. **Username and profile indices can drift**  
   - Code: `useAuth.updateUsername:328–337` only updates the Firebase Auth displayName; indices and profile in Realtime Database are written primarily in the `onAuthStateChanged` effect.  
   - Problem: When a user changes their username in `Profile.jsx`, the `usernames/<usernameKey>` index and `users/<uid>/profile.username` may become stale, making username-based lookups inconsistent.  
   - Fix:
     - Extend `updateUsername` to also:
       - Update `users/<uid>/profile.username` to the new username.  
       - Remove the old index `usernames/<oldUsernameKey>` and create `usernames/<newUsernameKey>` mapping to this `uid`.  
     - Ensure `findUserByIdentifier` continues to work using the updated indices.

3. **Centralize error messaging for auth actions**  
   - Code: `Profile.jsx` manually assembles error messages for multiple actions, while `useAuth` already tracks `error`.  
   - Fix:
     - Either expose a mapping from Firebase error codes to user-friendly text from `useAuth`, or provide small helpers (e.g. `formatAuthError(err)`) so all places show consistent messaging while still being driven by one source of truth.

4. **Database indexing and rules for social and leaderboard features**  
   - Problem: Various paths (`emails/`, `usernames/`, `users/<uid>/friends`, `leaderboard/<mode>`, `comments/<threadId>`, `onevone/*`) will grow over time and need proper indexing and security rules.  
   - Fix:
     - Ensure your Realtime Database rules specify `indexOn` for frequently queried keys (e.g. `emails`, `usernames`, `leaderboard/*` order-by fields).  
     - Audit rules to guarantee that:
       - Users can only update their own profile, streaks, and social data.  
       - Cross-user paths like challenges or friend requests enforce correct read/write permissions.

---

## 5. Leaderboard

**Key files**
- `src/hooks/useLeaderboard.js`
- `src/components/Leaderboard.jsx`

### 5.1 Data validation and day boundaries

1. **Assuming valid numeric `timeMs` and `score`**  
   - Code: `Leaderboard.jsx:123–124` uses `formatElapsed(entry.timeMs)` and prints `entry.score`.  
   - Problem: If older or malformed entries get written (e.g. manual testing writes), `timeMs` or `score` might be missing or non-numeric, which will break formatting or sorting.  
   - Fix:
     - In `useLeaderboard`, filter out entries where `timeMs` is not a finite number, or coerce them to a safe default (and optionally log them).  
     - Similarly, default `score` to `0` when missing, and ensure sorting logic treats those entries consistently.

2. **Local-time-based daily window**  
   - Code: `useLeaderboard:58–60` computes start and end of day using local time.  
   - Problem: For a global game, "today" is different per time zone, so players in different regions see slightly different daily windows.  
   - Fix (if a single global daily board is desired):
     - Change the day range to use UTC dates instead of local dates (construct start/end using UTC midnight) so all players share the same daily window.

### 5.2 Scalability of queries

1. **Client-side sorting on potentially large datasets**  
   - Code: `useLeaderboard` fetches `limitToLast(limit * 2)` entries and sorts client-side by score and `timeMs`.  
   - Problem: As the leaderboard grows and if `limit` increases, more data may be pulled and processed in the client than necessary.  
   - Fix:
     - For long-term scale, add a backend process that precomputes daily top-N entries per mode/board count and writes them to a separate `leaderboardTop/<mode>/<numBoards || 'all'>` node.  
     - Update `useLeaderboard` to query only this precomputed top-N set.

---

## 6. Shared Infrastructure and Miscellaneous

### 6.1 Word lists

**Files**
- `src/lib/wordLists.js`
- `src/hooks/useWordLists.js`

1. **Single authoritative loader**  
   - Problem: As described earlier, multiple ways of loading word lists exist.  
   - Fix:
     - Implement `loadWordListsOnce` in a single module with caching and error handling.
     - Have `useWordLists`, `useSinglePlayerGame`, and multiplayer hooks use that shared implementation to avoid drift.

2. **Improved fetch error handling (global)**  
   - Fix:
     - Expose a consistent error interface (e.g. `wordListError` and `reloadWordLists`) that higher-level components can use to render user-facing error panels with retries.

### 6.2 Firebase configuration safety

**File**
- `src/config/firebase.js`

1. **Guard against placeholder config in production builds**  
   - Code: `firebaseConfig` defaults to `"your-project-id"` and related placeholders when env vars are missing.  
   - Problem: It is easy to accidentally ship a build pointing at an invalid Firebase project, leading to confusing runtime errors.  
   - Fix:
     - In non-development builds (e.g. `import.meta.env.MODE !== 'development'`), throw an error during initialization if any required Firebase env var is missing or still set to a placeholder.  
     - Alternatively, render a fatal UI error page when the config is invalid, making the misconfiguration obvious.

### 6.3 Styling and layout

1. **Heavy use of inline styles mixed with CSS files**  
   - Files: many components (`Game*`, `Profile`, `FriendsModal`, `OpenRoomsModal`, etc.).  
   - Problem: Inline style objects are duplicated across components and make it harder to enforce consistent spacing/typography. They also incur a small runtime cost compared with static CSS.  
   - Fix:
     - Gradually move repeated inline style patterns (buttons, cards, panel layouts) into CSS classes in existing stylesheets.  
     - Use inline styles only for truly dynamic values (e.g. conditional colors, inline transforms) to keep layout and typography centralized.
