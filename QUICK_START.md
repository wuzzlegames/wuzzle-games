# 🚀 Quick Start Guide - Wuzzle Games Analytics

## ⚡ 5-Minute Setup

This guide gets you up and running with analytics in the fastest way possible.

---

## Step 1: Create Accounts (5 minutes)

### Google Analytics 4
1. Go to https://analytics.google.com/
2. Create property: **"Wuzzle Games"**
3. Platform: **Web**
4. **Copy your Measurement ID**: `G-XXXXXXXXXX`

### Google Tag Manager
1. Go to https://tagmanager.google.com/
2. Create container: **"Wuzzle Games"**
3. Platform: **Web**
4. **Copy your Container ID**: `GTM-XXXXXXX`

---

## Step 2: Update Environment Variable (30 seconds)

1. Open `.env.production` in your project
2. Replace `GTM-XXXXXXX` with your actual GTM Container ID:

```env
VITE_GTM_ID=GTM-XXXXXXX  # ← Paste your ID here
VITE_APP_ENV=production
```

3. Save the file

---

## Step 3: Configure GTM (3 minutes)

1. Go to https://tagmanager.google.com/
2. Open your **Wuzzle Games** container
3. Click **Tags** → **New**
4. Choose **Google Analytics: GA4 Configuration**
5. Enter your **Measurement ID** from Step 1
6. Trigger: **All Pages**
7. Name: `GA4 - Configuration`
8. Click **Save**
9. Click **Submit** → **Publish**

---

## Step 4: Deploy (2 minutes)

```bash
npm run build
npm run deploy
```

---

## Step 5: Verify (1 minute)

1. Open https://wuzzlegames.com in incognito
2. Press F12 → Console tab
3. Look for: `[GTM] Initialized with ID: GTM-XXXXXXX`
4. Go to https://analytics.google.com/ → **Realtime**
5. You should see yourself as an active user!

---

## ✅ Done!

Your analytics is now live and tracking:
- ✅ Page views
- ✅ Game starts
- ✅ Game completions
- ✅ User interactions
- ✅ And 10+ other custom events

---

## 🔍 Optional: Domain Verification (15 minutes)

### Google Search Console
1. Go to https://search.google.com/search-console/
2. Add property: `wuzzlegames.com`
3. Copy the DNS TXT record
4. Add to GoDaddy DNS settings
5. Wait 30 minutes, then verify

### Bing Webmaster Tools
1. Go to https://www.bing.com/webmasters/
2. Add site: `https://wuzzlegames.com`
3. Copy the DNS TXT record
4. Add to GoDaddy DNS settings
5. Wait 30 minutes, then verify

### Submit Sitemaps
- **Google**: Submit `sitemap.xml` in Search Console
- **Bing**: Submit `https://wuzzlegames.com/sitemap.xml` in Webmaster Tools

---

## 📚 Need More Details?

- **Complete Setup**: See [ANALYTICS_SETUP_GUIDE.md](ANALYTICS_SETUP_GUIDE.md)
- **DNS Help**: See [DNS_VERIFICATION_GUIDE.md](DNS_VERIFICATION_GUIDE.md)
- **GTM Config**: See [GTM_GA4_CONFIGURATION.md](GTM_GA4_CONFIGURATION.md)
- **Full Report**: See [ANALYTICS_IMPLEMENTATION_REPORT.md](ANALYTICS_IMPLEMENTATION_REPORT.md)

---

## 🆘 Troubleshooting

**GTM not loading?**
- Check `.env.production` has correct GTM ID
- Verify `VITE_APP_ENV=production`
- Rebuild: `npm run build`

**Events not showing?**
- Wait 1-2 minutes (slight delay is normal)
- Check GTM is published
- Verify Measurement ID in GTM

**Still stuck?**
- Check browser console for errors
- Review [ANALYTICS_SETUP_GUIDE.md](ANALYTICS_SETUP_GUIDE.md)
- Use GTM Preview mode to debug

---

**Last Updated**: February 23, 2026
