# Wuzzle Games Testing Plan

This document exhaustively lists Wuzzle Games features and behaviours to be tested.

- **Unit tests (UT)** cover pure logic (no network or browser APIs) and may run with no external services.
- **End-to-end tests (E2E)** and **system tests** must exercise **real behaviour with a configured Firebase + EmailJS test environment** and real browsers (no mocking of auth, database, or email).
- **Regression tests (RT)** are the critical scenarios from the list below that must be run on every release.

Where earlier versions of this plan mentioned "integration" tests with mocked Firebase, those are now promoted to E2E/system tests against the real staging environment.

---

## 1. Authentication & Account Management

### 1.1 Sign-in / Sign-up (Google & Email-Password)

**Unit tests (pure code)**
- `useAuth` hook (logic only, with Firebase APIs stubbed in-memory where needed):
  - `signUpWithEmail` rejects empty email/password and forwards Firebase errors.
  - `updateUsername` validates non-empty username and updates local state.

**E2E/system tests (real Firebase auth, no mocks)**
- Google sign-in flow (requires a test Google account):
  - Clicking **Continue with Google** opens Google OAuth, allows selecting the test account, returns to app with user shown as signed in (header updates, hamburger menu shows authenticated options).
  - When signing in with a Google account whose email already has an email/password account, the app shows the friendly guidance message from `useAuth` ("Please sign in with email and password, then link Google from your Profile.") and does not log user in.
- Email/password sign-up:
  - Using a **new test email address**, submit sign-up form.
  - Verify: account is created, verification email is sent (see mailbox), `onSignUpComplete` fires (Profile verify-email modal appears with that email), user is considered unverified (`isVerifiedUser === false`).
- Email/password sign-in:
  - Using an existing, **already-registered test email/password**, sign in successfully and see Home with signed-in header state.
  - Using invalid credentials, see appropriate error in `AuthModal` and remain signed out.
- Sign-out:
  - Clicking **Sign Out** in header logs user out; header changes to **Sign In**, hamburger menu loses Profile/Friends/Challenges/1v1 options that require auth.

**RT**
- Google sign-in for a brand-new Google email succeeds and user is marked verified.
- Google sign-in for an email that already has an email/password account triggers the special handling path and leaves app state consistent (still signed out).
- After sign-out, navigating directly to `/profile` or opening 1v1/Friends/Challenges bounces the user back or shows the correct "sign in/verify" prompts.

**Regression focus (RT)**
- Google sign-in when email/password account already exists shows the correct guidance message and does not leave app in an inconsistent state.
- After sign-out, no authenticated-only UI (Profile, Friends, Challenges, 1v1) is accessible.

### 1.2 Profile Page & Username Management

From requirements and code (`Profile.jsx`):
- Email is displayed as non-editable, with a `(verified/unverified)` badge.
- Username is editable, must be non-empty, and saved via `updateUsername`.
- Cancel button should not save changes and should navigate to Home.
- Resend verification email is available for unverified password-based accounts.
- Google account linking is configurable from Profile, with distinct states (Not linked / Linked / Already linked).

**UT (pure logic)**
- `useAuth.updateUsername` and `useAuth.linkGoogleAccount` surface errors and update internal state as expected.

**E2E/system (real Firebase)**
- Profile access:
  - Signed-out user visiting `/profile` is redirected to `/`.
  - Signed-in user visiting `/profile` sees email, verification status, and username field populated from `displayName`.
- Username save/cancel:
  - Change username to a new value, click **Save Changes**, see success message and confirm header text and Friends/1v1 displays reflect the new name.
  - Change username but click **Cancel**; verify redirected to Home and revisiting Profile shows original username (no change in Firebase `displayName`).
  - Attempt saving an empty username shows "Username cannot be empty" and does not call `updateUsername`.
- Email verification:
  - With an unverified email/password account, click **Resend link**; check the mailbox for a new verification email and see success message.
  - With a verified account or Google-only account, **Resend link** is not shown.
- Google link/unlink states:
  - For a password-only account, Profile shows "Google account: Not linked" and a **Connect Google account** button.
  - Clicking **Connect Google account** launches Google OAuth; on success, Profile shows "Linked" and `isVerifiedUser` becomes true.
  - If Google is already linked, subsequent attempts show "Google account is already linked." message.

