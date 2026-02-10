# Site Color Inventory – Wuzzle Games

A complete inventory of every color used across the site (from CSS files and inline styles in JSX), grouped by color value, with the item/element that uses it. Each hex has a visual swatch next to it.

---

## By color value

### **#121213** <span style="display:inline-block;width:14px;height:14px;background:#121213;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#121213"></span> (main dark background)

1. **Game root** – `.gameRoot` background ([Game.css](src/Game.css))
2. **Home root** – `.homeRoot` background ([Home.css](src/Home.css))
3. **Select/inputs** – `.select`, `.profileInput`, `.profileValue` (placeholder context), `.waitingRoomSelect` background ([Home.css](src/Home.css), [Profile.css](src/Profile.css), [MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))
4. **Loading container** – `.loadingContainer` background ([Game.css](src/Game.css))
5. **Stats page** – `.stats-page` background ([AdvancedStats.css](src/AdvancedStats.css))
6. **Profile root** – `.profileRoot` background ([Profile.css](src/Profile.css))
7. **How to play root** – `.howToPlayRoot` background ([HowToPlay.css](src/HowToPlay.css))
8. **FAQ root** – `.faqRoot` background ([Faq.css](src/Faq.css))
9. **Leaderboard root** – `.leaderboardRoot` background ([Leaderboard.css](src/Leaderboard.css))
10. **SEO / landing** – `.seoRoot`, `.seoLandRoot` background ([SeoLanding.css](src/SeoLanding.css), [SeoLandingLayout.css](src/landing/SeoLandingLayout.css))
11. **Error boundary** – `.error-boundary` background ([ErrorBoundary.css](src/components/ErrorBoundary.css))
12. **Site header** – `backgroundColor` ([SiteHeader.jsx](src/components/SiteHeader.jsx))
13. **Modal inputs** – inline `background` in FriendsModal, NotificationsModal (inputs)
14. **Tile default (empty)** – `colorForMiniCell` default / empty cell in [wordle.js](src/lib/wordle.js); `bgForColor` default in [gameUtils.js](src/lib/gameUtils.js)

### **#1a1a1b** <span style="display:inline-block;width:14px;height:14px;background:#1a1a1b;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#1a1a1b"></span> (card/panel background)

