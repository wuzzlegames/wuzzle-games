/**
 * Gift subscription Cloud Functions (2nd gen)
 *
 * Uses Firebase params and Secret Manager (no deprecated functions.config()).
 *
 * - createGiftCheckoutSession: callable; creates Stripe Checkout for one-time gift payment
 * - stripeGiftWebhook: HTTPS; Stripe webhook for checkout.session.completed
 * - adminGiftSubscription: callable; admin can grant premium without payment
 *
 * Setup:
 *   1. Secrets (Stripe secret + gift webhook signing secret):
 *      firebase functions:secrets:set STRIPE_SECRET_KEY
 *      firebase functions:secrets:set STRIPE_GIFT_WEBHOOK_SECRET
 *   2. String params STRIPE_GIFT_PRICE_ID_1M, _3M, _6M, _12M: set in functions/.env
 *   See gift-subs.md for full steps.
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineString, defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const firestore = admin.firestore();

const ADMIN_EMAIL = 'abhijeetsridhar14@gmail.com';

const DURATION_VALUES = ['1m', '3m', '6m', '12m'];
const DURATION_DAYS_MAP = { '1m': 30, '3m': 90, '6m': 180, '12m': 365 };

// Params: gift price IDs for one-time payments
const stripeGiftPriceId1m = defineString('STRIPE_GIFT_PRICE_ID_1M');
const stripeGiftPriceId3m = defineString('STRIPE_GIFT_PRICE_ID_3M');
const stripeGiftPriceId6m = defineString('STRIPE_GIFT_PRICE_ID_6M');
const stripeGiftPriceId12m = defineString('STRIPE_GIFT_PRICE_ID_12M');

const giftPriceIdMap = {
  '1m': stripeGiftPriceId1m,
  '3m': stripeGiftPriceId3m,
  '6m': stripeGiftPriceId6m,
  '12m': stripeGiftPriceId12m,
};

// Secrets: set via firebase functions:secrets:set STRIPE_SECRET_KEY etc.
const stripeSecret = defineSecret('STRIPE_SECRET_KEY');
const giftWebhookSecret = defineSecret('STRIPE_GIFT_WEBHOOK_SECRET');

/**
 * Callable: createGiftCheckoutSession(recipientUid, baseUrl, duration?)
 */
exports.createGiftCheckoutSession = onCall(
  { secrets: [stripeSecret] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to gift a subscription.');
    }

    const recipientUid = request.data?.recipientUid;
    if (!recipientUid || typeof recipientUid !== 'string') {
      throw new HttpsError('invalid-argument', 'recipientUid is required.');
    }

    const duration = request.data?.duration || '1m';
    if (!DURATION_VALUES.includes(duration)) {
      throw new HttpsError('invalid-argument', 'duration must be one of: 1m, 3m, 6m, 12m');
    }

    let secret;
    let priceId;
    try {
      secret = (stripeSecret.value() || '').trim();
      priceId = (giftPriceIdMap[duration].value() || '').trim();
    } catch (paramErr) {
      throw new HttpsError(
        'failed-precondition',
        'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_GIFT_PRICE_ID_* (e.g. in functions/.env).'
      );
    }
    if (!secret || !priceId) {
      throw new HttpsError(
        'failed-precondition',
        'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_GIFT_PRICE_ID_* (e.g. in functions/.env).'
      );
    }

    let recipientEmail;
    try {
      const recipientUser = await auth.getUser(recipientUid);
      recipientEmail = recipientUser.email || null;
    } catch (err) {
      throw new HttpsError('not-found', 'Recipient user not found.');
    }

    if (!recipientEmail) {
      throw new HttpsError(
        'failed-precondition',
        'Recipient has no email; cannot send gift checkout.'
      );
    }

    const baseUrl = (request.data?.baseUrl || '').replace(/\/$/, '');
    if (!baseUrl) {
      throw new HttpsError('invalid-argument', 'baseUrl is required (e.g. origin + base path).');
    }
    const successUrl = `${baseUrl}?subscription=success&gift=1`;
    const cancelUrl = `${baseUrl}?subscription=cancelled`;

    try {
      const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: recipientEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { recipient_uid: recipientUid, duration },
      });

      return { url: session.url };
    } catch (stripeErr) {
      throw new HttpsError(
        'failed-precondition',
        'Unable to start gift checkout. Please try again or contact support.'
      );
    }
  }
);

/**
 * HTTPS: Stripe webhook for gift checkout completion.
 */