**RT**
- Username edits persist across sessions and are used consistently wherever the player name appears (leaderboard entries created after the change, 1v1 names, friend lists).
- Verifying email or linking Google instantly unlocks Friends/Challenges/1v1 features (no full reload required).

---

## 2. Global Navigation & Header

### 2.1 Site Header

**Unit / Integration tests**
- Home button navigates to `/` from Home, Game, Profile, Leaderboard, 1v1.
- Reset timer label shows countdown and updates via `useDailyResetTimer`.
- Leaderboard button navigates to `/leaderboard`.
- Signed-in vs signed-out header:
  - Signed-out: **Sign In** button visible.
  - Signed-in: **Sign Out** button visible and username banner with **Change username** link shown.

**E2E tests**
- From any page, clicking home icon returns user to Home page.

**RT**
- Reset timer continues working after navigation and sign-in/sign-out cycles.

### 2.2 Hamburger Menu & Menus

From requirements:
- When signed in, has 5 options.
- When signed out, has 2 options.
- Home redirects home.
- Feedback opens feedback popup.
- Profile, Friends, Challenges open correct screens.

**Integration tests**
- Signed-out hamburger menu:
  - Options: Home, Feedback only.
- Signed-in hamburger menu:
  - Options: Home, Profile, Friends, Challenges, Feedback.
- Navigation behavior:
  - **Home** → `/`.
  - **Profile** → `/profile`.
  - **Friends** → opens Friends modal.
  - **Challenges** → opens Challenges modal.
  - **Feedback** → opens Feedback modal.
- Friends and Challenges entries respect `isVerifiedUser` flag (show verification alerts when not verified).

**E2E tests**
- Open hamburger menu on small and large viewports; options remain clickable and modals can be opened/closed.

**RT**
- Menu options remain correct when authentication state changes without full reload.

---

## 3. Home, Pages & Common UI

### 3.1 Home Page

From requirements:
- Daily dropdown 1–32.

**Unit / Integration tests**
- Daily boards dropdown (`#dailyBoards`):
  - Displays values 1–32.
  - Changing selection updates `dailyBoards` state.
- Daily buttons:
  - **Play daily** → `/game?mode=daily&boards=n&speedrun=false`.
  - **Speedrun daily** → `/game?mode=daily&boards=n&speedrun=true`.
- Reset daily guesses:
  - Clicking reset clears `makeDailyKey` and `makeSolvedKey` entries for current board count and both speedrun/non-speedrun.
- Marathon buttons:
  - **Play marathon** → `/game?mode=marathon&speedrun=false`.
  - **Speedrun marathon** → `/game?mode=marathon&speedrun=true`.
- Reset marathon guesses clears marathon game key, meta, and solved keys for all stages (speedrun + standard) and resets stage indices.
- 1v1 panel:
  - "Play 1v1" opens `OneVOneModal`.

**E2E tests**
- Verify navigation from Home to each game mode and back via header home.

**RT**
- Reset actions actually clear progress; restarting a mode starts fresh boards.

### 3.2 Profile Page (Behavior Recap)

Covered in 1.2; ensure profile is only accessible when signed in; visiting `/profile` signed-out redirects or shows appropriate message.

### 3.3 Leaderboard Page

From requirements:
- Can select mode from dropdown – daily or marathon.
- If daily, can select boards; if marathon, no boards option.
- Home takes user to home page.

**Unit tests (pure)**
- `useLeaderboard` internal sorting and filtering logic (`score` desc, `timeMs` asc, daily reset by timestamp).
- `formatElapsed` for leaderboard time formatting.

**E2E/system (real Realtime Database)**
- Mode and boards filters:
  - Switch between **Daily** and **Marathon**; confirm marathon hides Boards filter, daily shows **All** + 1–32.
  - Selecting a specific board count in Daily filters entries down to that `numBoards`.
- Data population:
  - After completing a Daily Speedrun and Marathon Speedrun game with a test user, confirm entries appear in the corresponding mode, with correct name, `numBoards`, `timeMs`, and `score`.
  - Confirm that after local midnight (start of new local day), previous-day entries are no longer shown (leaderboard resets by day).
