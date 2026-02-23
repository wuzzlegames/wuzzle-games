# GTM & GA4 Configuration Guide

## 🎯 Quick Setup Reference

This document provides detailed instructions for configuring Google Analytics 4 (GA4) inside Google Tag Manager (GTM) for Wuzzle Games.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ GA4 Measurement ID (format: `G-XXXXXXXXXX`)
- ✅ GTM Container ID (format: `GTM-XXXXXXX`)
- ✅ Access to Google Tag Manager account
- ✅ Access to Google Analytics account

---

## 🏗️ Part 1: GTM Container Setup

### Step 1: Create GA4 Configuration Tag

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Select your **Wuzzle Games** container
3. Click **Tags** in the left sidebar
4. Click **New** button (top right)
5. Click on the **Tag Configuration** box
6. Select **Google Analytics: GA4 Configuration**
7. In the **Measurement ID** field, enter your GA4 ID: `G-XXXXXXXXXX`
8. Leave other settings as default for now
9. Click on the **Triggering** box
10. Select **All Pages** trigger
11. Name your tag: `GA4 - Configuration`
12. Click **Save**

**What this does**: This tag initializes GA4 on every page of your website.

---

### Step 2: Create Custom Event Tags

Now we'll create tags for the custom events tracked by Wuzzle Games.

#### Event 1: Game Started

1. Click **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Google Analytics: GA4 Event**
4. **Configuration Tag**: Select `GA4 - Configuration`
5. **Event Name**: Enter `game_started`
6. Click **Event Parameters** → **Add Row**
   - Parameter Name: `mode`
   - Value: `{{dlv - mode}}`
7. Add another row:
   - Parameter Name: `puzzle_type`
   - Value: `{{dlv - puzzle_type}}`
8. Add another row:
   - Parameter Name: `boards`
   - Value: `{{dlv - boards}}`
9. Click **Triggering**
10. Click **+** to create new trigger
11. Choose **Custom Event**
12. Event name: `game_started`
13. Click **Save** (for trigger)
14. Name the tag: `GA4 - Game Started`
15. Click **Save** (for tag)

#### Event 2: Game Completed

1. Click **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Google Analytics: GA4 Event**
4. **Configuration Tag**: Select `GA4 - Configuration`
5. **Event Name**: Enter `game_completed`
6. Add Event Parameters:
   - `mode` → `{{dlv - mode}}`
   - `attempts` → `{{dlv - attempts}}`
   - `success` → `{{dlv - success}}`
   - `time_seconds` → `{{dlv - time_seconds}}`
7. Click **Triggering** → **+** (new trigger)
8. Choose **Custom Event**
9. Event name: `game_completed`
10. Save trigger and tag: `GA4 - Game Completed`

#### Event 3: Multiplayer Started

1. Click **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Google Analytics: GA4 Event**
4. **Configuration Tag**: Select `GA4 - Configuration`
5. **Event Name**: Enter `multiplayer_started`
6. Add Event Parameters:
   - `room_type` → `{{dlv - room_type}}`
   - `player_count` → `{{dlv - player_count}}`
7. Create trigger for custom event: `multiplayer_started`
8. Save tag: `GA4 - Multiplayer Started`

#### Event 4: Daily Puzzle Played

1. Click **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Google Analytics: GA4 Event**
4. **Configuration Tag**: Select `GA4 - Configuration`
5. **Event Name**: Enter `daily_puzzle_played`
6. Add Event Parameters:
   - `puzzle_date` → `{{dlv - puzzle_date}}`
   - `boards` → `{{dlv - boards}}`
7. Create trigger for custom event: `daily_puzzle_played`
8. Save tag: `GA4 - Daily Puzzle Played`

#### Event 5: Email Signup

1. Click **Tags** → **New**
2. Click **Tag Configuration**
3. Select **Google Analytics: GA4 Event**
4. **Configuration Tag**: Select `GA4 - Configuration`
5. **Event Name**: Enter `email_signup`
6. Add Event Parameter:
   - `source` → `{{dlv - source}}`
7. Create trigger for custom event: `email_signup`
8. Save tag: `GA4 - Email Signup`

---

### Step 3: Create DataLayer Variables

To make the event parameters work, we need to create DataLayer Variables.

#### Create Variable: dlv - mode

1. Click **Variables** in left sidebar
2. Scroll to **User-Defined Variables**
3. Click **New**
4. Click **Variable Configuration**
5. Choose **Data Layer Variable**
6. **Data Layer Variable Name**: `mode`
7. Name the variable: `dlv - mode`
8. Click **Save**

#### Create More Variables

Repeat the above process for each parameter:

