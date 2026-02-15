# Remaining Optimizations and Issues

This document tracks optimizations from `optimization.md` that are **NOT done** or **done incorrectly**.

---

## 1. Routing, App Shell, and URL Handling

### 1.1.1 Over-eager daily board reset ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `App.jsx:16-20` now properly checks `location.pathname === '/'` only for the home route
- This prevents unrelated routes ending with `/` (like `/profile/`) from resetting `dailyBoards`
- **No action needed**

### 1.1.2 Duplicated base-URL normalization logic - ⚠️ PARTIALLY DONE
**Status**: PARTIALLY FIXED - Still Has Duplication
- ✅ Fixed: URL normalization is now centralized in `main.jsx` (lines 8-35) with proper 404 handling and base URL management
- ⚠️ Issue Remaining: `App.jsx` still has direct `window.location` manipulation and routing logic, though it's been reduced
- **Recommendation**: Complete migration - remove any remaining trailing-slash handling from `App.jsx` and rely entirely on `main.jsx` for URL normalization

---

## 2. Single-Player Game Modes

### 2.1.1 Marathon meta key behavior ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `lib/marathonMeta.js` exists with proper helper functions:
  - `loadMarathonMeta(speedrunEnabled)` - loads with proper defaults
  - `saveMarathonMeta(speedrunEnabled, partialMeta)` - saves with merge semantics
  - `advanceMarathonIndex(speedrunEnabled, steps)` - increments index safely
- `GameSinglePlayer.jsx` uses these helpers directly instead of raw persist calls
- **No action needed**

### 2.1.2 Local vs server state divergence (single-player) ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `lib/singlePlayerStore.js` implements the persistence helper layer with:
  - `loadSolvedState()` - server-first with local fallback
  - `loadGameState()` - server-first with local fallback
  - `saveGameState()` and `saveSolvedState()` - writes to both
  - `loadStreakRemoteAware()` and `saveStreakRemoteAware()` - server-aware streak handling
- `GameSinglePlayer.jsx` imports and uses these helpers
- **No action needed**

### 2.2.1 Timer and speedrun state refactoring ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `hooks/useStageTimer.js` extracts all timer logic with a clean API:
  - `start()` - begins timer
  - `freeze()` - stops and returns elapsed time
  - `elapsedMs` - computed elapsed time
  - `isFrozen` - frozen state flag
- `GameSinglePlayer.jsx:128-140` uses `useStageTimer` instead of manual refs
- Old manual refs (like `stageStartRef`, `stageEndRef`) have been completely replaced
- **No action needed**

### 2.2.2 Marathon aggregation logic ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- Marathon share totals are extracted into `lib/gameUtils.js:201+` as `buildMarathonShareTotals()`
- `GameSinglePlayer.jsx:769-777` uses this helper via `useMemo`
- Logic is isolated and testable
- **No action needed**

### 2.2.3 Duplicated word-list loading logic ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- Single authoritative loader: `lib/wordLists.js` with:
  - `loadWordListsOnce()` - main loader with caching
  - `loadWordLists()` - wrapper that returns formatted result
  - `getCachedWordLists()` - reads cache
- `hooks/useWordLists.js` uses `loadWordListsOnce()` consistently
- Other code paths should use the same
- **Verify**: Check that all multiplayer code uses either `useWordLists()` hook or `loadWordListsOnce()` consistently
- **No critical issues found**

---

## 3. Multiplayer / 1v1 / Rooms / Chat

### 3.1.1 Ready-state bug for >2 players ⚠️ NEEDS REVIEW
**Status**: PARTIALLY FIXED - Logic May Still Have Issues
- `useMultiplayerController.js:675-688` still uses the original logic:
  ```javascript
  const currentReady = oneVOneGame.gameState?.hostId === authUser?.uid
    ? oneVOneGame.gameState.hostReady
    : oneVOneGame.gameState?.guestReady;
  ```
- ❌ Issue: For >2 players, this doesn't check the `players` map - it only checks host/guest flags
- **Fix needed**: Update `handleOneVOneReady` to:
  1. Check if `gameState.players[authUser.uid]` exists
  2. If yes, use `gameState.players[authUser.uid].ready` as the current state
  3. Only fall back to host/guest flags for true 2-player games without a `players` map

### 3.1.2 Host/guest vs `players` map duplication ⚠️ NOT FULLY MIGRATED
**Status**: INCOMPLETE - Legacy Fields Still In Use
- ❌ Problem: `useMultiplayerGame.js` still writes both legacy host/guest fields AND the `players` map:
  - `hostReady`, `guestReady` (lines 123-124)
  - `hostGuesses`, `guestGuesses` (lines 130-131)
  - `hostTimeMs`, `guestTimeMs` (lines 138-139)
  - And corresponding `players` map entries (lines 150-158)