- Error handling:
  - Temporarily misconfigure database permissions in test environment; verify that the leaderboard shows an error banner rather than blank page.

**RT**
- Leaderboard never crashes for empty data sets or permission issues; always displays either entries, "No entries yet" text, or an error banner.

---

## 4. Game Modes – Single Player

The `Game` component handles multiple modes:
- Daily standard (`mode=daily&speedrun=false`).
- Daily speedrun (`mode=daily&speedrun=true`).
- Marathon standard (`mode=marathon&speedrun=false`).
- Marathon speedrun (`mode=marathon&speedrun=true`).

Shared requirements include:
- Correct number of boards and guesses.
- On-screen keyboard typing letters.
- Persistence of guesses after leaving/returning.
- Flip animations and end-game popups.

### 4.1 Common Game Behaviors

**Unit tests (pure)**
- `wordle` utilities:
  - `scoreGuess`, `buildLetterMapFromGuesses`, `getMaxTurns`, `getTurnsUsed`, `formatElapsed`, `colorForStatus`, `colorForMiniCell`.
- `gameUtils`:
  - `calculateNonSpeedrunScore`, `calculateSpeedrunScore`, `generateShareText` (structure of text, counts, emoji layout).
- `dailyWords` & `persist`:
  - `selectDailyWords` and `getCurrentDateString` produce consistent keys.
  - `loadJSON`/`saveJSON`/keys functions produce and retrieve correct keys for daily/marathon/solved.
- Utility hooks with no external I/O (`useTimedMessage`, `useStageTimer`).

**E2E/system (real browser + localStorage)**
- Query param handling in `/game` route:
  - `mode=daily&boards=n&speedrun={true|false}` sets `numBoards` to `n`, and `maxTurns` correspond to `getMaxTurns(n)` in standard mode, unlimited in speedrun.
  - `mode=marathon` starts at the board count indicated by saved `marathonMetaKey` index; first visit starts at 1 board.
  - Invalid or missing params gracefully default to a safe configuration (1 board, daily standard) without crashing.
- Keyboard handling (`Keyboard` + `useKeyboard`):
  - On-screen keyboard adds letters, backspace removes, Enter submits guesses.
  - Physical keyboard is ignored when typing in inputs/textarea (e.g., Feedback modal) or when `isInputBlocked` (popups, not your turn in 1v1).
- Flip animation and tile behaviour:
  - Each submitted guess row plays a flip animation exactly once; solved rows for previously-solved games replay flip once on load (daily & marathon revisit).
- Share behaviour (`useShare`):
  - On desktop: clicking **Share** in `GamePopup` copies a non-empty share string to clipboard and shows "Copied to clipboard!" toast.
  - On mobile/test environment with `navigator.share`: share uses native share sheet; if user cancels, no error toast is shown.
- Persistence:
  - Leaving a game mid-progress and returning via URL (same mode/boards) restores guesses and board states from localStorage.

**RT**
- Flip animations always complete before any win/lose popup or out-of-guesses popup appears.
- No double-submission: game input is ignored while a flip is in progress or while popups are visible.

### 4.2 Daily – Standard

From requirements:
- Clicking daily with n boards → game page with n boards.
- Correct boards and guesses.
- Persistence of guesses.
- Win popup before max turns with score and share.
- If not guessed in max turns, show popup to continue or exit.
- Continue allows unlimited guesses; exit shows end-game popup.

**Integration tests**
- Non-speedrun daily:
  - `maxTurns` based on `numBoards`.
  - When all boards solved before `maxTurns`, `GamePopup` appears with score, solutions, share, close, home & (if applicable) next stage controls.
  - If all boards are solved or dead but not all solved, `OutOfGuessesPopup` appears with Continue/Exit.
  - Continue sets `isUnlimited=true` and resets `isDead` on unsolved boards only.

**E2E tests**
- Simulate playing daily until win; verify score and solutions text.
- Simulate losing in max turns, choose Continue and then successfully solve and receive final popup.

**RT**
- Daily progress and solved state reset correctly via Home page reset button.

### 4.3 Daily – Speedrun