| Variable Name | Data Layer Variable Name |
|---------------|--------------------------|
| `dlv - mode` | `mode` |
| `dlv - puzzle_type` | `puzzle_type` |
| `dlv - boards` | `boards` |
| `dlv - attempts` | `attempts` |
| `dlv - success` | `success` |
| `dlv - time_seconds` | `time_seconds` |
| `dlv - room_type` | `room_type` |
| `dlv - player_count` | `player_count` |
| `dlv - puzzle_date` | `puzzle_date` |
| `dlv - source` | `source` |

**Quick Tip**: After creating the first variable, you can duplicate it and just change the Data Layer Variable Name.

---

### Step 4: Test in Preview Mode

Before publishing, test your setup:

1. Click **Preview** button (top right)
2. Enter: `https://wuzzlegames.com` (or your dev URL)
3. Click **Connect**
4. A new tab opens with GTM debugger
5. Navigate the site and trigger events
6. In the debugger, verify:
   - ✅ GA4 Configuration tag fires on all pages
   - ✅ Custom event tags fire when events occur
   - ✅ Variables populate with correct values
7. Click **Continue** when satisfied

---

### Step 5: Publish Container

1. Click **Submit** (top right)
2. **Version Name**: `GA4 Setup with Custom Events`
3. **Version Description**: 
   ```
   - Added GA4 Configuration tag
   - Created custom event tags for game tracking
   - Set up DataLayer variables
   - Tested in Preview mode
   ```
4. Click **Publish**
5. Your changes are now live!

---

## 📊 Part 2: GA4 Configuration

### Step 1: Enable Enhanced Measurement

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon, bottom left)
3. Under **Data collection and modification**, click **Data Streams**
4. Click on your **Wuzzle Games Web** stream
5. Scroll to **Enhanced measurement**
6. Toggle it **ON** if not already enabled
7. Click the gear icon to customize:
   - ✅ Page views (enabled by default)
   - ✅ Scrolls (tracks 90% scroll depth)
   - ✅ Outbound clicks
   - ✅ Site search
   - ✅ Video engagement
   - ✅ File downloads
8. Click **Save**

**What this does**: Automatically tracks common user interactions without additional code.

---

### Step 2: Create Custom Dimensions (Optional)

Custom dimensions allow you to segment your data by game-specific attributes.

#### Create Dimension: Game Mode

1. In GA4 Admin, click **Custom definitions**
2. Click **Create custom dimension**
3. **Dimension name**: `Game Mode`
4. **Scope**: `Event`
5. **Description**: `The game mode being played (daily, marathon, speedrun, etc.)`
6. **Event parameter**: `mode`
7. Click **Save**

#### Create More Dimensions

| Dimension Name | Scope | Event Parameter |
|----------------|-------|-----------------|
| `Game Mode` | Event | `mode` |
| `Puzzle Type` | Event | `puzzle_type` |
| `Number of Boards` | Event | `boards` |
| `Room Type` | Event | `room_type` |
| `Success Status` | Event | `success` |

**Why create dimensions?**: They allow you to create custom reports and segments in GA4.

---

### Step 3: Create Custom Metrics (Optional)

Custom metrics let you track numeric values.

#### Create Metric: Game Attempts

1. In GA4 Admin, click **Custom definitions**
2. Click **Create custom metric**
3. **Metric name**: `Game Attempts`
4. **Scope**: `Event`
5. **Description**: `Number of attempts/guesses used in a game`
6. **Event parameter**: `attempts`
7. **Unit of measurement**: `Standard`
8. Click **Save**

#### Create More Metrics

| Metric Name | Event Parameter | Unit |
|-------------|-----------------|------|
| `Game Attempts` | `attempts` | Standard |
| `Game Duration` | `time_seconds` | Seconds |
| `Player Count` | `player_count` | Standard |

---

### Step 4: Set Up Conversions

Mark important events as conversions for better tracking.

1. In GA4, go to **Admin** → **Events**
2. Wait for your custom events to appear (may take 24 hours)
3. Once visible, toggle **Mark as conversion** for:
   - ✅ `game_completed` (when success = true)
   - ✅ `email_signup`
   - ✅ `sign_up`
   - ✅ `subscription`

**What this does**: Conversions appear in special reports and can be used for optimization.

---

### Step 5: Create Custom Reports

#### Report 1: Game Performance

1. Go to **Explore** in left sidebar
2. Click **Blank** template
3. Name: `Game Performance`
4. **Dimensions**: Add `Event name`, `Game Mode`, `Puzzle Type`
5. **Metrics**: Add `Event count`, `Game Attempts`, `Success Status`
6. **Rows**: `Game Mode`
7. **Values**: `Event count`, `Game Attempts`
8. **Filters**: `Event name` = `game_completed`
9. Click **Save**

#### Report 2: Daily Puzzle Engagement

