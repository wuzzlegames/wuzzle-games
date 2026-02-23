# DNS Verification Guide for Wuzzle Games

## 🎯 Quick Reference

This guide provides step-by-step instructions for adding DNS TXT records to verify domain ownership for Google Search Console and Bing Webmaster Tools.

---

## 📋 Prerequisites

Before starting, you need:
1. Access to GoDaddy account for wuzzlegames.com
2. Google Search Console verification code
3. Bing Webmaster Tools verification code

---

## 🔐 Step 1: Get Verification Codes

### Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Click **Add Property**
3. Select **Domain** property type
4. Enter: `wuzzlegames.com`
5. Click **Continue**
6. Copy the TXT record value shown
   - Format: `google-site-verification=XXXXXXXXXXXXXXXXXXXX`
   - **Save this code** - you'll need it in Step 2

### Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Click **Add a site**
3. Enter: `https://wuzzlegames.com`
4. Select **Add site using DNS verification**
5. Copy the TXT record value shown
   - Format: Similar verification string
   - **Save this code** - you'll need it in Step 2

---

## 🌐 Step 2: Add DNS TXT Records in GoDaddy

### Access DNS Management

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Click on your profile icon (top right)
3. Select **My Products**
4. Find **wuzzlegames.com** in your domains list
5. Click the **DNS** button next to it
6. Scroll down to the **Records** section

### Add Google Search Console TXT Record

1. Click the **Add** button (or **Add Record**)
2. Fill in the form:
   - **Type**: Select `TXT` from dropdown
   - **Name**: Enter `@` (this represents the root domain)
   - **Value**: Paste your Google verification code
     ```
     google-site-verification=XXXXXXXXXXXXXXXXXXXX
     ```
   - **TTL**: Leave as default (1 Hour) or select from dropdown
3. Click **Save** (or **Add Record**)

### Add Bing Webmaster Tools TXT Record

1. Click the **Add** button again
2. Fill in the form:
   - **Type**: Select `TXT` from dropdown
   - **Name**: Enter `@`
   - **Value**: Paste your Bing verification code
   - **TTL**: Leave as default (1 Hour)
3. Click **Save**

### Verify Your Records

After adding both records, your DNS records should look like this:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | google-site-verification=XXXX... | 1 Hour |
| TXT | @ | [Bing verification code] | 1 Hour |

---

## ⏱️ Step 3: Wait for DNS Propagation

DNS changes don't take effect immediately. You need to wait for propagation.

### Typical Propagation Times
- **Minimum**: 15-30 minutes
- **Average**: 1-2 hours
- **Maximum**: 24-48 hours (rare)

### Check DNS Propagation Status