From requirements:
- Unlimited guesses.
- Timer resumes from last-guess time when returning to page.
- Win popup shows score, solutions, share, close, home, next stage buttons.
- Solved boards reopened should flip letters then show popup.

**Integration tests**
- Speedrun daily timer:
  - Starts when stage starts and persists across navigation using `stageStartRef`/saved state.
  - When solved state is loaded, `savedSolvedStateRef` affects `stageElapsedMs`/`popupTotalMs` and prevents timer from continuing.
- End-of-game popup:
  - Displays stage time and (for marathon speedrun) cumulative time.
  - `generateShareText` includes time and board count.

**E2E tests**
- Solve daily speedrun board(s); leave page; re-open same mode/boards on same date and see solved boards with flip animation and popup, not a new game.

**RT**
- Timer never double-counts or resets incorrectly after reload.

### 4.4 Marathon – Standard

From requirements:
- Clicking marathon starts with 1 board.
- Show correct boards and guesses per stage.
- After guess, returning preserves guesses.
- After each solved stage, show "Stage cleared" bar and Next board button above keyboard.
- Multi-board behavior (guesses only applied to selected or unsolved boards; solved boards labeled "solved").
- When all boards solved in marathon, final popup with score, solutions, share, close, home.

**Integration tests**
- Stage progression:
  - `NextStageBar` appears only when all boards solved and more stages exist.
  - Clicking Next navigates and updates marathon meta index; solves/guesses persist correctly between stages.
- Multi-board specifics:
  - Only unsolved boards accept new guesses; solved boards ignore input and do not flip.
  - Selected board’s letter map is used for keyboard coloring; when no board selected, default aggregated colors used.
  - Solved badge appears on solved boards.

**E2E tests**
- Complete all marathon stages and verify final popup and that returning to marathon starts at correct stage unless reset.

**RT**
- Marathon progression state (`marathonMetaKey`) survives app reloads and respects reset actions.

### 4.5 Marathon – Speedrun

From requirements:
- Always starts at 1 board.
- Unlimited guesses.
- If returning to marathon speedrun, timer continues from last stage time.

**Integration tests**
- `commitStageIfNeeded` and marathon speedrun meta:
  - When a stage is solved, time recorded per boards count and cumulative time updated.
  - `displayTotalMs` and `popupTotalMs` reflect committed plus current stage correctly.

**E2E tests**
- Play through multiple marathon speedrun stages, reload mid-run, and confirm cumulative time is preserved.

**RT**
- Submitting marathon speedrun scores writes correct `numBoards` and `timeMs` to leaderboard and only when final stage is complete.

---

## 5. 1v1 Mode & Social Features (Unit Tests with Mocks)

### 5.1 1v1 Entry & Configuration (OneVOneModal)

- With `useAuth` mocked to `{ user: null }`, OneVOneModal shows sign-in prompt and clicking **Sign In** toggles `AuthModal`.
- With `user` present but `isVerifiedUser=false`, modal shows verification prompt and **Go to Profile** calls `navigate("/profile")`.
- With `user` present and `isVerifiedUser=true`:
  - Clicking **Host 1v1** toggles `showConfig` and renders configuration modal with boards 1–32 and speedrun checkbox.
  - Changing `numBoards` and `isSpeedrun` and clicking **Continue** calls `navigate` with `/game?mode=1v1&host=true&speedrun=<value>&boards=<n>`.
  - Joining:
    - Less than 6 digits sets `codeError` and **Join 1v1** is disabled.
    - Exactly 6 digits and click **Join 1v1** calls `navigate` with `/game?mode=1v1&code=<code>`.

### 5.2 1v1 Waiting Room & Start (OneVOneWaitingRoom)

- With a mocked `gameState` object:
  - When `status='waiting'` and no `guestName`, component shows gameCode box, "Waiting for opponent to join..." and **Share Code** (when `isHost=true`); clicking **Share Code** calls `onShareCode(gameCode)`.
  - When `status='waiting'` and `guestName` present:
    - Renders two player rows with correct names and Ready/Not Ready badges.
    - `currentUserReady`/`otherPlayerReady` derived correctly for host vs guest.
    - Clicking **Ready** calls `onReady()`; when already ready and both ready, **Not Ready** button is disabled and text changes to "Both Ready - Starting...".
    - When `bothReady` and `isHost`, **Start Game** button is visible and calls `onStartGame`.
  - When `guestName` present and `onAddFriend` provided:
    - Button label is either "Add {otherPlayerName} as Friend" or "Friend request sent" based on `friendRequestSent`.
    - Clicking add-friend when not sent calls `onAddFriend(otherPlayerName)` and is disabled when `friendRequestSent=true`.