1. Create new Exploration
2. Name: `Daily Puzzle Engagement`
3. **Dimensions**: `Puzzle Date`, `Number of Boards`
4. **Metrics**: `Event count`, `Total users`
5. **Rows**: `Puzzle Date`
6. **Values**: `Event count`
7. **Filters**: `Event name` = `daily_puzzle_played`
8. Click **Save**

---

## 🧪 Part 3: Testing & Validation

### Test 1: Real-Time Events

1. Go to **Reports** → **Realtime** in GA4
2. Open https://wuzzlegames.com in another tab
3. Navigate the site and play a game
4. In Realtime report, verify:
   - ✅ Active users count increases
   - ✅ Page views appear
   - ✅ Custom events appear (may take 1-2 minutes)

### Test 2: GTM Debug Console

1. In GTM, click **Preview**
2. Connect to your site
3. Trigger various events (start game, complete game, etc.)
4. In GTM debugger, verify:
   - ✅ Tags fire correctly
   - ✅ Variables populate with data
   - ✅ No errors in console

### Test 3: Browser Console

1. Open site in incognito mode
2. Open DevTools (F12) → Console
3. Type: `window.dataLayer`
4. Verify dataLayer contains events
5. Look for console messages: `[GTM] Event tracked: game_started`

---

## 📈 Part 4: Monitoring & Optimization

### Daily Checks (First Week)

- [ ] Check GA4 Realtime for active users
- [ ] Verify custom events are firing
- [ ] Check for any errors in GTM
- [ ] Monitor page load performance

### Weekly Checks

- [ ] Review event counts in GA4 Events report
- [ ] Check conversion rates
- [ ] Analyze user paths
- [ ] Review top pages and events

### Monthly Analysis

- [ ] User acquisition trends
- [ ] Game mode popularity
- [ ] Completion rates by mode
- [ ] User retention metrics

---

## 🔧 Troubleshooting

### Events Not Appearing in GA4

**Problem**: Custom events don't show in GA4 reports

**Solutions**:
1. Wait 24-48 hours for events to appear in standard reports (Realtime is faster)
2. Check GTM Preview mode to verify events fire
3. Verify GA4 Measurement ID is correct in GTM
4. Check browser console for errors
5. Ensure GTM container is published

### Variables Show "undefined"

**Problem**: DataLayer variables show as undefined in GTM

**Solutions**:
1. Verify variable names match exactly (case-sensitive)
2. Check that events push data to dataLayer correctly
3. Use GTM Preview mode to inspect dataLayer
4. Verify Data Layer Variable Name in variable configuration

### Tags Not Firing

**Problem**: Tags don't fire in GTM Preview mode

**Solutions**:
1. Check trigger configuration
2. Verify trigger conditions are met
3. Check for blocking triggers
4. Review tag firing order
5. Check browser console for JavaScript errors

---

## 📚 Event Reference

### Complete Event List

| Event Name | Parameters | When It Fires |
|------------|------------|---------------|
| `page_view` | `page_path`, `page_title` | Every page load |
| `game_started` | `mode`, `puzzle_type`, `boards` | Game begins |
| `game_completed` | `mode`, `attempts`, `success`, `time_seconds` | Game ends |
| `multiplayer_started` | `room_type`, `player_count` | Multiplayer game starts |
| `daily_puzzle_played` | `puzzle_date`, `boards` | Daily puzzle accessed |
| `email_signup` | `source` | User signs up for emails |
| `leaderboard_view` | `leaderboard_type` | Leaderboard viewed |
| `share` | `method`, `game_mode` | User shares results |
| `sign_up` | `method` | User creates account |
| `sign_in` | `method` | User signs in |
| `subscription` | `action`, `tier` | Subscription event |
| `faq_view` | - | FAQ page viewed |
| `how_to_play_view` | - | How to Play viewed |

---

## 🎯 Success Metrics

Track these KPIs to measure success:

### Engagement Metrics
- Daily active users (DAU)
- Average session duration
- Pages per session
- Bounce rate

### Game Metrics
- Games started per day
- Game completion rate
- Average attempts per game
- Most popular game modes

### Conversion Metrics
- Sign-up conversion rate
- Email signup rate
- Subscription conversion rate
- Share rate

### Retention Metrics
- Day 1, 7, 30 retention
- Returning user rate
- Daily puzzle streak length

---

## 🔗 Useful Links

- [GA4 Event Reference](https://support.google.com/analytics/answer/9267735)
- [GTM DataLayer Documentation](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [GA4 Custom Dimensions Guide](https://support.google.com/analytics/answer/10075209)
- [GTM Preview Mode Guide](https://support.google.com/tagmanager/answer/6107056)

---

**Last Updated**: February 23, 2026
**Version**: 1.0.0