exports.stripeGiftWebhook = onRequest(
  { secrets: [stripeSecret, giftWebhookSecret] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const sig = req.headers['stripe-signature'];
    const secret = (stripeSecret.value() || '').trim();
    const giftWebhookSecretVal = (giftWebhookSecret.value() || '').trim();
    if (!giftWebhookSecretVal || !secret) {
      console.error('Gift webhook or Stripe secret not configured');
      res.status(500).send('Webhook not configured');
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      console.error('Raw body not available for Stripe signature verification');
      res.status(500).send('Raw body not available');
      return;
    }

    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    let event;
    try {
      const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString();
      event = stripe.webhooks.constructEvent(payload, sig, giftWebhookSecretVal);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type !== 'checkout.session.completed') {
      res.status(200).send('OK');
      return;
    }

    const session = event.data.object;
    const recipientUid = session.metadata?.recipient_uid || session.subscription_data?.metadata?.recipient_uid;
    if (!recipientUid) {
      res.status(200).send('OK');
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      if (session.mode === 'payment') {
        // One-time gift payment: create subscription doc with duration-based expiry
        const duration = session.metadata?.duration || '1m';
        const durationDays = DURATION_DAYS_MAP[duration] ?? 30;
        const currentPeriodEnd = now + durationDays * 24 * 60 * 60;
        const docId = `gift_${session.payment_intent || session.id || Date.now()}`;

        const subscriptionDoc = {
          id: docId,
          status: 'active',
          current_period_end: currentPeriodEnd,
          created: now,
          updated_at: now,
        };

        const ref = firestore.doc(`customers/${recipientUid}/subscriptions/${docId}`);
        await ref.set(subscriptionDoc);
      } else {
        // Legacy subscription mode (if any)
        const subscriptionId = session.subscription;
        if (!subscriptionId) {
          res.status(200).send('OK');
          return;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const status = subscription.status;
        const currentPeriodEnd = subscription.current_period_end;
        const created = subscription.created;

        const subscriptionDoc = {
          id: subscription.id,
          status: status === 'active' || status === 'trialing' ? status : 'active',
          current_period_end: currentPeriodEnd,
          created,
          updated_at: now,
        };

        const ref = firestore.doc(`customers/${recipientUid}/subscriptions/${subscription.id}`);
        await ref.set(subscriptionDoc);
      }

      await auth.setCustomUserClaims(recipientUid, { stripeRole: 'premium' });
    } catch (err) {
      console.error('Error processing gift webhook:', err);
      res.status(500).send('Webhook handler error');
      return;
    }

    res.status(200).send('OK');
  }
);

/**
 * Callable: adminGiftSubscription(recipientUid, duration?)
 */
exports.adminGiftSubscription = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  if (request.auth.token.email !== ADMIN_EMAIL) {
    throw new HttpsError('permission-denied', 'Only the admin can grant subscriptions without payment.');
  }

  const recipientUid = request.data?.recipientUid;
  if (!recipientUid || typeof recipientUid !== 'string') {
    throw new HttpsError('invalid-argument', 'recipientUid is required.');
  }

  const duration = request.data?.duration || '1m';
  if (!DURATION_VALUES.includes(duration)) {
    throw new HttpsError('invalid-argument', 'duration must be one of: 1m, 3m, 6m, 12m');
  }

  const durationDays = DURATION_DAYS_MAP[duration] ?? 30;
  const now = Math.floor(Date.now() / 1000);
  const currentPeriodEnd = now + durationDays * 24 * 60 * 60;

  try {
    await auth.setCustomUserClaims(recipientUid, { stripeRole: 'premium' });

    const docId = `admin_gift_${Date.now()}`;
    await firestore.doc(`customers/${recipientUid}/subscriptions/${docId}`).set({
      id: docId,
      status: 'active',
      current_period_end: currentPeriodEnd,
      created: now,
      updated_at: now,
    });
  } catch (err) {
    console.error('adminGiftSubscription error:', err);
    throw new HttpsError('internal', err.message || 'Failed to grant subscription.');
  }

  return { success: true };
});

/**
 * Helper: get active subscription for uid from Firestore.
 * Returns { stripeSubId: string | null, giftDoc: object | null }. Prefers Stripe sub if present.
 */
async function getActiveSubscriptionForUid(uid) {
  const snap = await firestore
    .collection('customers')
    .doc(uid)
    .collection('subscriptions')
    .where('status', 'in', ['active', 'trialing'])
    .get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = (data.id || doc.id || '').toString();
    if (id.startsWith('sub_')) {
      return { stripeSubId: id, giftDoc: null };
    }
  }
  const first = snap.docs[0];
  if (first) {
    return { stripeSubId: null, giftDoc: first.data() };
  }
  return { stripeSubId: null, giftDoc: null };
}