### 5.3 1v1 Game Logic (`useOneVOneGame`, 1v1 parts of `Game.jsx`)

- With Firebase Database mocked:
  - `createGame` writes a new `onevone/<code>` node with host info and returns `code`.
  - `joinGame(code)` updates `guestId`/`guestName` fields; errors when game not found or already full.
  - `startGame` sets status to `playing`, seeds `solution(s)` and resets guesses/turns.
  - `submitGuess` appends guesses and color arrays to `hostGuesses` or `guestGuesses` appropriately and updates per-player times in speedrun.
  - `switchTurn` toggles `currentTurn` between `host` and `guest`.
  - `setWinner` sets `winner` and `status='finished'`.
  - `requestRematch` toggles `hostRematch`/`guestRematch` flags.
  - `setFriendRequestStatus` updates `friendRequestStatus` field (`pending`/`declined`).
- 1v1-specific logic in `Game.jsx` (using mocked `oneVOneGame.gameState`):
  - `isInputBlocked` returns true when it is not the player's turn in non-speedrun games.
  - When both players finished (all boards solved or out of guesses), `setWinner` is called once with the correct winner or `null` for tie (based on guesses/time).
  - When host and guest both set rematch flags, host auto-generates new solutions and resets boards while preserving game code.

### 5.4 Friends & Friend Requests (`useAuth`, `FriendsModal`)

- `useAuth` friend API unit tests (with mocked database):
  - `sendFriendRequest(friendId)` writes under `users/<friendId>/friendRequests/<currentUserUid>` with `fromName` and `sentAt`.
  - `acceptFriendRequest(fromUserId, fromUserName)` adds mutual `friends` entries for both users and removes the request; local state arrays (`friendRequests`, `friends`) are updated accordingly.
  - `declineFriendRequest(fromUserId, gameCode, setFriendStatusIn1v1)` removes the request and calls `setFriendStatusIn1v1(gameCode, 'declined')` when provided.
  - `removeFriend(friendId)` removes both sides of friendship from `users/<uid>/friends` and `users/<friendId>/friends`.