- ❌ Problem: `useMultiplayerController` still reads from host/guest fields in many places
- ❌ Problem: Multiple places implement redundant solution normalization
- **Recommendation**: This is a significant refactor:
  1. Fully migrate to use `players` map as the single source of truth
  2. Remove writes to legacy host/guest fields in `createGame`, `joinGame`, `setReady`, `submitGuess`, etc.
  3. Update `useMultiplayerController` to read only from `players` map
  4. Add migration logic to handle rooms that still have the old format during rollout
  5. After all clients are updated, remove the legacy field reading entirely

### 3.1.3 Room-config editing UI feedback ❌ NOT OPTIMIZED
**Status**: NOT DONE - Missing Optimistic Update
- Current behavior: `MultiplayerWaitingRoom.jsx` sends `onUpdateConfig()` but waits for server response
- ❌ Issue: No optimistic UI update - users see a delay before config changes appear
- ❌ Issue: Draft state (`boardsDraft`, etc.) is used locally but not immediately reflected in the summary display
- **Fix needed**:
  1. When user clicks "Save changes", optimistically update the displayed config immediately
  2. Revert if the server request fails
  3. Show a loading state or temporary toast to indicate the update is in progress

### 3.1.4 Inconsistent room expiry logic ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `useOpenRooms.js:64` filters rooms using `MULTIPLAYER_WAITING_TIMEOUT_MS`
- `OpenRoomsModal.jsx:184` also uses the same timeout
- `useMultiplayerGame.js:205-215` and `GameMultiplayer` use the same constant
- All paths are consistent
- **No action needed**

### 3.1.5 Redundant hostName property ✅ FIXED
**Status**: NO DUPLICATION FOUND
- `useMultiplayerGame.js:116-121` defines `hostName` once and uses it in `gameData`
- **No action needed**

### 3.1.6 Friend-request status comment/implementation mismatch ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `useMultiplayerGame.js:665, 676, 684` properly sets/clears `friendRequestFrom: user.uid`
- Comment at line 639 matches implementation
- **No action needed**

### 3.2.2 Solution normalization helper ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `lib/multiplayerConfig.js:8-16` exports `getSolutionArray()` helper
- Normalizes `gameState.solutions` and `gameState.solution` into a single array
- Should be used consistently across multiplayer code
- **Verify**: Audit code paths to ensure all places use this helper instead of inline logic

### 3.2.3 Chat and comments unbounded growth ❌ NOT FIXED
**Status**: NOT DONE - No Limits Implemented
- `components/game/MultiplayerChat.jsx:21-40` loads ALL messages without any limit
  ```javascript
  const unsubscribe = onValue(chatRef, (snapshot) => {
    // ... loads ALL messages, no limitToLast()
  ```
- ❌ Issue: As chat grows, all messages are fetched and rendered on each update
- ❌ Similar issue in `CommentsSection.jsx` (mentioned in optimization.md)
- **Fix needed**:
  1. Add `limitToLast(N)` query (e.g., last 100 messages for chat)
  2. Implement pagination or "load more" if needed for older messages
  3. Do the same for comments sections
  4. This prevents performance degradation as rooms/threads age

### 3.2.4 Listener cleanup pattern - ⚠️ MIXED APPROACHES
**Status**: PARTIALLY INCONSISTENT
- `useOpenRooms.js:74-76` uses both `off(roomsRef)` AND `unsubscribe()` - redundant
- Some components follow only the `unsubscribe()` pattern
- **Recommendation**: Standardize on calling the returned `unsubscribe()` function and remove direct `off()` calls

### 3.3.1 Room and chat lifetime backend job ❌ NOT IMPLEMENTED
**Status**: NOT DONE - Missing Backend Cleanup
- No Cloud Function or scheduled task found to prune expired rooms
- Rooms older than `MULTIPLAYER_WAITING_TIMEOUT_MS` may linger indefinitely
- ❌ Issue: Database will grow unbounded with stale room documents
- **Fix needed**:
  1. Create a Cloud Function scheduled to run every 5-10 minutes
  2. Query `onevone/*` for rooms where `createdAt` is older than `MULTIPLAYER_WAITING_TIMEOUT_MS`
  3. Delete those rooms and their associated `chat` subtrees
  4. Add appropriate logging and error handling
  5. Consider indexing on `createdAt` for performance

---

## 4. Friends, Challenges, and Profile

### 4.1.1 Repeated "verified user" checks ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `useAuth.js:21-25` defines `isVerifiedSocialUser()` helper function
- Used consistently across all auth methods (lines 148, 445, 469, 512, 541, 574, 844)
- **No action needed**