function parsePeriodEnd(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value > 10000000000 ? value : value;
  if (typeof value === 'object' && typeof value.toMillis === 'function') {
    return Math.floor(value.toMillis() / 1000);
  }
  return null;
}

/**
 * Callable: getSubscriptionDetails(uid)
 * Returns subscription details for the current user. Caller must be uid.
 */
exports.getSubscriptionDetails = onCall(
  { secrets: [stripeSecret], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.data?.uid;
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    if (request.auth.uid !== uid) {
      throw new HttpsError('permission-denied', 'You can only view your own subscription.');
    }

    const { stripeSubId, giftDoc } = await getActiveSubscriptionForUid(uid);
    const now = Math.floor(Date.now() / 1000);

    if (stripeSubId) {
      let secret;
      try {
        secret = (stripeSecret.value() || '').trim();
      } catch (e) {
        throw new HttpsError('failed-precondition', 'Stripe is not configured.');
      }
      if (!secret) {
        throw new HttpsError('failed-precondition', 'Stripe is not configured.');
      }
      const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
      const subscription = await stripe.subscriptions.retrieve(stripeSubId);
      const currentPeriodEnd = subscription.current_period_end;
      const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd - now) / 86400));
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      const intervalCount = subscription.items?.data?.[0]?.price?.recurring?.interval_count ?? 1;
      let intervalLabel = '1 month';
      if (interval === 'year') intervalLabel = intervalCount === 1 ? '1 year' : `${intervalCount} years`;
      else if (interval === 'month') intervalLabel = intervalCount === 1 ? '1 month' : `${intervalCount} months`;

      return {
        type: 'stripe',
        currentPeriodEnd,
        cancelAtPeriodEnd: !!subscription.cancel_at_period_end,
        interval,
        intervalCount,
        intervalLabel,
        daysRemaining,
      };
    }

    if (giftDoc) {
      const currentPeriodEnd = parsePeriodEnd(giftDoc.current_period_end);
      const daysRemaining = currentPeriodEnd
        ? Math.max(0, Math.ceil((currentPeriodEnd - now) / 86400))
        : 0;
      return {
        type: 'gift',
        currentPeriodEnd: currentPeriodEnd || null,
        daysRemaining,
      };
    }

    return { type: null, daysRemaining: 0 };
  }
);

/**
 * Callable: updateSubscriptionAutoRenew(uid, cancelAtPeriodEnd)
 * Sets cancel_at_period_end on the user's Stripe subscription. Caller must be uid.
 */
exports.updateSubscriptionAutoRenew = onCall(
  { secrets: [stripeSecret], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.data?.uid;
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    if (request.auth.uid !== uid) {
      throw new HttpsError('permission-denied', 'You can only update your own subscription.');
    }

    const cancelAtPeriodEnd = request.data?.cancelAtPeriodEnd === true;

    const { stripeSubId } = await getActiveSubscriptionForUid(uid);
    if (!stripeSubId) {
      throw new HttpsError('failed-precondition', 'No Stripe subscription found to update.');
    }

    let secret;
    try {
      secret = (stripeSecret.value() || '').trim();
    } catch (e) {
      throw new HttpsError('failed-precondition', 'Stripe is not configured.');
    }
    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: cancelAtPeriodEnd });

    return { success: true };
  }
);

/**
 * Callable: cancelSubscription(uid)
 * Sets cancel_at_period_end = true on the user's Stripe subscription. Caller must be uid.
 */
exports.cancelSubscription = onCall(
  { secrets: [stripeSecret], cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in.');
    }

    const uid = request.data?.uid;
    if (!uid || typeof uid !== 'string') {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    if (request.auth.uid !== uid) {
      throw new HttpsError('permission-denied', 'You can only cancel your own subscription.');
    }

    const { stripeSubId } = await getActiveSubscriptionForUid(uid);
    if (!stripeSubId) {
      throw new HttpsError('failed-precondition', 'No Stripe subscription found to cancel.');
    }

    let secret;
    try {
      secret = (stripeSecret.value() || '').trim();
    } catch (e) {
      throw new HttpsError('failed-precondition', 'Stripe is not configured.');
    }
    const stripe = new Stripe(secret, { apiVersion: '2023-10-16' });
    await stripe.subscriptions.update(stripeSubId, { cancel_at_period_end: true });

    return { success: true };
  }
);