- `FriendsModal` component tests:
  - When `isVerifiedUser=false`, shows the "Verify your account" notice and no friends/requests UI.
  - When verified:
    - Renders Friend Requests section when `friendRequests` non-empty, with **Accept**/**Decline** buttons wired to `acceptFriendRequest`/`declineFriendRequest`.
    - Renders Friends section with each friend row having **Challenge** and **Remove**; **Remove** calls `removeFriend`.
    - Challenge configuration modal uses `ONE_V_ONE_BOARD_OPTIONS` and speedrun checkbox; clicking **Challenge** calls mocked `oneVOneHost.createGame` and `sendChallenge` with correct parameters.

### 5.5 Challenges (Hamburger Challenges Modal)

- With `incomingChallenges` mocked in `useAuth`:
  - Modal title and empty state correctly rendered when list is empty.
  - For each challenge entry, shows sender name, boards count, and "Speedrun"/"Standard" label based on `speedrun`.
  - Clicking **Accept** calls `acceptChallenge(id)`, receives data with `{ boards, speedrun, gameCode }`, and calls `navigate("/game?mode=1v1&code=...&speedrun=...&boards=...")`.
  - Clicking **Dismiss** calls `dismissChallenge(id, gameCode)` and removes the entry from UI state.

### 5.2 Friends & Friend Requests

From requirements:
- When a user sends friend request it is populated in the friends popup of the other user.
- If the other user accepts, they are added to each others friend list.
- If the other user declines, simply remove the request.

**Unit tests**
- `useAuth` friend APIs:
  - `sendFriendRequest` writes request to recipient; errors if not verified.
  - `acceptFriendRequest` creates mutual friend entries and removes request node and from local state.
  - `declineFriendRequest` removes request and optionally updates friend status in 1v1 (for in-game decline).
  - `removeFriend` removes both sides of friendship.

**Integration tests**
- Friends modal:
  - Shows friend requests list with Accept/Decline and updates counts in real time from Realtime Database.
  - Accept adds entry to Friends list UI; decline removes request and does not add friend.
  - Friends list supports Remove and Challenge actions per friend.

**E2E tests**
- User A sends friend request to User B from 1v1 or other flows; User B sees request in Friends modal, accepts; both now list each other in friends.

**RT**
- Friend requests cannot be sent by unverified accounts; error message is shown and no DB updates occur.

### 5.3 Challenges (1v1 Invitations)

**Unit tests**
- `useAuth.sendChallenge`, `acceptChallenge`, `dismissChallenge`:
  - Prevent duplicate pending challenges in either direction.
  - Accept returns challenge data and deletes it.
  - Dismiss deletes challenge and, when `gameCode` passed, marks 1v1 game as cancelled.

**Integration tests**
- Friends modal – Challenge flow:
  - Host selects Boards and Speedrun options; challenge created for friend; friend sees entry in Challenges modal with correct params.
- Hamburger menu – Challenges modal:
  - Accept navigates to 1v1 waiting room with correct `/game?mode=1v1&code=...&boards=...&speedrun=...`.
  - Dismiss removes challenge from list and cancels corresponding game when applicable.

**E2E tests**
- Full challenge lifecycle: send → accept → play → rematch → dismiss new challenge.

**RT**
- No more than one pending challenge may exist between two users; attempts to create more show toast without creating new DB entries.

---

## 6. Feedback & EmailJS Integration (Unit Tests with Mocks)

From requirements and `FeedbackModal`:
- Feedback modal is reachable from SiteHeader and from hamburger **Feedback** option.
- Feedback uses EmailJS to send anonymous feedback emails.

**Unit tests with mocks (mock `emailjs.send`, `EMAILJS_CONFIG`)**
- Modal open/close behaviour:
  - `isOpen=true` renders modal with title, description, and textarea; `isOpen=false` renders nothing.
  - Clicking **Cancel** clears `message` state and `submitStatus` and calls `onRequestClose`.
- Validation:
  - Submitting with empty/whitespace-only message is prevented and does not call `emailjs.send`.
- Successful submission:
  - With `isEmailJSConfigured()` mocked to `true` and `emailjs.send` resolved, form submit:
    - Calls `emailjs.send` with `SERVICE_ID`, `TEMPLATE_ID`, and payload `{ message, to_email, subject }`.
    - Sets `submitStatus='success'`, clears `message`, and schedules a call to `onRequestClose` via `setTimeout`.
- Configuration error path:
  - With `isEmailJSConfigured()` mocked to `false`, submitting sets `submitStatus='error'` and does not call `emailjs.send`.
- EmailJS failure path:
  - With `emailjs.send` mocked to reject, component logs error (can spy `console.error`) and sets `submitStatus='error'`, leaving `message` intact.

---

## 7. Persistence, Edge Cases & Cross-Cutting Concerns

### 7.1 Local Storage Persistence

**Integration tests**
- In-progress daily and marathon games save state on navigation and reload from `loadJSON` keys.
- Solved-state keys created only when all boards solved (not when partially solved and out-of-guesses in non-speedrun).

**E2E tests**
- Start game, make guesses, hard refresh browser, confirm game state restored correctly.

**RT**
- Persistence keys are backwards compatible when minor game changes ship (e.g., adding new fields to saved state).

### 7.2 Error Handling & Guards

**Unit / Integration tests**
- `useAuth` and 1v1 hooks do not throw on missing/invalid data; they set error states instead.
- Game route:
  - Invalid mode or malformed query params result in safe defaults (e.g., 1 board, daily mode) instead of crashes.
- 1v1:
  - Joining non-existent or closed game shows error and offers navigation back home.

**RT**
- App never shows a blank screen for bad URLs or Firebase failures; there is always a visible message.

---

## 8. Test Automation Strategy (High-Level)

- **Unit tests (UT)**: Run locally and in CI with Jest (or similar) for pure functions and hooks that do not require network or browser APIs.
- **End-to-end/system tests (E2E)**: Run with a real browser automation tool (e.g., Playwright or Cypress) against a **staging Firebase project and EmailJS account**:
  - Use dedicated test users and test email inboxes.
  - Run critical 1v1/friends/challenges scenarios with two simultaneous browser sessions.
  - Cover sign-in/sign-out, profile management, daily/marathon (standard & speedrun), leaderboard, feedback, friends & challenges, and full 1v1 flows including rematch.
- **Regression suite (RT)**: Curated subset of E2E scenarios prioritized for each release:
  - Auth flows (Google + email/password, link Google, resend verification).
  - Daily/Marathon (standard & speedrun) including persistence and leaderboard submission.
  - 1v1 challenge flow (send/accept/dismiss, play, determine winner, rematch).
  - Friends add/remove and challenge de-duplication.
  - Feedback submission and error handling.
  - Basic navigation and hamburger menu correctness.

---

## 9. Test Data & Environment Requirements

To run the above tests **without mocks**, the following test data and configuration are required from you:

### 9.1 Firebase Staging Project
- A dedicated Firebase project configured as described in `README.md` and `firebase.js`, with:
  - **Authentication**:
    - Google provider enabled.
    - Email/Password provider enabled.
  - **Realtime Database**:
    - Database URL set and wired via `VITE_FIREBASE_DATABASE_URL`.
    - Rules matching the ones in `README.md` (for `users`, `onevone`, and `leaderboard`).
  - **Authorized domains**:
    - Local dev host (e.g., `localhost:5173`).
    - Staging domain (if any).
- A `.env` (or equivalent) with valid values for:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_DATABASE_URL`

### 9.2 Test User Accounts
Provide or prepare the following accounts for automated tests:

1. **Google test account A** (e.g., `wuzzlegames.test.a@gmail.com`)
   - Used for: Google sign-in, linking to existing email/password account, 1v1 host.
2. **Google test account B** (e.g., `wuzzlegames.test.b@gmail.com`)
   - Used for: Google sign-in as opponent, friend and challenge flows, 1v1 guest.
3. **Email/password test account – existing verified** (e.g., `bw.email.verified+1@example.com`)
   - Steps: sign up once, verify via email.
   - Used for: email sign-in, linking Google from Profile, playing all modes as a verified user.
4. **Email/password test account – unverified** (e.g., `bw.email.unverified+1@example.com`)
   - Steps: sign up, but do **not** click verification link.
   - Used for: testing restricted Friends/Challenges/1v1 access, Profile "Resend link".
5. **Email/password test account – to be created by tests**
   - A fresh email that automated tests can own and sign up with repeatedly (or use time-based suffix).

For each, please confirm:
- Email address.
- Initial password (for email/password accounts).
- Whether the address is meant to be verified or kept unverified for test scenarios.

### 9.3 EmailJS Test Configuration
To fully exercise Feedback behaviour without mocks:
- A dedicated EmailJS account or service configured with:
  - **Service ID**.
  - **Template ID**.
  - **Public key**.
  - `TO_EMAIL` set to a test inbox you control.
  - `SUBJECT` as configured in `EMAILJS_CONFIG`.
- The corresponding values populated in `src/config/emailjs.js` (or environment) for the **staging environment**.

### 9.4 Browser & Device Targets
- At least one desktop browser (for clipboard-based share tests).
- At least one mobile-like environment (real device or emulator) where `navigator.share` is available, for native-sharing tests.
- Ability to run **two browser instances** (or profiles/devices) simultaneously for 1v1 and friend/challenge E2E scenarios.

### 9.5 Test Reset Utilities
For repeatable tests, we will rely on:
- The existing Home-page reset buttons:
  - "Reset today’s daily guesses".
  - "Reset today’s marathon guesses".
- Optional (if you choose to add later): scripts or manual steps to clear specific Firebase paths in the staging environment (`users`, `leaderboard`, `onevone`) when test data needs to be reset.

If you share concrete test emails, Google accounts, and the staging Firebase/EmailJS credentials (or placeholders), the above plan can be translated directly into automated E2E specs without mocking any backend behaviour.
