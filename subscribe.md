# Subscription Implementation Guide

This document outlines the steps needed to complete the subscription implementation for Wuzzle Games.

## Overview

The subscription system has been architected with the following components:

1. **Subscription Hook** (`src/hooks/useSubscription.js`) - Manages subscription state and provides utilities
2. **Premium Badge** - Automatically granted to subscribed users
3. **Subscribe Modal** (`src/components/SubscribeModal.jsx`) - Payment UI component
4. **Subscribe Buttons** - Added to header and all end-game popups
5. **Firebase Rules** - Updated to support subscription data

## Completed Implementation

✅ Subscription state management hook
✅ Premium member badge system
✅ Subscribe modal UI component
✅ Subscribe buttons in header (after username, only shown if not subscribed)
✅ Subscribe buttons in all end-game popups (GamePopup, OutOfGuessesPopup)
✅ Firebase rules updated for subscription data
✅ Architecture for premium features (themed wordle, custom colors, etc.)

## Required Steps to Complete

### 1. Set Up Stripe Account

1. **Create a Stripe Account:**
   - Go to https://stripe.com and create an account
   - Complete the account setup (business information, bank details, etc.)
   - Switch to **Test Mode** for development (toggle in Stripe Dashboard)

2. **Get Your Stripe Keys:**
   - In Stripe Dashboard, go to **Developers** → **API keys**
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
   - Keep these keys secure - you'll need them for the Firebase Extension

3. **Create a Product and Price in Stripe:**
   - Go to **Products** in Stripe Dashboard
   - Click **+ Add product**
   - Name: "Wuzzle Games Premium"
   - Description: "Monthly subscription for premium features"
   - Pricing: **Recurring**, **Monthly**, **$2.00 USD**
   - Save the **Price ID** (starts with `price_`) - you'll need this later

### 2. Enable Firestore (If Not Already Enabled)

The Stripe Firebase Extension uses **Firestore** to store subscription data. If you're currently only using Realtime Database, you'll need to enable Firestore:

1. **Enable Firestore:**
   - Go to Firebase Console → **Firestore Database**
   - Click **Create database**
   - Choose **Start in test mode** (you'll update rules later)
   - Select a location for your database
   - Click **Enable**

**Note:** Your app can use both Realtime Database (for game data) and Firestore (for Stripe subscriptions). They work together seamlessly.

### 3. Install Stripe Firebase Extension

The Firebase Extension for Stripe handles all backend logic automatically - no custom backend needed!

1. **Install the Extension:**
   - Go to Firebase Console → **Extensions** (or visit https://console.firebase.google.com/project/_/extensions)
   - Click **Browse all extensions** or search for "Stripe Payments"
   - Find and install **"Stripe Payments"** extension (official Firebase extension)
   - Alternatively, use the direct link: https://firebase.google.com/products/extensions/stripe-payments

2. **Configure the Extension:**
   During installation, you'll be prompted for:
   - **Stripe API key (Secret key)**: Paste your Stripe Secret key (from step 1.2)
   - **Stripe Publishable key**: Paste your Stripe Publishable key (from step 1.2)
   - **Products collection path**: `products` (default - Firestore collection)
   - **Customers collection path**: `customers` (default - Firestore collection)
   - **Stripe webhook signing secret**: Leave empty initially (will be generated after installation)

3. **Complete Installation:**
   - Review the configuration
   - Accept the billing (Firebase Extensions may have usage costs)
   - Click **Install extension**
   - Wait for installation to complete (may take a few minutes)

4. **Get Webhook Signing Secret:**
   - After installation, go to the extension details
   - Find the **Webhook signing secret** (starts with `whsec_`)
   - Copy this - you'll need it for webhook configuration

5. **Configure Stripe Webhook:**
   - In Stripe Dashboard, go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: Use the webhook URL provided by the Firebase Extension
   - Events to send: Select these events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Add the webhook signing secret from step 4
   - Save the webhook

### 3. Install Stripe.js in Your Project

1. **Install the Stripe.js package:**
   ```bash
   npm install @stripe/stripe-js
   ```

2. **Add Stripe Publishable Key to Environment:**
   Add to your `.env` file:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
   ```

### 5. Update SubscribeModal Component

The `SubscribeModal` component needs to be updated to use Firebase Extensions with Stripe:

1. **Update `src/components/SubscribeModal.jsx`** with the following integration:

```javascript
import { loadStripe } from '@stripe/stripe-js';
import { ref, set } from 'firebase/database';
import { database } from '../config/firebase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// In your handleSubscribe function:
const handleSubscribe = async () => {
  if (!user?.uid) {
    setError('You must be signed in to subscribe');
    return;
  }

  setLoading(true);
  setError(null);
  setPaymentProcessing(true);

  try {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to load');

    // Create a checkout session via Firebase Extension
    // The extension creates a checkout session in Firestore
    const checkoutSessionRef = ref(database, `checkout_sessions/${user.uid}`);
    
    // Create checkout session data
    const sessionData = {
      price: 'price_XXXXX', // Replace with your Stripe Price ID from step 1
      success_url: window.location.origin + '/?subscription=success',
      cancel_url: window.location.origin + '/?subscription=cancelled',
      mode: 'subscription', // For recurring payments
    };

    // Write to Firestore - the extension will handle creating the Stripe session
    await set(checkoutSessionRef, sessionData);

    // The extension will create a sessionId in the same document
    // Listen for the sessionId and redirect to Stripe Checkout
    const unsubscribe = onValue(checkoutSessionRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.sessionId) {
        unsubscribe(); // Stop listening
        // Redirect to Stripe Checkout
        stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    });

  } catch (err) {
    console.error('Subscription error:', err);
    setError(err?.message || 'Failed to start subscription. Please try again.');
    setPaymentProcessing(false);
    setLoading(false);
  }
};
```

**Alternative Approach (Using Firestore directly):**

The Firebase Extension uses Firestore. You'll need to add Firestore to your Firebase config:

1. **Update `src/config/firebase.js`:**
```javascript
import { getFirestore } from 'firebase/firestore';

// Add this export
export const firestore = getFirestore(app);
```

2. **Then in SubscribeModal:**
```javascript
import { loadStripe } from '@stripe/stripe-js';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const handleSubscribe = async () => {
  if (!user?.uid) {
    setError('You must be signed in to subscribe');
    return;
  }

  setLoading(true);
  setError(null);
  setPaymentProcessing(true);

  try {
    const stripe = await stripePromise;
    if (!stripe) throw new Error('Stripe failed to load');

    // Create checkout session document in Firestore
    // The Firebase Extension listens to this and creates a Stripe session
    const docRef = await addDoc(collection(firestore, 'checkout_sessions'), {
      price: 'price_XXXXX', // Your Stripe Price ID
      success_url: window.location.origin + '/?subscription=success',
      cancel_url: window.location.origin + '/?subscription=cancelled',
      mode: 'subscription',
      customer: user.uid, // Link to your user
    });

    // Listen for sessionId from the extension
    const unsubscribe = onSnapshot(docRef, (doc) => {
      const data = doc.data();
      if (data?.sessionId) {
        unsubscribe();
        stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    });

  } catch (err) {
    console.error('Subscription error:', err);
    setError(err?.message || 'Failed to start subscription. Please try again.');
    setPaymentProcessing(false);
    setLoading(false);
  }
};
```

2. **Handle Subscription Success:**
   - After successful payment, Stripe redirects to your `success_url`
   - The Firebase Extension automatically creates/updates the subscription in Firestore
   - You need to sync this with your Realtime Database subscription data
   - Add a success handler in your app to check for `?subscription=success` in the URL
   - When detected, call `activateSubscription()` to sync to Realtime Database

### 5. Sync Stripe Subscription to Realtime Database

The Firebase Extension stores subscription data in Firestore, but your app uses Realtime Database. You need to sync them:

1. **Create a sync function** or update your subscription hook to also check Firestore:

```javascript
// In useSubscription.js, add Firestore check
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../config/firebase';

// Check Firestore for Stripe subscription status
// The extension stores subscription data at: customers/{uid}/subscriptions/{subscriptionId}
```

2. **Or create a Cloud Function** (optional) to sync Firestore → Realtime Database automatically

### 7. Update Firebase Rules

The updated Firebase rules are in `FIREBASE_RULES_WITH_SUBSCRIPTION.json`. 

**To apply:**
1. Go to Firebase Console → Realtime Database → Rules
2. Copy the contents of `FIREBASE_RULES_WITH_SUBSCRIPTION.json`
3. Paste and publish the rules

**Also update Firestore Rules** (if using Firestore for Stripe Extension):
1. Go to Firebase Console → Firestore Database → Rules
2. Add rules for checkout_sessions and customers collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to create checkout sessions
    match /checkout_sessions/{sessionId} {
      allow create: if request.auth != null && request.resource.data.customer == request.auth.uid;
      allow read: if request.auth != null && resource.data.customer == request.auth.uid;
    }
    
    // Allow users to read their own customer data
    match /customers/{customerId} {
      allow read: if request.auth != null && customerId == request.auth.uid;
    }
  }
}
```

### 4. Update Firebase Rules

The updated Firebase rules are in `FIREBASE_RULES_WITH_SUBSCRIPTION.json`. 

**To apply:**
1. Go to Firebase Console → Realtime Database → Rules
2. Copy the contents of `FIREBASE_RULES_WITH_SUBSCRIPTION.json`
3. Paste and publish the rules

**Important:** The subscription rules allow:
- Users to read/write their own subscription data
- Other users cannot read subscription data (privacy)

### 7. Set Up Auto-Renewal

The Firebase Extension for Stripe **automatically handles recurring subscriptions**:

1. **Automatic Renewal:**
   - Stripe automatically charges the customer each month
   - The Firebase Extension listens to Stripe webhooks
   - Subscription status is automatically updated in Firestore
   - No additional setup needed for basic auto-renewal!

2. **Monitor Renewals:**
   - Check Stripe Dashboard → **Subscriptions** to see active subscriptions
   - The extension updates Firestore when renewals succeed or fail
   - You can listen to Firestore changes to sync to Realtime Database

3. **Handle Failed Renewals** (Optional):
   - The extension will update subscription status if payment fails
   - You can add logic to notify users of failed payments
   - Stripe will retry failed payments automatically

### 8. Environment Variables

Add to your `.env` file:
```env
# Stripe Publishable Key (frontend only - safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key

# Note: Secret key is configured in Firebase Extension, NOT in .env
```

**Important:** Never add your Stripe Secret key to `.env` - it's configured in the Firebase Extension settings.

### 9. Testing

1. **Test Subscription Flow:**
   - Sign in as a test user
   - Click Subscribe button
   - Complete payment (use test cards from your payment provider)
   - Verify premium badge appears
   - Verify Subscribe button disappears

2. **Test Premium Features:**
   - Once subscription is active, test premium features
   - Verify access control works correctly

3. **Test Edge Cases:**
   - Expired subscriptions
   - Cancelled subscriptions
   - Payment failures
   - Network errors

### 10. Premium Features Implementation

The architecture is ready for premium features. To add them:

1. **Check Premium Access:**
   ```javascript
   import { useSubscription, hasPremiumAccess } from '../hooks/useSubscription';
   import { useAuth } from '../hooks/useAuth';
   
   const { user } = useAuth();
   const { isSubscribed } = useSubscription(user);
   
   if (hasPremiumAccess(user, isSubscribed)) {
     // Show premium feature
   }
   ```

2. **Example: Themed Wordle**
   - Add theme selection UI (only visible to premium users)
   - Store theme preference in user profile
   - Apply theme to game board

3. **Example: Custom Colors**
   - Add color picker (premium only)
   - Store color preferences
   - Apply custom colors to game

### 11. Subscription Management

Add subscription management features:

1. **Profile Page:**
   - Show subscription status (check Firestore: `customers/{uid}/subscriptions`)
   - Display renewal date from Stripe subscription
   - Cancel subscription button
   - Update payment method (via Stripe Customer Portal)

2. **Cancel Subscription:**
   - Use Stripe API or Customer Portal to cancel
   - The Firebase Extension will update Firestore automatically
   - Sync cancellation to Realtime Database using `cancelSubscription()`
   - Subscription remains active until the end of the billing period

3. **Stripe Customer Portal** (Recommended):
   - Set up Stripe Customer Portal in Stripe Dashboard
   - Allows users to manage subscriptions, update payment methods, view invoices
   - Redirect users to portal: `stripe.billingPortal.sessions.create()`
   - The Firebase Extension can help integrate this

### 12. Legal & Compliance

1. **Terms of Service:**
   - Add subscription terms
   - Auto-renewal disclosure
   - Cancellation policy

2. **Privacy Policy:**
   - Disclose payment data handling
   - Subscription data storage

3. **Refund Policy:**
   - Define refund terms
   - Implement refund handling

## File Structure

```
src/
├── hooks/
│   └── useSubscription.js          # Subscription state management
├── components/
│   ├── SubscribeModal.jsx         # Payment modal (needs payment integration)
│   ├── SiteHeader.jsx             # Subscribe button in header
│   └── game/
│       ├── GamePopup.jsx          # Subscribe button in end-game popup
│       └── OutOfGuessesPopup.jsx  # Subscribe button in out-of-guesses popup
└── lib/
    └── badges.js                   # Premium badge definition

FIREBASE_RULES_WITH_SUBSCRIPTION.json  # Updated Firebase rules
```

## Next Steps

1. **Immediate:** 
   - Create Stripe account and get API keys
   - Create product and price in Stripe
   - Install Stripe Firebase Extension
   - Configure webhook

2. **Short-term:** 
   - Update SubscribeModal with Stripe integration
   - Install @stripe/stripe-js package
   - Test subscription flow with test cards

3. **Short-term:** 
   - Sync Firestore subscription data to Realtime Database
   - Handle subscription success redirect
   - Update Firebase rules (both Realtime DB and Firestore)

4. **Medium-term:** 
   - Add subscription management UI to profile page
   - Set up Stripe Customer Portal
   - Add subscription status display

5. **Long-term:** 
   - Implement premium features (themed wordle, custom colors, etc.)
   - Add analytics for subscription metrics

## Notes

- **Firebase Extension handles all backend logic** - no custom backend needed!
- The extension stores subscription data in **Firestore** (not Realtime Database)
- Your app uses **Realtime Database** for subscription status
- You may need to sync between Firestore (extension) and Realtime Database (your app)
- Subscription data structure in Firestore: `customers/{uid}/subscriptions/{subscriptionId}`
- Premium badge is automatically granted when subscription is activated
- Subscribe buttons only show for non-subscribed users
- All subscription data is private to each user (Firebase rules enforce this)
- Stripe automatically handles recurring billing - no manual renewal logic needed
- The extension listens to Stripe webhooks and updates Firestore automatically

## Support

For questions or issues:

1. **Firebase Extension Issues:**
   - Check extension logs in Firebase Console → Extensions
   - Review extension documentation: https://firebase.google.com/products/extensions/stripe-payments
   - Check extension configuration in Firebase Console

2. **Stripe Issues:**
   - Check Stripe Dashboard → **Events** for webhook events
   - Verify webhook is receiving events from Stripe
   - Check Stripe Dashboard → **Logs** for API errors
   - Stripe documentation: https://stripe.com/docs

3. **Integration Issues:**
   - Review Firebase rules (both Realtime DB and Firestore)
   - Check browser console for errors
   - Verify Stripe Publishable key is correct in `.env`
   - Test with Stripe test mode and test cards first

4. **Common Issues:**
   - **Webhook not working:** Verify webhook URL and signing secret
   - **Subscription not syncing:** Check Firestore for subscription data, sync to Realtime DB
   - **Payment fails:** Check Stripe Dashboard for payment errors
   - **Extension not responding:** Check extension status in Firebase Console

5. **Resources:**
   - Firebase Extensions: https://firebase.google.com/products/extensions
   - Stripe Testing: https://stripe.com/docs/testing
   - Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions/overview



---------
How to Use from firebase:
Client SDK
You can use the @stripe/firestore-stripe-payments
JavaScript package to easily access this extension from web clients. This client SDK provides
TypeScript type definitions and high-level convenience APIs for most common operations client
applications would want to implement using the extension.

Use a package manager like NPM to install the above package, and use it in conjunction with
the Firebase Web SDK.

Configuring the extension
Before you proceed, make sure you have the following Firebase services set up:

Cloud Firestore to store customer & subscription details.
Follow the steps in the documentation to create a Cloud Firestore database.
Firebase Authentication to enable different sign-up options for your users.
Enable the sign-in methods in the Firebase console that you want to offer your users.
Set your Cloud Firestore security rules
It is crucial to limit data access to authenticated users only and for users to only be able to see their own information. For product and pricing information it is important to disable write access for client applications. Use the rules below to restrict access as recommended in your project’s Cloud Firestore rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customers/{uid} {
      allow read: if request.auth.uid == uid;

      match /checkout_sessions/{id} {
        allow read, write: if request.auth.uid == uid;
      }
      match /subscriptions/{id} {
        allow read: if request.auth.uid == uid;
      }
      match /payments/{id} {
        allow read: if request.auth.uid == uid;
      }
    }

    match /products/{id} {
      allow read: if true;

      match /prices/{id} {
        allow read: if true;
      }

      match /tax_rates/{id} {
        allow read: if true;
      }
    }
  }
}
Configure Stripe webhooks
You need to set up a webhook that synchronizes relevant details from Stripe with your Cloud Firestore. This includes product and pricing data from the Stripe Dashboard, as well as customer’s subscription details.