1. Go to [DNS Checker](https://dnschecker.org/)
2. Enter: `wuzzlegames.com`
3. Select **TXT** from the record type dropdown
4. Click **Search**
5. Look for your verification codes in the results
6. Green checkmarks indicate the record has propagated to that location

**Tip**: You need to see your TXT records in at least a few locations before attempting verification.

---

## ✅ Step 4: Verify Domain Ownership

### Verify in Google Search Console

1. Return to the Google Search Console verification window
   - If you closed it, go to [Google Search Console](https://search.google.com/search-console/)
   - Click **Add Property** → **Domain** → Enter `wuzzlegames.com`
2. Click **Verify** button
3. **If successful**: You'll see a success message and can start using Search Console
4. **If it fails**: 
   - Wait longer for DNS propagation (try again in 30 minutes)
   - Double-check the TXT record value is exact (no extra spaces)
   - Use DNS Checker to confirm propagation

### Verify in Bing Webmaster Tools

1. Return to the Bing Webmaster Tools verification window
   - If you closed it, go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
   - Click **Add a site** → Enter `https://wuzzlegames.com`
2. Click **Verify** button
3. **If successful**: You'll see a success message
4. **If it fails**:
   - Wait longer for DNS propagation
   - Verify the TXT record is correct
   - Try again in 30 minutes

---

## 🔍 Troubleshooting

### Verification Fails Immediately

**Problem**: Verification fails right after clicking verify

**Solutions**:
1. DNS hasn't propagated yet - wait 30-60 minutes
2. Check DNS Checker to confirm records are visible
3. Verify you added the TXT record to the correct domain (wuzzlegames.com)

### TXT Record Not Showing in DNS Checker

**Problem**: DNS Checker doesn't show your TXT records

**Solutions**:
1. Wait longer - propagation can take time
2. Log back into GoDaddy and verify the records were saved
3. Check for typos in the verification codes
4. Ensure you used `@` for the Name field (not blank or www)

### Multiple TXT Records Conflict

**Problem**: Worried about having multiple TXT records

**Solution**: 
- It's perfectly fine to have multiple TXT records for the same domain
- Both Google and Bing TXT records can coexist
- They serve different purposes and won't interfere with each other

### Lost Verification Code

**Problem**: You closed the window and lost the verification code

**Solutions**:

**For Google Search Console**:
1. Go to [Google Search Console](https://search.google.com/search-console/)
2. Try to add the property again
3. The same verification code will be shown
4. Or use alternative verification method (HTML file upload)

**For Bing Webmaster Tools**:
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters/)
2. Try to add the site again
3. The verification code will be shown again

### GoDaddy Interface Looks Different

**Problem**: Your GoDaddy interface doesn't match these instructions

**Solutions**:
1. GoDaddy occasionally updates their interface
2. Look for "DNS Settings", "DNS Management", or "Manage DNS"
3. The core concepts remain the same: Add TXT record with @ as name
4. Contact GoDaddy support if you can't find DNS settings

---

## 📸 Visual Guide

### What a TXT Record Looks Like in GoDaddy

```
┌─────────────────────────────────────────────────────┐
│ Type: TXT                                           │
│ Name: @                                             │
│ Value: google-site-verification=abc123...          │
│ TTL:  1 Hour                                        │
│                                                     │
│ [Cancel]                            [Save Record]  │
└─────────────────────────────────────────────────────┘
```

### DNS Records Table After Adding Both

```
Type    Name    Value                                    TTL
─────────────────────────────────────────────────────────────
A       @       [Your server IP]                         1 Hour
CNAME   www     @                                        1 Hour
TXT     @       google-site-verification=abc123...       1 Hour
TXT     @       [Bing verification code]                 1 Hour
```

---

## ✨ Success Indicators

You'll know verification is successful when:

### Google Search Console
- ✅ Green checkmark appears
- ✅ Message: "Ownership verified"
- ✅ You can access Search Console dashboard
- ✅ Property appears in your property list

### Bing Webmaster Tools
- ✅ Success message appears
- ✅ Site shows "Verified" badge
- ✅ You can access Webmaster Tools dashboard
- ✅ Site appears in your sites list

---

## 🔄 Alternative Verification Methods

If DNS verification doesn't work, you can use alternative methods:

### Google Search Console Alternatives
1. **HTML File Upload**: Upload a verification file to your website root
2. **HTML Tag**: Add a meta tag to your homepage
3. **Google Analytics**: Use existing GA4 tracking code
4. **Google Tag Manager**: Use existing GTM container

### Bing Webmaster Tools Alternatives
1. **XML File**: Upload an XML file to your website root
2. **Meta Tag**: Add a meta tag to your homepage

**Note**: DNS verification is recommended as it's the most reliable and doesn't require code changes.

---

## 📞 Getting Help

### GoDaddy Support
- **Phone**: 1-480-505-8877
- **Chat**: Available in GoDaddy dashboard
- **Help Center**: https://www.godaddy.com/help

### Google Search Console Support
- **Help Center**: https://support.google.com/webmasters
- **Community Forum**: https://support.google.com/webmasters/community

### Bing Webmaster Tools Support
- **Help Center**: https://www.bing.com/webmasters/help
- **Support Forum**: Available in Webmaster Tools dashboard

---

## 📝 Quick Checklist

Use this checklist to track your progress:

- [ ] Obtained Google Search Console verification code
- [ ] Obtained Bing Webmaster Tools verification code
- [ ] Logged into GoDaddy account
- [ ] Accessed DNS management for wuzzlegames.com
- [ ] Added Google TXT record (Type: TXT, Name: @)
- [ ] Added Bing TXT record (Type: TXT, Name: @)
- [ ] Saved both DNS records
- [ ] Waited 30-60 minutes for propagation
- [ ] Checked DNS propagation at dnschecker.org
- [ ] Verified domain in Google Search Console
- [ ] Verified domain in Bing Webmaster Tools
- [ ] Confirmed access to both dashboards

---

## 🎉 Next Steps After Verification

Once both domains are verified:

1. **Submit Sitemap to Google Search Console**
   - Go to Sitemaps section
   - Submit: `sitemap.xml`

2. **Submit Sitemap to Bing Webmaster Tools**
   - Go to Sitemaps section
   - Submit: `https://wuzzlegames.com/sitemap.xml`

3. **Monitor Performance**
   - Check Search Console weekly for indexing status
   - Review search queries and impressions
   - Monitor for crawl errors

4. **Set Up Email Alerts**
   - Enable notifications for critical issues
   - Get alerts for manual actions or security issues

---

**Last Updated**: February 23, 2026
**Domain**: wuzzlegames.com
**Registrar**: GoDaddy