1. **Board card** – `.boardCard` background ([Game.css](src/Game.css))
2. **Next stage bar** – (via rgba equivalent)
3. **Keyboard footer** – `.keyboardFooter` background ([Game.css](src/Game.css))
4. **Modal outline buttons** – `.btnOutline`; panels in FriendsModal, NotificationsModal
5. **Select/inputs** – `.filterSelect`, `.leaderboardTable`, `.waitingRoomCard`, `.waitingRoomSelect`, `.openRoomsItem` (with #2b2b2e), `.waitingRoomSettingsButton` context
6. **Color explanation** – `.colorExplanation` background ([HowToPlay.css](src/HowToPlay.css))
7. **Stats** – `.stats-mode-tab`, `.stats-chart-bar-track`, `.stats-time-by-guess-row`; `.stats-card` gradient start
8. **Profile** – `.profileCard` gradient; `.profileBadgeCard`, `.profileDetailsSummary` context; `.userCard-badgePopover`
9. **SEO card** – `.seoCard` background ([SeoLanding.css](src/SeoLanding.css))
10. **Multiplayer waiting room** – `.waitingRoomCard`, `.waitingRoomTitleInput`, `.waitingRoomSelect`
11. **AdvancedStatsModal** – card gradient and modal content background

### **#161617** <span style="display:inline-block;width:14px;height:14px;background:#161617;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#161617"></span>

1. **Profile card** – gradient end in `.profileCard` ([Profile.css](src/Profile.css))
2. **Stats card** – gradient end in `.stats-card` ([AdvancedStats.css](src/AdvancedStats.css))

### **#18181b** <span style="display:inline-block;width:14px;height:14px;background:#18181b;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#18181b"></span>

1. **Panel** – `.panel` background ([Home.css](src/Home.css))
2. **Mode row** – `.modeRow` background and gradient base
3. **How to play section** – `.howToPlaySection` background ([HowToPlay.css](src/HowToPlay.css))
4. **AdvancedStatsModal** – gradient segment (`.stats-card`-style)

### **#18181a** <span style="display:inline-block;width:14px;height:14px;background:#18181a;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#18181a"></span>

1. **Streak card** – radial gradient in `.streakCard` ([Profile.css](src/Profile.css))
2. **AdvancedStatsModal** – gradient segment

### **#1c1c1e** <span style="display:inline-block;width:14px;height:14px;background:#1c1c1e;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#1c1c1e"></span>

1. **UserCard** – gradient end in `.userCard` ([UserCard.css](src/components/UserCard.css))

### **#1f1f23** <span style="display:inline-block;width:14px;height:14px;background:#1f1f23;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#1f1f23"></span>

1. **Mode row hover** – `.modeRow:hover` ([Home.css](src/Home.css))

### **#232326** <span style="display:inline-block;width:14px;height:14px;background:#232326;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#232326"></span>

1. **UserCard** – gradient start in `.userCard` ([UserCard.css](src/components/UserCard.css))

### **#242426** <span style="display:inline-block;width:14px;height:14px;background:#242426;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#242426"></span>

1. **Leaderboard** – `.leaderboardRow:hover`, `.leaderboardHeaderRow` background ([Leaderboard.css](src/Leaderboard.css))

### **#272729** <span style="display:inline-block;width:14px;height:14px;background:#272729;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#272729"></span>

1. **Streak card** – radial gradient start in `.streakCard` ([Profile.css](src/Profile.css))

### **#2a2a2e** <span style="display:inline-block;width:14px;height:14px;background:#2a2a2e;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#2a2a2e"></span>

1. **UserCard hover** – gradient start when `.userCard-main.userCard--clickable:hover` ([UserCard.css](src/components/UserCard.css))

### **#2a2a2a** <span style="display:inline-block;width:14px;height:14px;background:#2a2a2a;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#2a2a2a"></span>

1. **Error boundary details** – `.error-boundary-details` background ([ErrorBoundary.css](src/components/ErrorBoundary.css))

### **#222224** <span style="display:inline-block;width:14px;height:14px;background:#222224;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#222224"></span>

1. **UserCard hover** – gradient end ([UserCard.css](src/components/UserCard.css))

### **#2b2b2e** <span style="display:inline-block;width:14px;height:14px;background:#2b2b2e;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#2b2b2e"></span> (borders, secondary panels)

1. **Home** – `.homeHeader` border; `.panel` border; `.modeRow` border; `.resetRow` border; `.homeIntroDetails` border
2. **Stats** – `.stats-section-stage` border; `.stats-section-title` border; `.stats-chart-bar-track` border; `.stats-time-by-guess-row` border; `.stats-card` border
3. **Profile** – `.profileHeader` border; `.streakCard` border
4. **Leaderboard** – (row styling)
5. **Modals** – FriendsModal, NotificationsModal, HamburgerMenu list items; OpenRoomsModal item; MultiplayerWaitingRoom invite item
6. **AdvancedStatsModal** – border and gradient

### **#2b1a1a** <span style="display:inline-block;width:14px;height:14px;background:#2b1a1a;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#2b1a1a"></span>

1. **Waiting room config error** – `.waitingRoomConfigError` background ([MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))

### **#3a3a3c** <span style="display:inline-block;width:14px;height:14px;background:#3a3a3c;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#3a3a3c"></span> (cell border, inputs, neutral gray)

1. **Cell** – `.cell` border ([Game.css](src/Game.css))
2. **Board card** – `.boardCard` border
3. **Next stage bar** – border
4. **Keyboard footer** – border
5. **Buttons** – `.btnOutline` border; `.homeBtnNeutral` background; outline buttons in modals
6. **Select/inputs** – `.select`, `.filterSelect`, `.profileValue`, `.profileInput`, `.profileDetails`, `.leaderboardTable` border; focus borders
7. **Stats** – `.stats-mode-tab` border; `.stats-card--locked` border; `.profileBadgeCard` border
8. **How to play** – `.colorExplanation` border
9. **Leaderboard** – `.leaderboardHeader` border; row borders; filter border
10. **UserCard** – popover border
11. **Waiting room** – card border; code card background; select border; player card background; invite toggle border; primary/secondary buttons border
12. **Open rooms** – item border
13. **Tile "grey" (absent)** – `colorForStatus('grey')`, `colorForMiniCell('grey')` in [wordle.js](src/lib/wordle.js); `bgForColor('grey')` in [gameUtils.js](src/lib/gameUtils.js); Board/Keyboard grey state
14. **GamePopup** – mini board solved/unsolved indicator
15. **Error boundary** – `.error-boundary-button-secondary` background
16. **AdvancedStatsModal** – locked card border; modal border

### **#4a4a4c** <span style="display:inline-block;width:14px;height:14px;background:#4a4a4c;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#4a4a4c"></span>

1. **Error boundary** – `.error-boundary-button-secondary:hover` ([ErrorBoundary.css](src/components/ErrorBoundary.css))

### **#565758** <span style="display:inline-block;width:14px;height:14px;background:#565758;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#565758"></span> (focus / hover border)

1. **Home** – `.select:focus`; `.modeRow:focus-visible` (via rgba); `.homeBtnOutline:hover` border
2. **Profile** – `.profileInput:focus` border
3. **Stats** – `.stats-mode-tab:hover` border; `.stats-card--clickable:hover` border
4. **Leaderboard** – `.filterSelect:hover` (and focus #6aaa64)
5. **Waiting room** – `.waitingRoomTitleInput:hover` border
6. **AdvancedStatsModal** – hover border

### **#818384** <span style="display:inline-block;width:14px;height:14px;background:#818384;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#818384"></span> (muted text, absent/default letter)

1. **Header sub** – `.headerSub`, `.headerStats` ([Game.css](src/Game.css))
2. **Status text** – `.statusText`
3. **Reset timer** – `.resetTimer` ([Home.css](src/Home.css))
4. **Stats** – back link, chart labels, bar pct, empty state, card subtitle/locked value
5. **Profile** – `.profileEmailStatus`, `.profileInput::placeholder`
6. **Leaderboard** – filter hover, loading/empty, rank
7. **Modals** – secondary text, timestamps, "Expired", empty states in FriendsModal, NotificationsModal, HamburgerMenu, SubscribeModal, AuthModal, MultiplayerRoomConfigModal
8. **Waiting room** – placeholder, code label/help, saving indicator, ready off, disabled friend button background
9. **Open rooms** – empty status
10. **Tile/keyboard default** – `colorForStatus` default for none/unknown in [wordle.js](src/lib/wordle.js); Keyboard.jsx base key color; GamePopup sent state
11. **CrossModeComparisonModal** – null value text
12. **AdvancedStatsModal** – locked value, subtitle

### **#9aa0a6** <span style="display:inline-block;width:14px;height:14px;background:#9aa0a6;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#9aa0a6"></span>

1. **Marathon meta hint** – `.metaHint` ([Home.css](src/Home.css))

### **#9ca3af** <span style="display:inline-block;width:14px;height:14px;background:#9ca3af;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle" title="#9ca3af"></span> (secondary text)

1. **Panel** – `.panelDesc`, `.modeRowDesc`, `.resetText`, `.homeIntroParagraph` / summary
2. **Stats** – subtitle, premium CTA, loading/error/empty, card label, chart label
3. **Profile** – `.streakLabel`, `.streakBest`, `.profileBadgeDesc`, `.profileBadgesEmpty`
4. **Waiting room** – title edit link, settings edit/summary
5. **Open rooms** – item expires
6. **AdvancedStatsModal** – labels, empty state

### **#d7dadc** <span style="display:inline-block;width:14px;height:14px;background:#d7dadc;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#d7dadc"></span> (body text, labels)

1. **Game** – `.headerSub`, `.headerStats`, `.statusText`, `.boardHeader`, `.nextStageText`, `.modalText`
2. **Home** – `.userInfo`, `.label`, `.metaLine`, `.profileDangerText`
3. **Stats** – back hover, mode tab, chart Y label, time-by-guess label
4. **Profile** – loading, field label, danger text
5. **How to play** – intro, paragraph, color item
6. **FAQ** – intro, paragraph
7. **Leaderboard** – filter label, header row
8. **Modals** – body text, labels in FriendsModal, NotificationsModal, HamburgerMenu
9. **Waiting room** – subtitle, settings label/summary
10. **Open rooms** – item meta
11. **SEO** – breadcrumb, intro, section text, footer
12. **Error boundary** – content p, details summary
13. **GamePopup** – secondary text
14. **Site header** – "Signed in as" and header text

### **#e4e4e7** <span style="display:inline-block;width:14px;height:14px;background:#e4e4e7;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#e4e4e7"></span>

1. **UserCard** – default text; badge popover item ([UserCard.css](src/components/UserCard.css))

### **#e5e7eb** <span style="display:inline-block;width:14px;height:14px;background:#e5e7eb;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#e5e7eb"></span>

1. **Panel title** – `.panelTitle` ([Home.css](src/Home.css))
2. **Mode row** – `.modeRowTitleRight`; `.homeIntroDetails` text
3. **NotificationToast** – text color ([NotificationToast.jsx](src/components/NotificationToast.jsx))

### **#e5d063** <span style="display:inline-block;width:14px;height:14px;background:#e5d063;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#e5d063"></span>

1. **UserCard earned icon hover** – `.userCard-earnedIcon:hover` ([UserCard.css](src/components/UserCard.css))

### **#ffffff** <span style="display:inline-block;width:14px;height:14px;background:#ffffff;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#ffffff"></span> (primary text, buttons)

1. **Game** – `.gameRoot` color; `.headerBtn`, `.keyBtn`, `.solutionChip`, `.boardCardSelected` context
2. **Home** – `.homeRoot` color; `.modeRowTitle`, `.metaStrong`; green/gold CTA labels
3. **Stats** – title, mode tab active, chart count, card value
4. **Profile** – input value, details summary, badge name
5. **How to play** – section title, paragraph strong
6. **Leaderboard** – name, time
7. **Modals** – headings, primary buttons, input text (FriendsModal, NotificationsModal, HamburgerMenu, SiteHeader)
8. **Waiting room** – title, input, player name, invite name, button text
9. **Open rooms** – title, item title
10. **SEO** – headings, summary
11. **Error boundary** – content h2
12. **GamePopup** – names, primary text
13. **MultiplayerGameView** – host label

### **#fff** <span style="display:inline-block;width:14px;height:14px;background:#fff;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#fff"></span>

1. **SeoLandingLayout** – `.seoLandCta` color ([SeoLandingLayout.css](src/landing/SeoLandingLayout.css))

---

## Greens

### **#22c55e** <span style="display:inline-block;width:14px;height:14px;background:#22c55e;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#22c55e"></span>

1. **Daily mode** – `.modeRow--daily` border and glow ([Home.css](src/Home.css))
2. **Home link** – `.homeLink` ([Home.css](src/Home.css))
3. **Home intro** – gradient in `.homeIntroDetails`

### **#538d4e** <span style="display:inline-block;width:14px;height:14px;background:#538d4e;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#538d4e"></span>

1. **SEO primary button** – `.seoBtn` ([SeoLanding.css](src/SeoLanding.css))
2. **Error boundary button** – `.error-boundary-button` ([ErrorBoundary.css](src/components/ErrorBoundary.css))
3. **SeoLandingLayout CTA** – `.seoLandCta` ([SeoLandingLayout.css](src/landing/SeoLandingLayout.css))

### **#5a9a54** <span style="display:inline-block;width:14px;height:14px;background:#5a9a54;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#5a9a54"></span>

1. **Home green CTA hover** – `.modeRow--green:hover .modeRowCtaLabel`, `.homeBtnGreen:hover` ([Home.css](src/Home.css))
2. **Stats chart bar** – gradient end in `.stats-chart-bar-fill` ([AdvancedStats.css](src/AdvancedStats.css))
3. **Waiting room** – `.waitingRoomPlayerFriendButton:hover` ([MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))
4. **ArchiveModal** – gradient end

### **#6aaa64** <span style="display:inline-block;width:14px;height:14px;background:#6aaa64;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#6aaa64"></span> (correct letter, primary green, success)

1. **Tile "green"** – `colorForStatus('green')`, `colorForMiniCell('green')` in [wordle.js](src/lib/wordle.js); Board.jsx, gameUtils.js
2. **Keyboard** – green key state (via wordle.js)
3. **Buttons** – `.btnGreen`, `.homeBtnGreen`, `.stats-subscribe-btn`, `.stats-mode-tab--active` border; FriendsModal/NotificationsModal/SiteHeader primary buttons
4. **Board card selected** – (yellow is #facc15; green used for "Play" CTA)
5. **Stats** – active tab border/bg; chart bar fill gradient start; subscribe button
6. **Profile** – success message, badge earned label/border
7. **Leaderboard** – filter focus, current row left border and "You" label
8. **Modals** – accept/send buttons, primary actions in FriendsModal, NotificationsModal, GamePopup, MultiplayerGameView, MultiplayerRoomConfigModal, FeedbackModal, SubscribeModal; AuthModal link
9. **Waiting room** – input focus border/glow; code value; primary button; friend button; ready on text
10. **NotificationToast** – border
11. **MultiplayerChat** – send button enabled, input focus border
12. **CommentsSection** – accent
13. **ArchiveModal** – gradient, border, icon stroke
14. **CrossModeComparisonModal** – best value, button gradient
15. **ErrorBoundary** – button hover
16. **FriendsModal.css** – `.friendsModalPrimaryButton` background

### **#7bb87b** <span style="display:inline-block;width:14px;height:14px;background:#7bb87b;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#7bb87b"></span>

1. **Stats** – `.stats-mode-tab--active:hover` border ([AdvancedStats.css](src/AdvancedStats.css))

### **#86efac** <span style="display:inline-block;width:14px;height:14px;background:#86efac;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#86efac"></span>

1. **UserCard badge** – `.userCard-badge` text ([UserCard.css](src/components/UserCard.css))

---

## Yellows / gold

### **#c9b458** <span style="display:inline-block;width:14px;height:14px;background:#c9b458;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#c9b458"></span> (present letter, gold accent)

1. **Tile "yellow"** – `colorForStatus('yellow')`, `colorForMiniCell('yellow')` in [wordle.js](src/lib/wordle.js); Board.jsx, gameUtils.js
2. **Keyboard** – yellow key state
3. **Buttons** – `.btnGold`, `.nextStageBtn`, `.homeBtnGold`, `.modeRow--gold .modeRowCtaLabel`; HamburgerMenu "How to play" button; GamePopup second place; OutOfGuessesPopup
4. **How to play** – `.marathonStageNumber`, `.marathonArrow`, list bullet; colorBox example
5. **Profile** – `.streakCurrent` (see #facc15); `.profileBadgeCardHeader .badgeIcon`
6. **BadgeIcon** – `.badgeIcon` color ([BadgeIcon.css](src/components/BadgeIcon.css))
7. **UserCard** – `.userCard-earnedIcon`, popover item badge icon ([UserCard.css](src/components/UserCard.css))
8. **Leaderboard** – (indirect)
9. **CrossModeComparisonModal** – worst value highlight
10. **Waiting room** – `.waitingRoomStartButton` ([MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))

### **#d4c267** <span style="display:inline-block;width:14px;height:14px;background:#d4c267;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#d4c267"></span>

1. **Home gold CTA hover** – `.modeRow--gold:hover .modeRowCtaLabel`, `.homeBtnGold:hover` ([Home.css](src/Home.css))

### **#eab308** <span style="display:inline-block;width:14px;height:14px;background:#eab308;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#eab308"></span>

1. **Marathon mode** – `.modeRow--marathon` border and glow ([Home.css](src/Home.css))

### **#facc15** <span style="display:inline-block;width:14px;height:14px;background:#facc15;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#facc15"></span>

1. **Board card selected** – `.boardCardSelected` border and box-shadow ([Game.css](src/Game.css))
2. **Mode row focus** – `.modeRow:focus-visible` box-shadow (rgba equivalent)
3. **Home button focus** – `.homeBtn:focus` box-shadow
4. **Profile** – `.streakCurrent` ([Profile.css](src/Profile.css))

---

## Reds

### **#ef4444** <span style="display:inline-block;width:14px;height:14px;background:#ef4444;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#ef4444"></span>

1. **PVP mode** – `.modeRow--pvp` border and glow ([Home.css](src/Home.css))
2. **Profile error message** – `.profileMessage.error` ([Profile.css](src/Profile.css))
3. **AdvancedStatsModal** – error state border (rgba)

### **#ef5350** <span style="display:inline-block;width:14px;height:14px;background:#ef5350;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#ef5350"></span>

1. **Sign out / destructive** – HamburgerMenu sign out, SiteHeader sign out ([HamburgerMenu.jsx](src/components/HamburgerMenu.jsx), [SiteHeader.jsx](src/components/SiteHeader.jsx))

### **#f06272** <span style="display:inline-block;width:14px;height:14px;background:#f06272;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#f06272"></span>

1. **Game message** – `.message` (error text) ([Game.css](src/Game.css))
2. **Leaderboard error** – `.leaderboardError` background ([Leaderboard.css](src/Leaderboard.css))

### **#f87171** <span style="display:inline-block;width:14px;height:14px;background:#f87171;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#f87171"></span>

1. **Stats error** – `.stats-error` ([AdvancedStats.css](src/AdvancedStats.css))

### **#ff5e5e** <span style="display:inline-block;width:14px;height:14px;background:#ff5e5e;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#ff5e5e"></span>

1. **Waiting room config error** – `.waitingRoomConfigError` ([MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))

### **#ff6b6b** <span style="display:inline-block;width:14px;height:14px;background:#ff6b6b;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#ff6b6b"></span>

1. **Error boundary** – `.error-boundary-details pre` ([ErrorBoundary.css](src/components/ErrorBoundary.css))

### **#8b3a3a** <span style="display:inline-block;width:14px;height:14px;background:#8b3a3a;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#8b3a3a"></span>

1. **Profile danger button** – `.profileDangerButton` ([Profile.css](src/Profile.css))

---

## Blue

### **#93c5fd** <span style="display:inline-block;width:14px;height:14px;background:#93c5fd;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle" title="#93c5fd"></span>

1. **SEO** – `.seoBreadcrumb a`, `.seoFooter a` ([SeoLanding.css](src/SeoLanding.css))

---

## RGBA (and transparent)

1. **rgba(0, 0, 0, 0.12)** – key overlay pad `.keyOverlayPad` ([Game.css](src/Game.css))
2. **rgba(0, 0, 0, 0.25)** – key overlay cell border `.keyOverlayCell` ([Game.css](src/Game.css))
3. **rgba(0, 0, 0, 0.2)** – UserCard box-shadow ([UserCard.css](src/components/UserCard.css))
4. **rgba(0, 0, 0, 0.25)** – Profile card box-shadow ([Profile.css](src/Profile.css))
5. **rgba(0, 0, 0, 0.3)** – How to play section shadow ([HowToPlay.css](src/HowToPlay.css))
6. **rgba(0, 0, 0, 0.4)** – UserCard popover shadow; exampleBoard hover ([UserCard.css](src/components/UserCard.css), [HowToPlay.css](src/HowToPlay.css))
7. **rgba(0, 0, 0, 0.45)** – Home panel shadow ([Home.css](src/Home.css))
8. **rgba(0, 0, 0, 0.5)** – HamburgerMenu dropdown shadow ([HamburgerMenu.jsx](src/components/HamburgerMenu.jsx))
9. **rgba(0, 0, 0, 0.55)** – NotificationToast shadow ([NotificationToast.jsx](src/components/NotificationToast.jsx))
10. **rgba(0, 0, 0, 0.9)** – AdvancedStatsModal overlay shadow
11. **rgba(18, 18, 19, 0.92)** – next stage bar background ([Game.css](src/Game.css))
12. **rgba(24, 24, 27, 0.96)** – NotificationToast background ([NotificationToast.jsx](src/components/NotificationToast.jsx))
13. **rgba(34, 197, 94, 0.04)** – home intro gradient ([Home.css](src/Home.css))
14. **rgba(34, 197, 94, 0.06)** – daily mode row gradient ([Home.css](src/Home.css))
15. **rgba(34, 197, 94, 0.3)** – daily mode row glow ([Home.css](src/Home.css))
16. **rgba(58, 58, 60, 0.4)** – stats tab hover ([AdvancedStats.css](src/AdvancedStats.css))
17. **rgba(106, 170, 100, 0.1)** – leaderboard current row ([Leaderboard.css](src/Leaderboard.css))
18. **rgba(106, 170, 100, 0.15)** – stats tab active ([AdvancedStats.css](src/AdvancedStats.css))
19. **rgba(106, 170, 100, 0.2)** – UserCard badge background ([UserCard.css](src/components/UserCard.css))
20. **rgba(106, 170, 100, 0.25)** – stats tab active hover; waiting room input focus ([AdvancedStats.css](src/AdvancedStats.css), [MultiplayerWaitingRoom.css](src/components/game/MultiplayerWaitingRoom.css))
21. **rgba(106, 170, 100, 0.3)** – UserCard badge border ([UserCard.css](src/components/UserCard.css))
22. **rgba(106, 170, 100, 0.4)** – profile badge earned border ([Profile.css](src/Profile.css))
23. **rgba(106, 170, 100, 0.08)** – profile badge earned background ([Profile.css](src/Profile.css))
24. **rgba(148, 163, 184, 0.6)** – mode row title right border ([Home.css](src/Home.css))
25. **rgba(15, 23, 42, 0.9)** – mode row title right background ([Home.css](src/Home.css))
26. **rgba(18, 18, 19, 0.5)** – profile value background ([Profile.css](src/Profile.css))
27. **rgba(201, 180, 88, 0.2)** – UserCard earned icon hover ([UserCard.css](src/components/UserCard.css))
28. **rgba(201, 180, 88, 0.4)** – UserCard earned icon focus ([UserCard.css](src/components/UserCard.css))
29. **rgba(220, 38, 38, 0.1)** – stats error background ([AdvancedStats.css](src/AdvancedStats.css))
30. **rgba(220, 38, 38, 0.2)** – profile error message background ([Profile.css](src/Profile.css))
31. **rgba(239, 68, 68, 0.3)** – stats error border; profile error border ([AdvancedStats.css](src/AdvancedStats.css), [Profile.css](src/Profile.css))
32. **rgba(239, 68, 68, 0.32)** – PVP mode glow ([Home.css](src/Home.css))
33. **rgba(239, 68, 68, 0.06)** – PVP mode gradient ([Home.css](src/Home.css))
34. **rgba(234, 179, 8, 0.06)** – marathon mode gradient ([Home.css](src/Home.css))
35. **rgba(234, 179, 8, 0.32)** – marathon mode glow ([Home.css](src/Home.css))
36. **rgba(250, 204, 21, 0.4)** – mode row focus ([Home.css](src/Home.css))
37. **rgba(250, 204, 21, 0.25)** – home button focus ([Home.css](src/Home.css))
38. **rgba(250, 204, 21, 0.15)** – profile input focus ([Profile.css](src/Profile.css))
39. **rgba(255, 255, 255, 0.03)** – profile details summary ([Profile.css](src/Profile.css))
40. **rgba(255, 255, 255, 0.05)** – home outline button hover ([Home.css](src/Home.css))
41. **rgba(255, 255, 255, 0.06)** – profile details hover ([Profile.css](src/Profile.css))
42. **rgba(255, 255, 255, 0.1)** – HamburgerMenu item hover; HowToPlay colorBox border ([HamburgerMenu.jsx](src/components/HamburgerMenu.jsx), [HowToPlay.css](src/HowToPlay.css))
43. **rgba(255, 255, 255, 0.12)** – SeoLandingLayout footer border ([SeoLandingLayout.css](src/landing/SeoLandingLayout.css))
44. **rgba(255, 255, 255, 0.86)** – SeoLandingLayout subtitle and content text ([SeoLandingLayout.css](src/landing/SeoLandingLayout.css))
45. **transparent** – outline buttons, input-like elements, hamburger item default background

---

## Summary by role

| Role | Color(s) |
|------|----------|
| Page background | #121213 <span style="display:inline-block;width:12px;height:12px;background:#121213;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> |
| Card/panel background | #1a1a1b <span style="display:inline-block;width:12px;height:12px;background:#1a1a1b;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span>, #18181b <span style="display:inline-block;width:12px;height:12px;background:#18181b;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span>, #2b2b2e <span style="display:inline-block;width:12px;height:12px;background:#2b2b2e;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> |
| Border default | #3a3a3c <span style="display:inline-block;width:12px;height:12px;background:#3a3a3c;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span>, #2b2b2e <span style="display:inline-block;width:12px;height:12px;background:#2b2b2e;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> |
| Border focus/hover | #565758 <span style="display:inline-block;width:12px;height:12px;background:#565758;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span>, #6aaa64 <span style="display:inline-block;width:12px;height:12px;background:#6aaa64;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Primary text | #ffffff <span style="display:inline-block;width:12px;height:12px;background:#ffffff;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Secondary text | #d7dadc <span style="display:inline-block;width:12px;height:12px;background:#d7dadc;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span>, #9ca3af <span style="display:inline-block;width:12px;height:12px;background:#9ca3af;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> |
| Muted/placeholder | #818384 <span style="display:inline-block;width:12px;height:12px;background:#818384;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> |
| Correct letter / success / primary CTA | #6aaa64 <span style="display:inline-block;width:12px;height:12px;background:#6aaa64;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Present letter / gold CTA | #c9b458 <span style="display:inline-block;width:12px;height:12px;background:#c9b458;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Absent letter / neutral | #818384 <span style="display:inline-block;width:12px;height:12px;background:#818384;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> (text), #3a3a3c <span style="display:inline-block;width:12px;height:12px;background:#3a3a3c;border:1px solid rgba(0,0,0,.25);border-radius:2px;vertical-align:middle"></span> (tile) |
| Accent – daily | #22c55e <span style="display:inline-block;width:12px;height:12px;background:#22c55e;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Accent – marathon | #eab308 <span style="display:inline-block;width:12px;height:12px;background:#eab308;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Accent – PVP | #ef4444 <span style="display:inline-block;width:12px;height:12px;background:#ef4444;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Destructive / sign out | #ef5350 <span style="display:inline-block;width:12px;height:12px;background:#ef5350;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Error states | #f06272 <span style="display:inline-block;width:12px;height:12px;background:#f06272;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span>, #f87171 <span style="display:inline-block;width:12px;height:12px;background:#f87171;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span>, #ff5e5e <span style="display:inline-block;width:12px;height:12px;background:#ff5e5e;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span>, #ff6b6b <span style="display:inline-block;width:12px;height:12px;background:#ff6b6b;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span>, #ef4444 <span style="display:inline-block;width:12px;height:12px;background:#ef4444;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Links (SEO) | #93c5fd <span style="display:inline-block;width:12px;height:12px;background:#93c5fd;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> |
| Focus ring | #facc15 <span style="display:inline-block;width:12px;height:12px;background:#facc15;border:1px solid rgba(0,0,0,.2);border-radius:2px;vertical-align:middle"></span> (rgba) |

---

*Derived from all CSS files under `src` and inline `style`/`backgroundColor`/`color`/`border`/`fill`/`stroke` in JSX under `src`.*
