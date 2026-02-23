# Wuzzle Games - Analytics & Search Console Setup Guide

## 🎯 Overview

This guide provides complete instructions for setting up Google Analytics 4 (GA4), Google Tag Manager (GTM), Google Search Console (GSC), and Bing Webmaster Tools for https://wuzzlegames.com.

---

## 📋 Table of Contents

1. [Phase 1: Account Setup](#phase-1-account-setup)
2. [Phase 2: Domain Verification](#phase-2-domain-verification)
3. [Phase 3: Code Implementation](#phase-3-code-implementation)
4. [Phase 4: GA4 Configuration in GTM](#phase-4-ga4-configuration-in-gtm)
5. [Phase 5: Custom Event Tracking](#phase-5-custom-event-tracking)
6. [Phase 6: Sitemap & Search Console](#phase-6-sitemap--search-console)
7. [Phase 7: Validation & Testing](#phase-7-validation--testing)
8. [Phase 8: Deployment](#phase-8-deployment)

---

## Phase 1: Account Setup

### 1.1 Create Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon in bottom left)
3. Click **Create Property**
4. Enter property details:
   - **Property name**: `Wuzzle Games`
   - **Reporting time zone**: Your timezone
   - **Currency**: USD
5. Click **Next**
6. Fill in business details (optional)
7. Click **Create**
8. Accept Terms of Service
9. Choose **Web** platform
10. Enter website details:
    - **Website URL**: `https://wuzzlegames.com`
    - **Stream name**: `Wuzzle Games Web`
11. Click **Create stream**
12. **SAVE YOUR MEASUREMENT ID** (format: `G-XXXXXXXXXX`)

### 1.2 Create Google Tag Manager Container

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Click **Create Account**
3. Enter account details:
   - **Account Name**: `Wuzzle Games`
   - **Country**: Your country
4. Click **Continue**
5. Enter container details:
   - **Container name**: `Wuzzle Games`
   - **Target platform**: **Web**
6. Click **Create**
7. Accept Terms of Service
8. **SAVE YOUR CONTAINER ID** (format: `GTM-XXXXXXX`)
9. You can close the installation instructions popup (we've already implemented it)

### 1.3 Create Google Search Console Property

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add Property**
3. Choose **Domain** property type
4. Enter domain: `wuzzlegames.com` (without https://)
5. Click **Continue**
6. **SAVE THE DNS TXT RECORD** shown on screen
   - Format: `google-site-verification=XXXXXXXXXXXXXXXXXXXX`
7. Keep this window open (we'll verify after DNS setup)

### 1.4 Create Bing Webmaster Tools Property

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Sign in with Microsoft account
3. Click **Add a site**
4. Enter: `https://wuzzlegames.com`
5. Choose **Add site using DNS verification**
6. **SAVE THE DNS TXT RECORD** shown
   - Format: Similar to Google's verification code
7. Keep this window open (we'll verify after DNS setup)

---

## Phase 2: Domain Verification

### 2.1 Add DNS TXT Records in GoDaddy

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Go to **My Products** → **DNS** for wuzzlegames.com
3. Scroll to **Records** section
4. Click **Add** button

#### Add Google Search Console Verification:
- **Type**: TXT
- **Name**: @ (or leave blank for root domain)
- **Value**: `google-site-verification=XXXXXXXXXXXXXXXXXXXX` (from Step 1.3)
- **TTL**: 1 Hour (or default)
- Click **Save**

#### Add Bing Webmaster Verification:
- **Type**: TXT
- **Name**: @ (or leave blank for root domain)
- **Value**: The verification code from Bing (from Step 1.4)
- **TTL**: 1 Hour (or default)
- Click **Save**

### 2.2 Wait for DNS Propagation

- DNS changes typically take 15-60 minutes
- You can check propagation at: https://dnschecker.org/
- Enter `wuzzlegames.com` and select **TXT** record type

### 2.3 Verify in Google Search Console

1. Return to Google Search Console verification window
2. Click **Verify**
3. If successful, you'll see a success message
4. If it fails, wait longer for DNS propagation and try again

### 2.4 Verify in Bing Webmaster Tools

1. Return to Bing Webmaster Tools verification window
2. Click **Verify**
3. If successful, you'll see a success message
4. If it fails, wait longer for DNS propagation and try again

---

## Phase 3: Code Implementation

### 3.1 Update Environment Variables

The code implementation is already complete! You just need to configure the environment variables.

1. Open `.env.production` file in the project root
2. Replace `GTM-XXXXXXX` with your actual GTM Container ID from Step 1.2:

```env
# Production Environment Variables
VITE_GTM_ID=GTM-XXXXXXX  # ← Replace with your actual ID

# Environment flag
VITE_APP_ENV=production
```

### 3.2 Verify Implementation

The following files have been created/modified:

✅ **index.html** - GTM snippet added to `<head>` and `<body>`
✅ **src/lib/gtm.js** - GTM initialization and dataLayer utilities
✅ **src/lib/analytics.js** - Custom event tracking functions
✅ **src/hooks/useGameAnalytics.js** - React hooks for game analytics
✅ **src/main.jsx** - GTM initialization on app load
✅ **src/App.jsx** - Page view tracking on route changes
✅ **vite.config.js** - Environment variable injection during build
✅ **.env.example** - Template for environment variables
✅ **.env.production** - Production environment configuration

---

## Phase 4: GA4 Configuration in GTM

Now we'll configure GA4 inside Google Tag Manager.

### 4.1 Create GA4 Configuration Tag

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Select your **Wuzzle Games** container
3. Click **Tags** in the left sidebar
4. Click **New**
5. Click **Tag Configuration**
6. Choose **Google Analytics: GA4 Configuration**
7. Enter your **Measurement ID** from Step 1.1 (format: `G-XXXXXXXXXX`)
8. Under **Triggering**, click the trigger box
9. Select **All Pages**
10. Name the tag: `GA4 - Configuration`
11. Click **Save**

### 4.2 Enable Enhanced Measurement (Optional but Recommended)

Enhanced measurement is typically enabled by default in GA4, but verify:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** → **Data Streams**
3. Click on your **Wuzzle Games Web** stream
4. Scroll to **Enhanced measurement**
5. Toggle it **ON** if not already enabled
6. This automatically tracks:
   - Page views
   - Scrolls
   - Outbound clicks
   - Site search
   - Video engagement
   - File downloads

### 4.3 Create Custom Event Tags (Optional)

For better visibility of custom events in GTM:

1. In GTM, click **Tags** → **New**
2. Click **Tag Configuration**
3. Choose **Google Analytics: GA4 Event**
4. Enter **Configuration Tag**: Select your `GA4 - Configuration` tag
5. Enter **Event Name**: `{{Event}}` (this will use the event name from dataLayer)
6. Under **Triggering**, click the trigger box
7. Click **+** to create a new trigger
8. Choose **Custom Event**
9. Event name: `game_started` (create separate triggers for each event)
10. Click **Save**
11. Name the tag: `GA4 - Game Started Event`
12. Click **Save**

Repeat for other custom events:
- `game_completed`
- `multiplayer_started`
- `email_signup`
- `daily_puzzle_played`

### 4.4 Publish GTM Container

1. Click **Submit** in the top right
2. Add a version name: `Initial GA4 Setup`
3. Add description: `Added GA4 configuration and custom event tracking`
4. Click **Publish**

---

## Phase 5: Custom Event Tracking

### 5.1 Events Already Implemented

The following events are automatically tracked in the codebase:

#### Core Game Events:
- **`game_started`** - Fired when a game begins
  - Parameters: `mode`, `puzzle_type`, `boards`
- **`game_completed`** - Fired when a game ends
  - Parameters: `mode`, `attempts`, `success`, `time_seconds`
- **`daily_puzzle_played`** - Fired when daily puzzle is played
  - Parameters: `puzzle_date`, `boards`

#### Multiplayer Events:
- **`multiplayer_started`** - Fired when multiplayer game starts
  - Parameters: `room_type`, `player_count`

#### User Engagement Events:
- **`email_signup`** - Fired when user signs up for emails
  - Parameters: `source`
- **`leaderboard_view`** - Fired when leaderboard is viewed
  - Parameters: `leaderboard_type`
- **`share`** - Fired when user shares results
  - Parameters: `method`, `game_mode`
- **`sign_up`** / **`sign_in`** - Authentication events
  - Parameters: `method`
- **`subscription`** - Subscription-related events
  - Parameters: `action`, `tier`
- **`faq_view`** / **`how_to_play_view`** - Content views

### 5.2 Adding Event Tracking to Components

To add tracking to new components, import and use the analytics functions:

```javascript
import { trackGameStarted, trackGameCompleted } from '../lib/analytics';

// Track game start
trackGameStarted('daily', 'single', 1);

// Track game completion
trackGameCompleted('daily', 6, true, 120);
```

Or use the custom hooks:

```javascript
import { useSinglePlayerGameAnalytics } from '../hooks/useGameAnalytics';

// In your component
useSinglePlayerGameAnalytics({
  mode: 'daily',
  numBoards: 1,
  speedrunEnabled: false,
  finished: gameFinished,
  allSolved: allBoardsSolved,
  currentTurn: currentTurn,
  puzzleDate: '2026-02-23'
});
```

---

## Phase 6: Sitemap & Search Console

### 6.1 Verify Sitemap

The sitemap is already created at `/public/sitemap.xml` and includes:

✅ Homepage
✅ Game page
✅ Leaderboard
✅ Profile
✅ FAQ
✅ How to Play
✅ Advanced Stats
✅ SEO landing pages (multiplayer, multi-board, speedrun, marathon)

### 6.2 Verify robots.txt

The robots.txt is already configured at `/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://wuzzlegames.com/sitemap.xml
```

### 6.3 Submit Sitemap to Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Select your **wuzzlegames.com** property
3. Click **Sitemaps** in the left sidebar
4. Enter: `sitemap.xml`
5. Click **Submit**
6. Status should show as **Success** after a few minutes

### 6.4 Submit Sitemap to Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Select your **wuzzlegames.com** site
3. Click **Sitemaps** in the left sidebar
4. Enter: `https://wuzzlegames.com/sitemap.xml`
5. Click **Submit**
6. Status should show as **Success** after processing

---

## Phase 7: Validation & Testing

### 7.1 Test GTM Installation

1. Open https://wuzzlegames.com in an **incognito/private window**
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Look for GTM initialization messages:
   ```
   [GTM] Initialized with ID: GTM-XXXXXXX
   ```
5. Check for dataLayer:
   ```javascript
   console.log(window.dataLayer);
   ```
   Should show an array with GTM events

### 7.2 Test GA4 Real-Time Events

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Reports** → **Realtime**
3. In another tab, open https://wuzzlegames.com
4. You should see:
   - Active users count increase
   - Page views appear in real-time
5. Navigate to different pages and verify page views are tracked

### 7.3 Test Custom Events

1. Keep GA4 Realtime report open
2. In another tab, play a game on wuzzlegames.com
3. Start a game → Look for `game_started` event in Realtime
4. Complete a game → Look for `game_completed` event
5. Events may take 1-2 minutes to appear in Realtime

### 7.4 Use Google Tag Assistant

1. Install [Tag Assistant Legacy](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk) Chrome extension
2. Visit https://wuzzlegames.com
3. Click the Tag Assistant icon
4. Click **Enable** and refresh the page
5. Verify:
   - ✅ Google Tag Manager tag is present
   - ✅ GA4 Configuration tag fires
   - ✅ No errors or warnings

### 7.5 Test GTM Preview Mode

1. Go to [Google Tag Manager](https://tagmanager.google.com/)
2. Click **Preview** in the top right
3. Enter: `https://wuzzlegames.com`
4. Click **Connect**
5. A new tab opens with GTM debugger
6. Navigate the site and verify:
   - Tags fire correctly
   - Variables populate correctly
   - Events are captured

### 7.6 Verify Domain Verification Status

#### Google Search Console:
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Select your property
3. Click **Settings** → **Ownership verification**
4. Should show **Verified** status

#### Bing Webmaster Tools:
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Select your site
3. Should show **Verified** badge

### 7.7 Verify Sitemap Submission

#### Google Search Console:
1. Go to **Sitemaps** section
2. Should show:
   - Status: **Success**
   - Discovered URLs: ~12 pages

#### Bing Webmaster Tools:
1. Go to **Sitemaps** section
2. Should show:
   - Status: **Submitted successfully**
   - URLs: ~12 pages

---

## Phase 8: Deployment

### 8.1 Build for Production

1. Ensure `.env.production` has your GTM ID
2. Run the build command:
   ```bash
   npm run build
   ```
3. Verify the build completes without errors
4. Check `dist/index.html` contains GTM snippet with your ID

### 8.2 Deploy to Production

Deploy using your existing deployment method:

```bash
npm run deploy
```

Or manually deploy the `dist` folder to your hosting provider.

### 8.3 Post-Deployment Verification

1. Visit https://wuzzlegames.com (production URL)
2. Open DevTools Console
3. Verify GTM loads: `[GTM] Initialized with ID: GTM-XXXXXXX`
4. Check GA4 Realtime report for traffic
5. Test a few interactions to verify events fire

### 8.4 Monitor for 24-48 Hours

- Check GA4 daily for incoming data
- Verify events are being tracked correctly
- Check Search Console for crawl errors
- Monitor Bing Webmaster for indexing status

---

## 🎉 Completion Checklist

Use this checklist to verify everything is set up correctly:

### Account Setup
- [ ] GA4 Property created with Measurement ID saved
- [ ] GTM Container created with Container ID saved
- [ ] Google Search Console property created
- [ ] Bing Webmaster Tools property created

### Domain Verification
- [ ] DNS TXT record added for Google Search Console
- [ ] DNS TXT record added for Bing Webmaster Tools
- [ ] Google Search Console verification successful
- [ ] Bing Webmaster Tools verification successful

### Code Implementation
- [ ] `.env.production` updated with GTM Container ID
- [ ] GTM snippet present in `index.html`
- [ ] GTM initialization in `src/main.jsx`
- [ ] Page view tracking in `src/App.jsx`
- [ ] Analytics library created (`src/lib/analytics.js`)
- [ ] Analytics hooks created (`src/hooks/useGameAnalytics.js`)

### GTM Configuration
- [ ] GA4 Configuration tag created in GTM
- [ ] GA4 Configuration tag triggers on All Pages
- [ ] Enhanced measurement enabled in GA4
- [ ] Custom event tags created (optional)
- [ ] GTM container published

### Sitemap & Search Console
- [ ] Sitemap exists at `/public/sitemap.xml`
- [ ] robots.txt references sitemap
- [ ] Sitemap submitted to Google Search Console
- [ ] Sitemap submitted to Bing Webmaster Tools

### Testing & Validation
- [ ] GTM loads in production
- [ ] GA4 Realtime shows page views
- [ ] Custom events fire correctly
- [ ] No console errors
- [ ] Tag Assistant shows no issues
- [ ] Domain verification confirmed
- [ ] Sitemap successfully processed

### Deployment
- [ ] Production build successful
- [ ] Site deployed with analytics
- [ ] Post-deployment verification complete
- [ ] Monitoring set up for 24-48 hours

---

## 🔧 Troubleshooting

### GTM Not Loading

**Issue**: GTM script doesn't load or dataLayer is undefined

**Solutions**:
1. Verify `.env.production` has correct GTM ID (format: `GTM-XXXXXXX`)
2. Check `VITE_APP_ENV=production` is set
3. Rebuild the project: `npm run build`
4. Clear browser cache and test in incognito
5. Check browser console for errors

### Events Not Appearing in GA4

**Issue**: Custom events don't show in GA4 Realtime

**Solutions**:
1. Wait 1-2 minutes (events have slight delay)
2. Verify GTM Preview mode shows events firing
3. Check GA4 Configuration tag is published in GTM
4. Verify Measurement ID is correct in GTM
5. Check browser console for `[GTM] Event tracked:` messages

### Domain Verification Failed

**Issue**: DNS verification doesn't work

**Solutions**:
1. Wait longer for DNS propagation (up to 24 hours)
2. Check DNS records at https://dnschecker.org/
3. Verify TXT record value is exact (no extra spaces)
4. Try alternative verification method (HTML file upload)

### Sitemap Not Found

**Issue**: Search Console can't find sitemap

**Solutions**:
1. Verify sitemap is accessible: https://wuzzlegames.com/sitemap.xml
2. Check robots.txt references correct URL
3. Ensure sitemap is in `public` folder (not `src`)
4. Rebuild and redeploy if needed

---

## 📊 What to Monitor

### Daily (First Week)
- GA4 Realtime report for active users
- Custom events firing correctly
- No console errors on production site

### Weekly
- GA4 Reports → Engagement → Events
- Search Console → Performance (impressions, clicks)
- Bing Webmaster → Reports & Data

### Monthly
- User acquisition trends
- Top performing pages
- Search query performance
- Event conversion rates

---

## 📚 Additional Resources

- [Google Analytics 4 Documentation](https://support.google.com/analytics/answer/9304153)
- [Google Tag Manager Documentation](https://support.google.com/tagmanager)
- [Google Search Console Help](https://support.google.com/webmasters)
- [Bing Webmaster Tools Help](https://www.bing.com/webmasters/help)

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check browser console for error messages
2. Use GTM Preview mode to debug tag firing
3. Verify all IDs are correct (GTM, GA4)
4. Ensure environment variables are set correctly
5. Test in incognito mode to rule out browser extensions

---

**Last Updated**: February 23, 2026
**Version**: 1.0.0
