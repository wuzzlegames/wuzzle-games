# State Management Patterns

This document describes the state management patterns used in Wuzzle Games.

## Overview

Wuzzle Games uses a hybrid state management approach:
- **Local UI State**: `useState` for component-specific UI state
- **Game State**: Mix of `useState` and `useRef` for game logic
- **Server State**: Firebase Realtime Database listeners
- **Persisted State**: localStorage + Firebase with conflict resolution

## State Types

### 1. Local UI State (`useState`)

Used for UI-specific state that doesn't need to persist or sync:

- Modal visibility (`showPopup`, `showFeedbackModal`)
- Loading states (`isLoading`)
- User input (`currentGuess`)
- Selection state (`selectedBoardIndex`)

**Example:**
```javascript
const [showPopup, setShowPopup] = useState(false);
const [isLoading, setIsLoading] = useState(true);
```

### 2. Game State (`useState` + `useRef`)

Game state is split between `useState` (for reactive updates) and `useRef` (for values accessed in callbacks without causing re-renders).

**useState for game state:**
- `boards` - Array of board states (needs to trigger re-renders)
- `maxTurns` - Maximum turns (affects UI)
- `revealId` - Animation trigger (needs to trigger re-renders)

**useRef for game state:**
- `currentGuessRef` - Current guess (accessed in keyboard callbacks, avoids stale closures)
- `committedRef` - Marathon stage commit flag (doesn't need to trigger re-renders)
- `endingGameRef` - Game ending flag (coordination between effects)
- `popupClosedRef` - Popup state (prevents effect loops)

**Why refs are used:**
- **Avoid re-renders**: Values that don't need to trigger UI updates
- **Stale closure prevention**: Accessing latest value in callbacks without adding to dependency arrays
- **Effect coordination**: Flags used to coordinate between multiple effects

**Example:**
```javascript
const [currentGuess, setCurrentGuess] = useState("");
const currentGuessRef = useRef("");

// Keep ref in sync with state
useEffect(() => {
  currentGuessRef.current = currentGuess;
}, [currentGuess]);

// Use ref in callback to avoid stale closure
const handleKeyPress = useCallback((key) => {
  const guess = currentGuessRef.current; // Always latest value
  // ...
}, []); // No currentGuess in dependencies
```

### 3. Server State (Firebase Listeners)

Firebase Realtime Database provides real-time state synchronization:

- **Multiplayer game state**: `useMultiplayerGame` hook
- **User data**: `useAuth` hook
- **Friend requests**: `useAuth` hook
- **Leaderboard**: `useLeaderboard` hook

**Pattern:**
```javascript
useEffect(() => {
  const unsubscribe = onValue(ref, (snapshot) => {
    setState(snapshot.val());
  });
  return () => unsubscribe();
}, [dependencies]);
```

### 4. Persisted State (localStorage + Firebase)

State that needs to survive page reloads:

- **Game progress**: Saved to localStorage and Firebase
- **Solved states**: Server-first with conflict resolution
- **Streaks**: Server-first with local fallback

**Pattern (from `singlePlayerStore.js`):**
1. Try to load from Firebase (server-first)
2. Fall back to localStorage if server unavailable
3. Resolve conflicts using timestamps
4. Sync newer state to the other location

## State Flow

### Single Player Game Flow

```
User Input → useState (currentGuess)
    ↓
Keyboard Handler → currentGuessRef (latest value)
    ↓
submitGuess → processGuess → setBoards (useState)
    ↓
saveGameState → localStorage + Firebase (with retry)
```

### Multiplayer Game Flow

```
User Input → useState (currentGuess)
    ↓
submitGuess → Firebase (transaction)
    ↓
Firebase Listener → setGameState (useState)
    ↓
useEffect → sync to local boards (useState)
```

## Ref Usage Guidelines

### When to Use Refs

1. **Avoiding re-renders**: Values that don't need to trigger UI updates
   - Example: `committedRef`, `endingGameRef`

2. **Stale closure prevention**: Accessing latest value in callbacks
   - Example: `currentGuessRef` in keyboard handlers

3. **Effect coordination**: Flags to prevent effect loops
   - Example: `popupClosedRef`, `shouldShowPopupAfterFlipRef`

4. **DOM references**: Actual DOM element references
   - Example: `boardRefs`, `inputRef`

### When NOT to Use Refs

1. **Values that affect UI**: Use `useState`
2. **Values needed in render**: Use `useState`
3. **Values that trigger effects**: Use `useState`

## State Synchronization

The `StateSync` class handles:
- Conflict resolution (timestamp-based)
- Offline queuing
- Retry logic with exponential backoff
- Connection status monitoring

**Usage:**
```javascript
import { defaultStateSync } from '../lib/stateSync';

// Queue an update for offline
stateSync.queueUpdate('gameState', async () => {
  await saveToFirebase(state);
});

// Sync local and server state
const mergedState = await stateSync.sync('key', localState, serverState);
```

## Best Practices

1. **Keep state local when possible**: Don't lift state unnecessarily
2. **Use refs sparingly**: Only when avoiding re-renders or preventing stale closures
3. **Document ref usage**: Add comments explaining why a ref is used
4. **Sync state properly**: Use StateSync for persisted state
5. **Handle offline**: Queue updates when offline, process when online
6. **Resolve conflicts**: Always use timestamps for conflict resolution

## Migration Path

If migrating to a state management library (Zustand/Jotai):

1. Identify shared state that's passed through props
2. Move to global store
3. Keep local state local
4. Use selectors for derived state
5. Maintain Firebase listeners for server state