Here’s how to set up the webhook and configure your extension to use it:

Configure your webhook:

Go to the Stripe dashboard.

Use the URL of your extension’s function as the endpoint URL. Here’s your function’s URL: https://us-central1-better-wrodle.cloudfunctions.net/ext-firestore-stripe-payments-handleWebhookEvents

Select the following events:

product.created
product.updated
product.deleted
price.created
price.updated
price.deleted
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
payment_intent.processing
payment_intent.succeeded
payment_intent.canceled
payment_intent.payment_failed
tax_rate.created (optional)
tax_rate.updated (optional)
invoice.paid (optional, will sync invoices to Cloud Firestore)
invoice.payment_succeeded (optional, will sync invoices to Cloud Firestore)
invoice.payment_failed (optional, will sync invoices to Cloud Firestore)
invoice.upcoming (optional, will sync invoices to Cloud Firestore)
invoice.marked_uncollectible (optional, will sync invoices to Cloud Firestore)
invoice.payment_action_required (optional, will sync invoices to Cloud Firestore)
Using the Firebase console or Firebase CLI, reconfigure your extension with your webhook’s signing secret (such as, whsec_12345678). Enter the value in the parameter called Stripe webhook secret.

Create product and pricing information (only required when building on the web platform)
For Stripe to automatically bill your users for recurring payments, you need to create your product and pricing information in the Stripe Dashboard. When you create or update your product and price information in the Stripe Dashboard these details are automatically synced with your Cloud Firestore, as long as the webhook is configured correctly as described above.