### 4.1.2 Username and profile index updates ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `useAuth.js:355-410` `updateUsername()` properly:
  1. Updates Firebase Auth displayName
  2. Updates `users/<uid>/profile.username` 
  3. Creates new `usernames/<newKey>` index
  4. Removes old `usernames/<oldKey>` index
- All index operations are implemented
- **No action needed**

### 4.1.3 Centralize auth error messaging - ✅ PARTIALLY DONE
**Status**: PARTIALLY IMPLEMENTED
- `useAuth.js` has `formatAuthError()` helper function
- All auth methods use it for consistent error handling
- **Verify**: Ensure all components import and use `formatAuthError` for consistency

### 4.1.4 Database indexing and rules ❌ NOT REVIEWED
**Status**: CANNOT VERIFY - Requires Firebase Console
- Optimization mentions need for indexing on:
  - `emails/` - email lookup
  - `usernames/` - username lookup
  - `users/<uid>/friends` - friend queries
  - `leaderboard/<mode>` - leaderboard sorting
- **Action needed**: Check Firebase Realtime Database Rules and Indexes via Firebase Console
- **Recommendation**: Ensure all `orderBy` and `limitToFirst`/`limitToLast` queries have proper indexes defined

---

## 5. Leaderboard

### 5.1.1 Data validation and day boundaries ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `useLeaderboard.js:96-110` properly:
  1. Coerces `score` to finite number, defaults to 0
  2. Coerces `timeMs` to finite number, drops non-finite entries
  3. Filters out entries with `!Number.isFinite(entry.timeMs)`
- UTC day boundaries used (lines 56-66)
- **No action needed**

### 5.1.2 Leaderboard scalability - ⚠️ NOT OPTIMIZED
**Status**: NOT OPTIMIZED FOR SCALE
- `useLeaderboard.js:73` fetches `limitToLast(limit * 2)` and sorts client-side
- ❌ Issue: As leaderboard grows, this will fetch more and more data
- ❌ Issue: Client-side sorting of large datasets is inefficient
- **Recommendation**: For long-term scale, add backend process that:
  1. Precomputes daily top-N entries per mode/numBoards
  2. Writes to `leaderboardTop/<mode>/<numBoards>` collection
  3. Query that instead of the full leaderboard

---

## 6. Shared Infrastructure and Miscellaneous

### 6.1.1 Single authoritative word-list loader ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `lib/wordLists.js` is the single source of truth
- `loadWordListsOnce()` handles caching
- `useWordLists()` hook uses it
- **No action needed**

### 6.2.1 Firebase configuration safety ✅ FIXED
**Status**: CORRECTLY IMPLEMENTED
- `config/firebase.js:22-42` validates config in non-dev builds
- Throws error if any placeholder value is detected
- **No action needed**

### 6.3.1 Inline styles mixed with CSS ⚠️ NOT REFACTORED
**Status**: NOT OPTIMIZED - Still Has Inline Styles
- Many components still use inline `style={{...}}` objects
- Examples: `GameSinglePlayer.jsx`, `MultiplayerWaitingRoom.jsx`, various modal components
- ❌ Issue: Duplicated style patterns across components
- ❌ Issue: Harder to maintain consistent design system
- ❌ Issue: Small runtime cost compared to static CSS
- **Recommendation**: Low priority but good for maintainability:
  1. Extract common button, card, and panel styles to CSS files
  2. Reserve inline styles only for dynamic values (conditional colors, transforms)
  3. Create utility CSS classes for common spacing/layout patterns

---

## Summary of Critical Issues

| Category | Issue | Priority | Status |
|----------|-------|----------|--------|
| Multiplayer | Ready-state bug for >2 players | 🔴 HIGH | ⚠️ Needs Fix |
| Multiplayer | Host/guest field duplication | 🔴 HIGH | ❌ Not Done |
| Chat | Unbounded message growth | 🟡 MEDIUM | ❌ Not Done |
| Backend | Room expiry job | 🟡 MEDIUM | ❌ Not Done |
| Config | Room config optimistic UI | 🟡 MEDIUM | ❌ Not Done |
| Styles | Inline style consolidation | 🟢 LOW | ⚠️ Partial |

---

## Recommendations for Next Steps

1. **Priority 1 (High Impact, High Effort)**
   - Fix ready-state bug for >2 players in multiplayer games
   - Migrate to `players` map as single source of truth (removes duplication, fixes bugs)
   - Implement backend room cleanup job

2. **Priority 2 (Medium Impact)**
   - Add `limitToLast()` to chat and comments to prevent unbounded growth
   - Add optimistic UI updates for room config changes
   - Standardize listener cleanup patterns

3. **Priority 3 (Nice to Have)**
   - Consolidate inline styles into CSS classes
   - Add backend precomputation for leaderboard scalability
   - Verify Firebase indexes and security rules

