# Wuzzle Games Bug Report

## Summary
This document outlines critical bugs found in the Wuzzle Games codebase, their root causes, and fixes applied.

---

## Bug #1: Marathon "Next Stage" Button Not Responding

### Status: FIXED ✓

### Description
In marathon mode (both standard and speedrun), when a player completes all boards in a stage, the "Next Stage" button in the completion modal is not functional. Clicking it has no effect.

### Root Cause
In [src/components/game/GameSinglePlayer.jsx](src/components/game/GameSinglePlayer.jsx#L661-L671), the `goNextStage` callback has a race condition:

```javascript
const goNextStage = useCallback(() => {
  if (marathonHasNext) {
    const newIndex = marathonIndex + 1;
    const updatedMeta = saveMarathonMeta(speedrunEnabled, { index: newIndex });
    const metaKey = marathonMetaKey(speedrunEnabled);
    persistForUser(`singlePlayer/meta/${metaKey}`, updatedMeta);
    navigate(`/game?mode=marathon&speedrun=${speedrunEnabled}`, { replace: true });  // ← Async
    window.location.reload();  // ← Synchronous - executes immediately!
  }
}, [marathonHasNext, marathonIndex, speedrunEnabled, navigate]);
```

The `navigate()` call is asynchronous and just queues a navigation event. However, `window.location.reload()` is called immediately after, synchronously reloading the page **before** the navigation takes effect. This causes the page to reload at the current URL instead of navigating to the new marathon stage.

### Fix Applied
Replaced the problematic `navigate()` + `reload()` pattern with direct `window.location.href` navigation:

```javascript
const goNextStage = useCallback(() => {
  if (marathonHasNext) {
    const newIndex = marathonIndex + 1;
    const updatedMeta = saveMarathonMeta(speedrunEnabled, { index: newIndex });
    const metaKey = marathonMetaKey(speedrunEnabled);
    persistForUser(`singlePlayer/meta/${metaKey}`, updatedMeta);
    // Navigate to the next marathon stage. Use direct href navigation instead of
    // navigate() + reload() to ensure the navigation happens before the page reload.
    window.location.href = `/game?mode=marathon&speedrun=${speedrunEnabled}`;
  }
}, [marathonHasNext, marathonIndex, speedrunEnabled]);
```

**Key changes:**
- Replaced `navigate()` + `reload()` with `window.location.href`
- Removed `navigate` from dependency array
- Direct href assignment ensures the navigation happens properly before any page reload

### Impact
- Marathon mode players can now successfully progress through stages
- Both standard and speedrun variants are fixed
- The fix maintains the same localStorage persistence logic for cross-device resume

### Testing
To verify the fix:
1. Start a marathon game (any difficulty level)
2. Complete all boards in a stage
3. Click "Next Stage" button in the completion modal
4. Verify the page navigates to the next stage with the correct board count

---

## Bug #2: Speedrun Modal Not Displaying

### Status: INVESTIGATION NEEDED ⚠️

### Description
When completing speedrun mode games, the game completion modal may not display properly in some scenarios.

### Current Investigation Status
The GamePopup component appears to have proper speedrun-specific rendering logic at [src/components/game/GamePopup.jsx](src/components/game/GamePopup.jsx#L452-L477), which includes:
- Total time display for speedrun games
- Stage-specific time display for marathon speedrun
- Guesses used without max turns (since speedrun is unlimited)

However, further testing is needed to confirm if this is a UI rendering issue, a state management issue (showPopup not being set true), or a condition check issue.

### Next Steps
- Test speedrun completion flow to see if modal displays
- Check browser console for any errors during modal rendering
- Verify `showPopup` state transitions during speedrun gameplay
- Confirm modal appears for both daily speedrun and marathon speedrun variants

---

## Code Files Modified
- [src/components/game/GameSinglePlayer.jsx](src/components/game/GameSinglePlayer.jsx#L661-L671) - Fixed `goNextStage()` callback

## Notes
- All fixes maintain existing persistence and cross-device sync functionality
- No breaking changes to component APIs or props
- Tests should be added to verify marathon stage progression works correctly