The extension currently supports pricing plans that bill a predefined amount at a specific interval. More complex plans (e.g. different pricing tiers or seats) are not yet supported. If you’d like to see support for these, please open a feature request issue with details about your business model and pricing plans.

For example, this extension works well for business models with different access level tiers, e.g.:

Product 1: Basic membership
Price 1: 10 USD per month
Price 2: 100 USD per year
Price 3: 8 GBP per month
Price 4: 80 GBP per year
[…]: additional currency and interval combinations
Product 2: Premium membership
Price 1: 20 USD per month
Price 2: 200 USD per year
Price 3: 16 GBP per month
Price 4: 160 GBP per year
[…]: additional currency and interval combinations
Assign custom claim roles to products (only used for subscriptions)
If you want users to get assigned a custom claim role to give them access to certain data when subscribed to a specific product, you can set a firebaseRole metadata value on the Stripe product (see screenshot).

The value you set for firebaseRole (e.g. “premium” in the screenshot above) will be set as a custom claim stripeRole on the user. This allows you to set specific security access rules based on the user’s roles, or limit access to certain pages. For example if you have one basic role and one premium role you could add the following to your Cloud Firestore rules:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function hasBasicSubs() {
      return request.auth.token.stripeRole == "basic";
    }

    function hasPremiumSubs() {
      return request.auth.token.stripeRole == "premium";
    }

    match /content-basic/{doc} {
      allow read: if hasBasicSubs() || hasPremiumSubs();
    }
    match /content-premium/{doc} {
      allow read: if hasPremiumSubs();
    }
  }
}
Alternatively you can validate their role client-side with the JavaScript SDK. When doing so you need to make sure to force-refresh the user token:

async function getCustomClaimRole() {
  await firebase.auth().currentUser.getIdToken(true);
  const decodedToken = await firebase.auth().currentUser.getIdTokenResult();
  return decodedToken.claims.stripeRole;
}
Configure the Stripe customer portal (only used for subscriptions)
Set your custom branding in the settings.
Configure the Customer Portal settings.
Toggle on “Allow customers to update their payment methods”.
Toggle on “Allow customers to update subscriptions”.
Toggle on “Allow customers to cancel subscriptions”.
Add the products and prices that you want to allow customer to switch between.
Set up the required business information and links.
Using the extension
Once you’ve configured the extension you can add payments and access control to your websites and mobile apps fully client-side with the corresponding Firebase SDKs. You can experience a subscriptions demo application at https://stripe-subs-ext.web.app and find the demo source code on GitHub;

Sign-up users with Firebase Authentication
The quickest way to sign-up new users is by using the FirebaseUI library. Follow the steps outlined in the official docs. When configuring the extension you can choose to ‘Sync’ new users to Stripe. If set to ‘Sync’, the extension listens to new users signing up and then automatically creates a Stripe customer object and a customer record in your Cloud Firestore. If set to ‘Do not sync’ (default), the extension will create the customer object “on the fly” with the first checkout session creation.

List available products and prices
Products and pricing information are normal collections and docs in your Cloud Firestore and can be queried as such:

db.collection('products')
  .where('active', '==', true)
  .get()
  .then(function (querySnapshot) {
    querySnapshot.forEach(async function (doc) {
      console.log(doc.id, ' => ', doc.data());
      const priceSnap = await doc.ref.collection('prices').get();
      priceSnap.docs.forEach((doc) => {
        console.log(doc.id, ' => ', doc.data());
      });
    });
  });
One-time payments on the web
You can create Checkout Sessions for one-time payments when referencing a one-time price ID. One-time payments will be synced to Cloud Firestore into a payments collection for the relevant customer doc if you update your webhook handler in the Stripe dashboard to include the following events: payment_intent.succeeded, payment_intent.payment_failed, payment_intent.canceled, payment_intent.processing.

To create a Checkout Session ID for a one-time payment, pass mode: 'payment to the Checkout Session doc creation:

