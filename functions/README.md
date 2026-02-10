# Wuzzle Games Cloud Functions

## Gift subscription (2nd gen, params + Secret Manager)

Gift subscription uses three **2nd gen** functions with Firebase params and Secret Manager (no deprecated `functions.config()`):

- **createGiftCheckoutSession** (callable) – creates a Stripe Checkout session so the payer can pay for a friend’s subscription.
- **stripeGiftWebhook** (HTTPS) – Stripe webhook for `checkout.session.completed`; writes subscription to Firestore and sets custom claim for the recipient.
- **adminGiftSubscription** (callable) – admin can grant premium to any user without payment (admin email: abhijeetsridhar14@gmail.com).

### Config: secrets + string param

1. **Secrets** (set via Firebase CLI; values stored in Cloud Secret Manager):

   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY
   firebase functions:secrets:set STRIPE_GIFT_WEBHOOK_SECRET
   ```
   Paste your Stripe secret key and the gift webhook signing secret when prompted.

2. **String params** for gift prices (one-time payments): set in `functions/.env` or `functions/.env.<projectId>`:

   ```
   STRIPE_GIFT_PRICE_ID_1M=price_...
   STRIPE_GIFT_PRICE_ID_3M=price_...
   STRIPE_GIFT_PRICE_ID_6M=price_...
   STRIPE_GIFT_PRICE_ID_12M=price_...
   ```
   Copy from `functions/.env.example` and replace the placeholders.

See **gift-subs.md** in the project root for full setup (webhook URL, Stripe Dashboard, deploy, testing).

### Stripe webhook for gift checkouts

1. Deploy the functions, then copy the URL of **stripeGiftWebhook** (e.g. `https://REGION-PROJECT.cloudfunctions.net/stripeGiftWebhook`).
2. In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:
   - **Endpoint URL**: the `stripeGiftWebhook` URL.
   - **Events**: `checkout.session.completed`.
3. After creating the endpoint, reveal the **Signing secret** (`whsec_...`) and set it:  
   `firebase functions:secrets:set STRIPE_GIFT_WEBHOOK_SECRET`

Use a **separate** webhook from the one used by the Stripe Extension.

### Deploy

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```
