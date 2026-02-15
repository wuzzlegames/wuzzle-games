# Wuzzle Games - Codebase Optimization & Improvement Plan

This document identifies bugs, architectural improvements, scalability concerns, and optimization opportunities to make the app more maintainable, scalable, and easier to extend with new game modes.

## Table of Contents
1. [Architecture & Scalability](#architecture--scalability)
2. [Code Quality & Maintainability](#code-quality--maintainability)
3. [Performance Optimizations](#performance-optimizations)
4. [Bugs & Edge Cases](#bugs--edge-cases)
5. [Mode Extensibility](#mode-extensibility)
6. [State Management](#state-management)
7. [Error Handling & Resilience](#error-handling--resilience)
8. [Testing & Documentation](#testing--documentation)

---

## Architecture & Scalability

### 1.1 Game Mode Architecture - Needs Abstraction

**Problem**: Adding new game modes requires duplicating logic across multiple files and understanding complex routing.

**Current Issues**:
- `Game.jsx` has complex mode detection logic mixing URL params, query params, and route params
- Each mode (daily, marathon, multiplayer) has separate components with duplicated game logic
- No clear abstraction for "game mode" that encapsulates mode-specific behavior

**Recommendation**: Create a game mode registry/plugin system
```javascript
// lib/gameModes.js
export const GAME_MODES = {
  daily: {
    id: 'daily',
    route: '/game/daily',
    component: GameSinglePlayer,
    supportsSpeedrun: true,
    supportsBoards: true,
    persistence: 'daily',
    // ... mode-specific config
  },
  marathon: { /* ... */ },
  multiplayer: { /* ... */ }
};
```

**Files to Refactor**:
- `src/Game.jsx` - Extract mode detection into `useGameMode()` hook
- `src/App.jsx` - Use mode registry for route generation
- Create `src/lib/gameModes.js` for mode definitions

**Impact**: Adding a new mode becomes: add entry to registry, implement mode-specific component, done.

---

### 1.2 Routing Complexity

**Problem**: Multiple overlapping route patterns make it hard to understand URL structure.

**Current Routes** (from `App.jsx`):
```javascript
/game
/game/:mode
/game/:mode/:boards
/game/:mode/:boards/:variant
/game/multiplayer/:code
/game/multiplayer/:code/:variant
```

**Issues**:
- Inconsistent parameter handling (query params vs route params)
- `Game.jsx` has complex logic to determine mode from multiple sources
- No clear URL structure documentation

**Recommendation**: Standardize URL structure
- Use route params for required values: `/game/:mode/:boards?/:variant?`
- Use query params only for optional/transient state: `?speedrun=true`
- Create URL builder utilities: `buildGameUrl({ mode, boards, speedrun })`

**Files**:
- `src/App.jsx` - Simplify routes
- `src/Game.jsx` - Simplify mode detection
- Create `src/lib/routing.js` for URL utilities

---

### 1.3 Component Size & Responsibility

**Problem**: Large components with too many responsibilities.

**Examples**:
- `GameSinglePlayer.jsx` - 985 lines, handles: state, persistence, timing, UI, sharing, streaks
- `useMultiplayerController.js` - 875 lines, handles: initialization, game logic, UI state, friend requests

**Recommendation**: Split into smaller, focused components/hooks
- Extract game logic hooks: `useGameState()`, `useGamePersistence()`, `useGameTiming()`
- Extract UI components: `GameHeader`, `GameControls`, `GameStats`
- Use composition over monolithic components

**Priority**: HIGH - Makes codebase much easier to maintain and test

---

### 1.4 Firebase Data Model - Legacy Fields

**Problem**: Duplication between legacy `hostId`/`guestId` fields and new `players` map.

**Current State**:
- `useMultiplayerGame.js` maintains both old and new structures
- Multiple code paths check both formats
- Risk of data inconsistency

**Recommendation**: Complete migration to `players` map
1. Remove all writes to legacy fields (`hostGuesses`, `guestGuesses`, `hostReady`, etc.)
2. Update all readers to use `players` map only
3. Add migration script to clean up existing data
4. Remove legacy field handling code

**Files**:
- `src/hooks/useMultiplayerGame.js` - Remove legacy field writes
- `src/hooks/useMultiplayerController.js` - Use only `players` map
- All multiplayer view components

**Impact**: Reduces bugs, simplifies code, improves performance

---

## Code Quality & Maintainability

### 2.1 Duplicated Logic

**Problem**: Same logic repeated across multiple files.

**Examples**:

1. **Word List Loading**
   - `lib/wordLists.js` - Direct loader
   - `hooks/useWordLists.js` - Hook wrapper
   - Direct calls in `useSinglePlayerGame.js` and multiplayer code
   - **Fix**: Single authoritative loader, all code uses it

2. **Solution Array Normalization**
   - Repeated pattern: `Array.isArray(solutions) ? solutions : solution ? [solution] : []`
   - Appears in: `useMultiplayerController.js`, `useMultiplayerGame.js`, view components
   - **Fix**: Create `getSolutionArray(gameState)` helper in `lib/multiplayerConfig.js`

3. **Board Count Validation**
   - `Math.max(1, Math.min(32, n))` appears in multiple places
   - **Fix**: Create `clampBoards(n)` utility

4. **Date String Parsing**
   - `getCurrentDateString()` logic duplicated in streak calculations
   - **Fix**: Centralize in `lib/dailyWords.js`

**Recommendation**: Create utility modules
- `src/lib/validation.js` - Board count, player count validation
- `src/lib/multiplayerConfig.js` - Solution normalization, config helpers
- Audit all files for duplicated patterns

---

### 2.2 Inconsistent Error Handling

**Problem**: Different error handling patterns across the codebase.

**Examples**:
- Some functions throw errors, others return error states
- Inconsistent error messages
- Some errors logged to console, others shown to users

**Current State**:
- 57 `console.log/error/warn` calls across 13 files
- Mix of try/catch, error states, and silent failures

**Recommendation**: Standardize error handling
1. Create error boundary components for React errors
2. Standardize async error handling (always catch, always surface)
3. Create error formatting utilities
4. Replace console.log with proper logging service (or remove in production)

**Files to Update**:
- All hooks with async operations
- All Firebase operations
- All word list loading

---

### 2.3 Magic Numbers & Constants

**Problem**: Hard-coded values scattered throughout code.

**Examples**:
- `32` - Max boards (appears in multiple places)
- `6` - Default max turns
- `100` - Timer interval (ms)
- `5000` - Message timeout (ms)
- `MULTIPLAYER_WAITING_TIMEOUT_MS` - Room lifetime

**Recommendation**: Centralize all constants
- `src/lib/gameConstants.js` - Already exists, expand it
- Add: `MAX_BOARDS`, `DEFAULT_MAX_TURNS`, `TIMER_INTERVAL_MS`, `MESSAGE_TIMEOUT_MS`
- Import from single source

**Files**:
- `src/lib/gameConstants.js` - Expand
- Audit all files for magic numbers

---

### 2.4 Type Safety & Validation

**Problem**: No runtime type checking, easy to introduce bugs.

**Issues**:
- No TypeScript or PropTypes
- Manual type checking with `typeof` scattered throughout
- No validation for Firebase data structures

**Recommendation**: Add runtime validation
1. Add PropTypes to all components (or migrate to TypeScript)
2. Create validation utilities for game state, user data, etc.
3. Validate Firebase data on read (defensive programming)

**Example**:
```javascript
// lib/validation.js
export function validateGameState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!Array.isArray(state.boards)) return false;
  // ... more checks
  return true;
}
```

---

## Performance Optimizations

### 3.1 Unnecessary Re-renders

**Problem**: Components re-render when they don't need to.

**Examples**:

1. **useMultiplayerGame Hook**
   - Returns new object on every render (fixed with `useMemo`, but verify)
   - Check: `src/hooks/useMultiplayerGame.js:848-867`

2. **GameSinglePlayer**
   - 41 useState/useEffect/useCallback/useMemo calls
   - Many dependencies that could cause cascading re-renders
   - **Fix**: Audit dependencies, use `useMemo` for expensive computations

3. **Board Rendering**
   - All boards re-render on every guess
   - **Fix**: Memoize board components, only update changed boards

**Recommendation**:
- Memoize expensive computations
- Split components to reduce re-render scope
- Use `React.memo` for pure components

---

### 3.2 Large Bundle Size

**Problem**: No code splitting beyond lazy loading.

**Current State**:
- Lazy loading for routes (good)
- But large vendor chunks (React, Firebase)

**Recommendation**:
1. Analyze bundle with `vite-bundle-visualizer`
2. Split Firebase imports (auth vs database vs storage)
3. Lazy load Firebase features only when needed
4. Consider dynamic imports for game mode components

**Files**:
- `vite.config.js` - Already has manual chunks, optimize further
- `src/config/firebase.js` - Split exports

---

### 3.3 Firebase Query Optimization

**Problem**: Inefficient Firebase queries.

**Examples**:

1. **Leaderboard**
   - Fetches `limitToLast(limit * 2)` then sorts client-side
   - **Fix**: Use server-side sorting or precomputed top-N

2. **Open Rooms**
   - Fetches all rooms, filters client-side
   - **Fix**: Use Firebase queries with proper indexes

3. **Chat/Comments**
   - No limits, fetches all messages
   - **Fix**: Use `limitToLast(100)` for chat, pagination for comments

**Recommendation**:
- Add Firebase indexes for all `orderBy` queries
- Use `limitToFirst`/`limitToLast` consistently
- Consider Cloud Functions for complex queries

**Files**:
- `src/hooks/useLeaderboard.js`
- `src/hooks/useOpenRooms.js`
- `src/components/game/MultiplayerChat.jsx`
- `src/components/game/CommentsSection.jsx`

---

### 3.4 Memory Leaks

**Problem**: Potential memory leaks from timers and listeners.

**Fixed Issues** (from `OOM_BUG_FINAL_FIX.md`):
- ✅ Fixed: `useMultiplayerGame` object recreation
- ✅ Fixed: Firebase listener leaks

**Remaining Concerns**:
- Multiple `setInterval` calls in `GameMultiplayer.jsx` (lines 90-109)
- Ensure all intervals are cleaned up
- Verify Firebase listeners are properly unsubscribed

**Recommendation**: Audit all timers and listeners
- Use `useEffect` cleanup for all intervals/timeouts
- Verify all Firebase `onValue` calls have proper cleanup
- Add memory leak detection in development

---

## Bugs & Edge Cases

### 4.1 URL Parameter Handling

**Problem**: Complex, error-prone parameter parsing.

**Current Issues** (from `Game.jsx`):
- Multiple sources: `useParams()`, `useSearchParams()`, hardcoded defaults
- Inconsistent fallbacks
- No validation

**Example Bug Scenario**:
- User visits `/game/daily/5/speedrun` - works
- User visits `/game?mode=daily&boards=5&speedrun=true` - works
- User visits `/game/daily/5?speedrun=true` - might break
- User visits `/game/invalid` - falls back to daily, but silently

**Recommendation**:
- Single source of truth for URL parsing
- Validate all parameters
- Show error messages for invalid URLs
- Redirect to canonical URL format

---

### 4.2 State Persistence Edge Cases

**Problem**: Race conditions and state inconsistencies.

**Issues**:

1. **Server vs Local State**
   - `singlePlayerStore.js` implements server-first fallback
   - But what if server has stale data?
   - What if local has newer timestamp?

2. **Marathon State**
   - Multiple stages, multiple persistence keys
   - Risk of partial state (stage 2 saved, stage 1 not)

3. **Multiplayer State**
   - What if user loses connection mid-game?
   - What if Firebase write fails but local state updates?

**Recommendation**:
- Add conflict resolution logic (timestamp-based)
- Add state validation on load
- Add retry logic for failed writes
- Add offline support detection

**Files**:
- `src/lib/singlePlayerStore.js`
- `src/lib/marathonMeta.js`
- `src/hooks/useMultiplayerGame.js`

---

### 4.3 Input Validation

**Problem**: Insufficient validation of user input.

**Examples**:

1. **Username**
   - Length limits?
   - Character restrictions?
   - Duplicate checking?

2. **Game Code**
   - Format validation?
   - Existence check before join?

3. **Board Count**
   - Validated in some places, not others
   - What about negative numbers? Decimals?

**Recommendation**: Add comprehensive validation
- Create `src/lib/validation.js`
- Validate all user inputs
- Show clear error messages
- Sanitize inputs before Firebase writes

---

### 4.4 Race Conditions

**Problem**: Concurrent operations can cause race conditions.

**Examples**:

1. **Multiplayer Ready State**
   - Multiple players clicking ready simultaneously
   - Firebase updates might conflict

2. **Game State Saves**
   - Rapid guesses might cause save conflicts
   - Last write wins might lose data

3. **Friend Requests**
   - Both users sending requests simultaneously

**Recommendation**:
- Use Firebase transactions for critical updates
- Add optimistic UI updates with rollback
- Add conflict detection and resolution

**Files**:
- `src/hooks/useMultiplayerGame.js` - Use transactions for ready/start
- `src/hooks/useAuth.js` - Use transactions for friend requests

---

## Mode Extensibility

### 5.1 Adding New Modes is Difficult

**Problem**: No clear pattern for adding new game modes.

**Current Process** (hypothetical new mode):
1. Add route to `App.jsx`
2. Add mode detection logic to `Game.jsx`
3. Create new component (or extend existing)
4. Add persistence logic
5. Add mode-specific UI
6. Update leaderboard (if applicable)
7. Update sharing logic
8. Add tests

**Recommendation**: Create mode plugin system

```javascript
// lib/gameModes/registry.js
export class GameModeRegistry {
  register(mode) {
    // Validate mode structure
    // Add to registry
  }
  
  getMode(id) { /* ... */ }
  getAllModes() { /* ... */ }
}

// lib/gameModes/baseMode.js
export class BaseGameMode {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    // ... common interface
  }
  
  // Abstract methods to implement
  initialize() { throw new Error('Not implemented'); }
  persist() { throw new Error('Not implemented'); }
  // ...
}
```

**Benefits**:
- Clear interface for new modes
- Shared logic in base class
- Easy to test
- Type-safe (if using TypeScript)

---

### 5.2 Mode-Specific Features Not Abstracted

**Problem**: Features tied to specific modes, hard to reuse.

**Examples**:
- Speedrun timing (daily + marathon, but not multiplayer)
- Streaks (daily 1-board + marathon only)
- Multi-board (all modes, but different limits)

**Recommendation**: Feature flags per mode
```javascript
const GAME_MODES = {
  daily: {
    features: {
      speedrun: true,
      multiBoard: true,
      streaks: { minBoards: 1, maxBoards: 32 },
      leaderboard: true,
    }
  },
  // ...
};
```

---

### 5.3 Shared Game Logic Duplication

**Problem**: Core game logic (scoring, validation, etc.) duplicated across modes.

**Current State**:
- `lib/wordle.js` has core functions (good)
- But mode-specific logic scattered

**Recommendation**: Extract game engine
```javascript
// lib/gameEngine.js
export class GameEngine {
  constructor(config) {
    this.wordLength = config.wordLength;
    this.maxTurns = config.maxTurns;
    // ...
  }
  
  scoreGuess(guess, solution) { /* ... */ }
  validateGuess(guess, allowedWords) { /* ... */ }
  checkWin(boards) { /* ... */ }
  // ... core game logic
}
```

**Benefits**:
- Single source of truth for game rules
- Easy to test
- Easy to modify rules
- Can support different word lengths, turn counts, etc.

---

## State Management

### 6.1 State Management Pattern

**Problem**: Mix of useState, useReducer, refs, and Firebase state.

**Current State**:
- Local state: `useState` for UI
- Game state: Mix of state and refs
- Server state: Firebase listeners
- Persisted state: localStorage + Firebase

**Issues**:
- Hard to track state flow
- Risk of state inconsistencies
- Difficult to debug

**Recommendation**: Consider state management library
- Option 1: Zustand (lightweight, simple)
- Option 2: Jotai (atomic state)
- Option 3: Keep current but document patterns

**If keeping current**:
- Document state management patterns
- Create state flow diagrams
- Add state debugging tools (React DevTools)

---

### 6.2 State Synchronization

**Problem**: Keeping local, persisted, and server state in sync.

**Current Approach**:
- `singlePlayerStore.js` implements server-first fallback
- But no conflict resolution
- No offline queue

**Recommendation**: Add state sync layer
```javascript
// lib/stateSync.js
export class StateSync {
  async sync(key, localState, serverState) {
    // Compare timestamps
    // Resolve conflicts
    // Return merged state
  }
  
  queueUpdate(key, state) {
    // Queue for offline
    // Retry on reconnect
  }
}
```

---

### 6.3 Ref Usage

**Problem**: Heavy use of refs for values that should be state.

**Examples**:
- `currentGuessRef` - Why not just state?
- `committedRef`, `committedStageMsRef` - Could be state
- `endingGameRef`, `popupClosedRef` - Could be state

**Recommendation**: Audit ref usage
- Use refs only when necessary (avoiding re-renders, accessing in callbacks)
- Convert appropriate refs to state
- Document why refs are used where they are

---

## Error Handling & Resilience

### 6.1 Error Boundaries

**Problem**: No React error boundaries.

**Current State**: Errors can crash entire app.

**Recommendation**: Add error boundaries
```javascript
// components/ErrorBoundary.jsx
export class ErrorBoundary extends React.Component {
  // Catch errors, show fallback UI
}
```

**Place boundaries around**:
- Game components
- Auth components
- Route sections

---

### 6.2 Network Error Handling

**Problem**: No handling for network failures.

**Issues**:
- Firebase connection lost - no indication
- Word list fetch fails - shows error but no retry
- Save failures - silent or console only

**Recommendation**:
- Add connection status indicator
- Add retry logic with exponential backoff
- Show user-friendly error messages
- Queue operations when offline

**Files**:
- `src/hooks/useAuth.js` - Add connection monitoring
- `src/lib/wordLists.js` - Add retry logic
- `src/lib/singlePlayerStore.js` - Add offline queue

---

### 6.3 Graceful Degradation

**Problem**: App breaks if Firebase is down.

**Recommendation**: Add fallback modes
- Offline mode for single-player games
- Local-only leaderboard when server unavailable
- Cached word lists (already done, but verify)

---

## Testing & Documentation

### 7.1 Test Coverage

**Problem**: Unknown test coverage, likely gaps.

**Recommendation**:
1. Add coverage reporting: `vitest --coverage`
2. Identify untested areas
3. Add tests for:
   - Game logic (scoring, validation)
   - State persistence
   - Error handling
   - Edge cases

**Priority Areas**:
- `lib/wordle.js` - Core game logic
- `lib/persist.js` - Persistence
- `hooks/useSinglePlayerGame.js` - Game initialization
- `hooks/useMultiplayerGame.js` - Multiplayer logic

---

### 7.2 Documentation

**Problem**: Limited documentation.

**Current State**:
- `README.md` - Setup instructions
- `WARP.md` - Architecture overview (good!)
- Various bug fix documents

**Missing**:
- API documentation
- Component documentation
- Hook documentation
- Contributing guide

**Recommendation**:
- Add JSDoc comments to all functions
- Document component props
- Create architecture diagrams
- Document state management patterns
- Add inline comments for complex logic

---

### 7.3 Type Definitions

**Problem**: No type definitions.

**Recommendation**:
- Option 1: Migrate to TypeScript (big effort)
- Option 2: Add JSDoc with type annotations
- Option 3: Add PropTypes to all components

**Quick Win**: Add JSDoc types
```javascript
/**
 * @param {string} guess - The word guess
 * @param {string} solution - The solution word
 * @returns {Array<number>} Array of color codes (0=gray, 1=yellow, 2=green)
 */
export function scoreGuess(guess, solution) {
  // ...
}