const docRef = await db
  .collection('customers')
  .doc(currentUser.uid)
  .collection("checkout_sessions")
  .add({
    mode: "payment",
    price: "price_1GqIC8HYgolSBA35zoTTN2Zl", // One-time price created in Stripe
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Mobile payments (with the mobile payment sheet on iOS and Android)
One-time payments
To create a one time payment in your mobile application, create a new doc in your customers/{uid}/checkout_sessions collection with the following parameters:

client: ‘mobile’
mode: ‘payment’
amount: {payment amount}
currency: {currency code}
Then listen for the extension to append paymentIntentClientSecret, ephemeralKeySecret, and customer to the doc and use these to integrate the mobile payment sheet.

Set up a payment method for future usage
You can collect a payment method from your customer to charge it at a later point in time. To do so create a new doc in your customers/{uid}/checkout_sessions collection with the following parameters:

client: ‘mobile’
mode: ‘setup’
Then listen for the extension to append setupIntentClientSecret, ephemeralKeySecret, and customer to the doc and use these to integrate the mobile payment sheet.

Subscription payments (web only)
Start a subscription with Stripe Checkout
To subscribe the user to a specific pricing plan, create a new doc in the checkout_sessions collection for the user. The extension will update the doc with a Stripe Checkout session ID which you then use to redirect the user to the checkout page.

const docRef = await db
  .collection('customers')
  .doc(currentUser.uid)
  .collection('checkout_sessions')
  .add({
    price: 'price_1GqIC8HYgolSBA35zoTTN2Zl',
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
// Wait for the CheckoutSession to get attached by the extension
docRef.onSnapshot((snap) => {
  const { error, url } = snap.data();
  if (error) {
    // Show an error to your customer and
    // inspect your Cloud Function logs in the Firebase console.
    alert(`An error occured: ${error.message}`);
  }
  if (url) {
    // We have a Stripe Checkout URL, let's redirect.
    window.location.assign(url);
  }
});
Handling trials
By default, the trial period days that you’ve specified on the pricing plan will be applied to the checkout session. Should you wish to not offer the trial for a certain user (e.g. they’ve previously had a subscription with a trial that they canceled and are now signing up again), you can specify trial_from_plan: false when creating the checkout session doc:

const docRef = await db
  .collection("customers")
  .doc(currentUser)
  .collection("checkout_sessions")
  .add({
    price: "price_1GqIC8HYgolSBA35zoTTN2Zl",
    trial_from_plan: false,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Applying discount, coupon, promotion codes
You can create customer-facing promotion codes in the Stripe Dashboard. Refer to the docs for a detailed guide on how to set these up.

In order for the promotion code redemption box to show up on the checkout page, set allow_promotion_codes: true when creating the checkout_sessions document:

const docRef = await db
  .collection('customers')
  .doc(currentUser)
  .collection('checkout_sessions')
  .add({
    price: 'price_1GqIC8HYgolSBA35zoTTN2Zl',
    allow_promotion_codes: true,
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Applying promotion codes programmatically
You can set a promotion code to be applied to the checkout session without the customer needing to input it.

NOTE: anyone with access to a promotion code ID would be able to apply it to their checkout session. Therefore make sure to limit your promotion codes and archive any codes you don’t want to offer anymore.

const docRef = await db
  .collection('customers')
  .doc(currentUser.uid)
  .collection("checkout_sessions")
  .add({
    promotion_code: "promo_1HCrfVHYgolSBA35b1q98MNk",
    price: "price_1GqIC8HYgolSBA35zoTTN2Zl",
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Automatic tax calculation with Stripe Tax
Stripe Tax lets you calculate and collect sales tax, VAT, and GST. Know where to register, automatically collect the right amount of tax, and access the reports you need to file returns.

Request access: https://stripe.com/tax#request-access
Set up Stripe Tax in the Dashboard: https://stripe.com/docs/tax/set-up
Enable automatic tax calculation when creating your checkout_sessions docs:
const docRef = await db
  .collection('customers')
  .doc(currentUser.uid)
  .collection("checkout_sessions")
  .add({
    automatic_tax: true, // Automatically calculate tax based on the customer's address
    tax_id_collection: true, // Collect the customer's tax ID (important for B2B transactions)
    price: "price_1GqIC8HYgolSBA35zoTTN2Zl",
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Applying tax rates dynamically
Stripe Checkout supports applying the correct tax rate for customers in US, GB, AU, and all countries in the EU. With dynamic tax rates, you create tax rates for different regions (e.g., a 20% VAT tax rate for customers in the UK and a 7.25% sales tax rate for customers in California, US) and Stripe attempts to match your customer’s location to one of those tax rates.

const docRef = await db
  .collection('customers')
  .doc(currentUser)
  .collection("checkout_sessions")
  .add({
    line_items: [
      {
        price: "price_1HCUD4HYgolSBA35icTHEXd5",
        quantity: 1,
        dynamic_tax_rates: ["txr_1IJJtvHYgolSBA35ITTBOaew", "txr_1Hlsk0HYgolSBA35rlraUVWO", "txr_1HCshzHYgolSBA35WkPjzOOi"],
      },
    ],
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Applying static tax rates
You can collect and report taxes with Tax Rates. To apply tax rates to the subscription, you first need to create your tax rates in the Stripe Dashboard. When creating a new checkout_sessions document, specify the optional tax_rates list with up to five tax rate IDs:

const docRef = await db
  .collection('customers')
  .doc(currentUser)
  .collection('checkout_sessions')
  .add({
    price: 'price_1GqIC8HYgolSBA35zoTTN2Zl',
    tax_rates: ['txr_1HCjzTHYgolSBA35m0e1tJN5'],
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Collecting a shipping address during checkout
To collect a shipping address from your customer during checkout, you need to create a shipping_countries doc in your products collection. This doc needs to have a field called allowed_countries which needs to be an array. In this array, add the country codes for the countries that you ship to. You can find a list of supported countries here.

Secondly, you need to add collect_shipping_address: true to the Checkout Session doc creation:

const docRef = await db
  .collection('customers')
  .doc(currentUser.uid)
  .collection("checkout_sessions")
  .add({
    collect_shipping_address: true,
    price: "price_1GqIC8HYgolSBA35zoTTN2Zl",
    success_url: window.location.origin,
    cancel_url: window.location.origin,
  });
Setting metadata on the subscription
You can optionally set a metadata object with key-value pairs when creating the checkout session. This can be useful for storing additional information about the customer’s subscription. This metadata will be synced to both the Stripe subscription object (making it searchable in the Stripe Dashboard) and the subscription document in the Cloud Firestore.

const docRef = await db
  .collection('customers')
  .doc(currentUser)
  .collection('checkout_sessions')
  .add({
    price: 'price_1GqIC8HYgolSBA35zoTTN2Zl',
    success_url: window.location.origin,
    cancel_url: window.location.origin,
    metadata: {
      item: 'item001',
    },
  });
Adding multiple prices, including one-time setup fees
In addition to recurring prices, you can add one-time prices. These will only be on the initial invoice. This is useful for adding setup fees or other one-time fees associated with a subscription. To do so you will need to pass a line_items array instead:

const docRef = await db
    .collection('customers')
    .doc(currentUser)
    .collection('checkout_sessions')
    .add({
      line_items: [
        {
          price: 'price_1HCUD4HYgolSBA35icTHEXd5', // RECURRING_PRICE_ID
          quantity: 1,
          tax_rates: ['txr_1HCjzTHYgolSBA35m0e1tJN5'],
        },
        {
          price: 'price_1HEtgDHYgolSBA35LMkO3ExX', // ONE_TIME_PRICE_ID
          quantity: 1,
          tax_rates: ['txr_1HCjzTHYgolSBA35m0e1tJN5'],
        },
      ],
      success_url: window.location.origin,
      cancel_url: window.location.origin,
    });
NOTE: If you specify more than one recurring price in the line_items array, the subscription object in Cloud Firestore will list all recurring prices in the prices array. The price attribute on the subscription in Cloud Firestore will be equal to the first item in the prices array: price === prices[0].

Note that the Stripe customer portal currently does not support changing subscriptions with multiple recurring prices. In this case the portal will only offer the option to cancel the subscription.

Start a subscription via the Stripe Dashboard or API
Since version 0.1.7 the extension also syncs subscriptions that were not created via Stripe Checkout, e.g. via the Stripe Dashboard or via Elements and the API.

In order for this to work, Firebase Authentication users need to be synced with Stripe customer objects and the customers collection in Cloud Firestore (new configuration added in version 0.1.7).

Get the customer’s subscription
Subscription details are synced to the subscriptions sub-collection in the user’s corresponding customer doc.

db.collection('customers')
  .doc(currentUser.uid)
  .collection('subscriptions')
  .where('status', 'in', ['trialing', 'active'])
  .onSnapshot(async (snapshot) => {
    // In this implementation we only expect one active or trialing subscription to exist.
    const doc = snapshot.docs[0];
    console.log(doc.id, ' => ', doc.data());
  });
Redirect to the customer portal
Once a customer is subscribed you should show them a button to access the customer portal to view their invoices and manage their payment & subscription details. When the user clicks that button, call the createPortalLink function to get a portal link for them, then redirect them.

const functionRef = firebase
  .app()
  .functions('us-central1')
  .httpsCallable('ext-firestore-stripe-payments-createPortalLink');
const { data } = await functionRef({
  returnUrl: window.location.origin,
  locale: "auto", // Optional, defaults to "auto"
  configuration: "bpc_1JSEAKHYgolSBA358VNoc2Hs", // Optional ID of a portal configuration: https://stripe.com/docs/api/customer_portal/configuration
});
window.location.assign(data.url);

---

## ✅ FINAL STEPS TO COMPLETE SETUP

Based on your current setup, here's what you need to do:

### 1. Add Stripe Price ID to Environment Variables

Add your Stripe Price ID (the one you created in Stripe Dashboard) to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Your Stripe publishable key

# Regular subscription prices (recurring) - one per duration
VITE_STRIPE_PRICE_ID_1M=price_...
VITE_STRIPE_PRICE_ID_3M=price_...
VITE_STRIPE_PRICE_ID_6M=price_...
VITE_STRIPE_PRICE_ID_12M=price_...

# Gift subscription prices (one-time payments) - one per duration
VITE_STRIPE_GIFT_PRICE_ID_1M=price_...
VITE_STRIPE_GIFT_PRICE_ID_3M=price_...
VITE_STRIPE_GIFT_PRICE_ID_6M=price_...
VITE_STRIPE_GIFT_PRICE_ID_12M=price_...
```

**Important:** Replace the placeholders with actual Price IDs from your Stripe products. Regular subscriptions use recurring prices; gifts use one-time payment prices.

### 2. About "Basic" Metadata

**You do NOT need to add "Basic" metadata** unless you plan to offer a basic subscription tier. Since you only have "Premium" set up:

- ✅ Keep `firebaseRole: "Premium"` in your Stripe product metadata (already done)
- ❌ No need to add "Basic" unless you create a basic subscription product

The Firestore rules you have are fine - they check for both "basic" and "premium" roles, but if you only offer premium, only premium users will have the `stripeRole` claim set.

### 3. Test the Subscription Flow

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the subscription:**
   - Sign in to your app
   - Click the "Subscribe" button (in header or end-game popup)
   - You should be redirected to Stripe Checkout
   - Use Stripe test card: `4242 4242 4242 4242`
   - Complete the payment
   - You should be redirected back to your app with `?subscription=success`

3. **Verify subscription is active:**
   - Check that the Subscribe button disappears
   - Check that the Premium Member badge appears
   - Check Firestore: `customers/{uid}/subscriptions` should have an active subscription
   - Check that custom claim `stripeRole` is set to "premium" (may take a few seconds)

### 4. Verify Custom Claims

After a successful subscription, the Firebase Extension sets a custom claim `stripeRole: "premium"` on the user's auth token. To verify:

1. In browser console, run:
   ```javascript
   // After signing in and subscribing
   const user = firebase.auth().currentUser;
   const token = await user.getIdTokenResult(true);
   console.log('Stripe Role:', token.claims.stripeRole); // Should be "premium"
   ```

2. The custom claim may take a few seconds to propagate after subscription.

### 5. Monitor in Firebase Console

- **Firestore:** Check `customers/{uid}/subscriptions` for subscription data
- **Extensions:** Check extension logs for any errors
- **Authentication:** Custom claims are visible in user tokens

### 6. Monitor in Stripe Dashboard

- **Customers:** See your test customer
- **Subscriptions:** See active subscription
- **Events:** See webhook events (checkout.session.completed, customer.subscription.created, etc.)

### 7. Production Checklist

Before going live:

- [ ] Switch Stripe to **Live Mode** in Stripe Dashboard
- [ ] Update `.env` with live Stripe keys
- [ ] Update Firebase Extension configuration with live Stripe keys
- [ ] Test with real payment method (small amount)
- [ ] Verify webhook is working in live mode
- [ ] Set up Stripe Customer Portal (optional, for subscription management)
- [ ] Add terms of service and privacy policy links

### 8. Optional: Add Subscription Management UI

You can add a "Manage Subscription" button to your profile page that redirects to Stripe Customer Portal:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const openCustomerPortal = async () => {
  const functions = getFunctions();
  const createPortalLink = httpsCallable(
    functions,
    'ext-firestore-stripe-payments-createPortalLink'
  );
  
  const { data } = await createPortalLink({
    returnUrl: window.location.origin + '/profile',
  });
  
  window.location.assign(data.url);
};
```

### 9. Troubleshooting

If subscription doesn't work:

1. **Check browser console** for errors
2. **Check Firestore rules** - make sure they allow read/write to `checkout_sessions`
3. **Check extension logs** in Firebase Console → Extensions
4. **Verify webhook** is receiving events in Stripe Dashboard
5. **Check custom claims** - may take a few seconds to propagate
6. **Force refresh auth token** after subscription: `user.getIdTokenResult(true)`

### 10. Code Summary

The code has been updated to:
- ✅ Use Firestore with Firebase Extension for Stripe
- ✅ Check both Firestore subscriptions and custom claims (`stripeRole`)
- ✅ Sync subscription data to Realtime Database for backward compatibility
- ✅ Handle Stripe Checkout redirects
- ✅ Automatically grant premium badge when subscribed

**You're all set!** The subscription system is now fully integrated with your Firebase Extension setup.