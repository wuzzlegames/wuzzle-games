import { useState, useEffect, useRef } from 'react';
import { ref, get, set, onValue, off } from 'firebase/database';
import { collection, query, where, onSnapshot as onSnapshotFirestore } from 'firebase/firestore';
import { database, firestore, auth } from '../config/firebase';
import { grantBadge } from '../lib/badgeService';
import { isSubscriptionAllowed } from '../lib/subscriptionConfig';

const PREMIUM_BADGE_ID = 'premium_member';

/** Delay before treating user as "not subscribed" for gating (avoids race with Firestore/custom claim) */
const SUBSCRIPTION_GATE_SETTLE_MS = 600;

/**
 * Hook to manage user subscription status
 * Checks both Firestore (from Stripe Extension) and custom claims (stripeRole)
 * Also syncs to Realtime Database for backward compatibility
 * @param {{ uid: string } | null} user - Current auth user
 * @returns {{ isSubscribed: boolean; loading: boolean; showSubscriptionGate: boolean; error: string | null; subscriptionData: any }}
 */
export function useSubscription(user) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionGate, setShowSubscriptionGate] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [stripeRole, setStripeRole] = useState(null);
  const subscriptionRef = useRef(null);
  const firestoreUnsubscribeRef = useRef(null);
  const stripeRoleRef = useRef(null);
  const gateTimeoutRef = useRef(null);
  const stateRef = useRef({ isSubscribed, loading });
  stateRef.current = { isSubscribed, loading };

  // Check custom claim (stripeRole) from Firebase Auth
  // This is set by the extension when user subscribes
  const checkCustomClaim = async () => {
    try {
      if (!auth.currentUser) return null;
      // Force refresh token to get latest custom claims
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      return tokenResult?.claims?.stripeRole || null;
    } catch (err) {
      console.error('Failed to get custom claim:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!user?.uid) {
      setIsSubscribed(false);
      setLoading(false);
      setShowSubscriptionGate(false);
      setError(null);
      setSubscriptionData(null);
      setStripeRole(null);
      if (gateTimeoutRef.current) {
        clearTimeout(gateTimeoutRef.current);
        gateTimeoutRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    // Initial custom claim check
    checkCustomClaim().then((role) => {
      if (isMounted) {
        stripeRoleRef.current = role;
        setStripeRole(role);
      }
    });

    // Listen to Firestore subscriptions (from Stripe Extension)
    // The extension stores subscriptions at: customers/{uid}/subscriptions/{subscriptionId}
    const subscriptionsQuery = query(
      collection(firestore, 'customers', user.uid, 'subscriptions'),
      where('status', 'in', ['trialing', 'active'])
    );

    const unsubscribeFirestore = onSnapshotFirestore(
      subscriptionsQuery,
      async (snapshot) => {
        // Check if user has an active subscription
        const activeSubscriptions = snapshot.docs.filter((doc) => {
          const data = doc.data();
          const status = data.status;
          // Check if subscription is active or trialing
          return status === 'active' || status === 'trialing';
        });

        const hasActiveSubscription = activeSubscriptions.length > 0;
        const latestSubscription = activeSubscriptions[0]?.data() || null;

        // Update subscription data
        setSubscriptionData(latestSubscription);

        // Re-check custom claim when subscription changes
        // This ensures we have the latest stripeRole after subscription updates
        const currentRole = await checkCustomClaim();
        stripeRoleRef.current = currentRole;
        setStripeRole(currentRole);

        // User is subscribed if:
        // 1. Has active subscription in Firestore, OR
        // 2. Has stripeRole custom claim set to "premium" (case-insensitive)
        const role = currentRole || stripeRole;
        const subscribed = hasActiveSubscription || role?.toLowerCase() === 'premium';

        setIsSubscribed(subscribed);

        // Sync to Realtime Database for backward compatibility
        if (subscribed && latestSubscription) {
          syncToRealtimeDatabase(user.uid, latestSubscription).catch((err) => {
            console.error('Failed to sync subscription to Realtime Database:', err);
          });
        }

        // Grant premium badge if subscribed
        if (subscribed) {
          grantBadge({ database, uid: user.uid, badgeId: PREMIUM_BADGE_ID }).catch((err) => {
            console.error('Failed to grant premium badge:', err);
          });
        }

        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore subscription error:', err);
        // Fall back to custom claim check if Firestore fails
        checkCustomClaim().then((role) => {
          if (isMounted) {
            stripeRoleRef.current = role;
            setStripeRole(role);
            setIsSubscribed(role?.toLowerCase() === 'premium');
            setLoading(false);
          }
        });
      }
    );

    firestoreUnsubscribeRef.current = unsubscribeFirestore;

    // Also listen to Realtime Database for backward compatibility
    const subscriptionPath = `users/${user.uid}/subscription`;
    const subscriptionRefPath = ref(database, subscriptionPath);

    const unsubscribeRealtime = onValue(
      subscriptionRefPath,
      (snap) => {
        const data = snap.val();
        // Only use Realtime DB data if Firestore doesn't have subscription
        // This is for backward compatibility
        if (data && typeof data === 'object') {
          const status = data.status;
          const expiresAt = data.expiresAt;
          const now = Date.now();

          const active =
            status === 'active' &&
            (expiresAt == null || (typeof expiresAt === 'number' && expiresAt > now));

          if (active && !stateRef.current.isSubscribed) {
            // Only set if not already subscribed via Firestore (use ref for latest state)
            setIsSubscribed(true);
            grantBadge({ database, uid: user.uid, badgeId: PREMIUM_BADGE_ID }).catch((err) => {
              console.error('Failed to grant premium badge:', err);
            });
          }
        }
      },
      (err) => {
        // Ignore Realtime DB errors, Firestore is primary source
        console.error('Realtime DB subscription error:', err);
      }
    );

    subscriptionRef.current = unsubscribeRealtime;

    // Periodically re-check custom claims (every 30 seconds)
    // This helps catch cases where the extension updates the claim but Firestore hasn't updated yet
    const intervalId = setInterval(async () => {
      if (!isMounted || !auth.currentUser) return;
      const role = await checkCustomClaim();
      if (isMounted) {
        const prevRole = stripeRoleRef.current;
        stripeRoleRef.current = role;
        setStripeRole(role);
        // If role changed to premium and we weren't subscribed, update subscription status
        if (role?.toLowerCase() === 'premium' && prevRole?.toLowerCase() !== 'premium') {
          setIsSubscribed(true);
          grantBadge({ database, uid: user.uid, badgeId: PREMIUM_BADGE_ID }).catch((err) => {
            console.error('Failed to grant premium badge:', err);
          });
        }
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      stripeRoleRef.current = null;
      if (firestoreUnsubscribeRef.current) {
        firestoreUnsubscribeRef.current();
        firestoreUnsubscribeRef.current = null;
      }
      if (subscriptionRef.current) {
        off(subscriptionRefPath);
        subscriptionRef.current = null;
      }
    };
  }, [user?.uid]);

  // Only show subscription gate (paywall / lock / CTA) after subscription has "settled" for a short period.
  // Avoids briefly gating subscribed users when loading flips to false before Firestore/custom claim resolve.
  useEffect(() => {
    if (loading || isSubscribed) {
      if (gateTimeoutRef.current) {
        clearTimeout(gateTimeoutRef.current);
        gateTimeoutRef.current = null;
      }
      setShowSubscriptionGate(false);
      return;
    }
    gateTimeoutRef.current = setTimeout(() => {
      gateTimeoutRef.current = null;
      if (!stateRef.current.isSubscribed) setShowSubscriptionGate(true);
    }, SUBSCRIPTION_GATE_SETTLE_MS);
    return () => {
      if (gateTimeoutRef.current) {
        clearTimeout(gateTimeoutRef.current);
        gateTimeoutRef.current = null;
      }
    };
  }, [loading, isSubscribed]);

  const effectiveShowSubscriptionGate = isSubscriptionAllowed && showSubscriptionGate;
  return { isSubscribed, loading, showSubscriptionGate: effectiveShowSubscriptionGate, error, subscriptionData, stripeRole };
}

/**
 * Sync subscription data from Firestore to Realtime Database
 * This maintains backward compatibility with existing code
 */
async function syncToRealtimeDatabase(uid, firestoreSubscription) {
  if (!uid || !firestoreSubscription) return;

  const subscriptionRef = ref(database, `users/${uid}/subscription`);
  const status = firestoreSubscription.status;

  // Convert Firestore timestamp to milliseconds
  // Handle both Timestamp objects and number timestamps
  let currentPeriodEnd = firestoreSubscription.current_period_end;
  let expiresAt = null;
  
  if (currentPeriodEnd) {
    if (typeof currentPeriodEnd === 'object' && currentPeriodEnd.toMillis) {
      // Firestore Timestamp
      expiresAt = currentPeriodEnd.toMillis();
    } else if (typeof currentPeriodEnd === 'number') {
      // Already in milliseconds (seconds * 1000 if from Stripe API)
      expiresAt = currentPeriodEnd > 1000000000000 ? currentPeriodEnd : currentPeriodEnd * 1000;
    }
  }

  let created = Date.now();
  if (firestoreSubscription.created) {
    if (typeof firestoreSubscription.created === 'object' && firestoreSubscription.created.toMillis) {
      created = firestoreSubscription.created.toMillis();
    } else if (typeof firestoreSubscription.created === 'number') {
      created = firestoreSubscription.created > 1000000000000 
        ? firestoreSubscription.created 
        : firestoreSubscription.created * 1000;
    }
  }

  const subscriptionData = {
    status: status === 'active' || status === 'trialing' ? 'active' : 'inactive',
    activatedAt: created,
    expiresAt: expiresAt,
    autoRenew: status === 'active' || status === 'trialing',
    stripeSubscriptionId: firestoreSubscription.id || null,
    updatedAt: Date.now(),
  };

  await set(subscriptionRef, subscriptionData);
}

/**
 * Activate subscription for a user (called after successful payment)
 * @param {string} uid - User ID
 * @param {Object} paymentData - Payment information (e.g., paymentIntentId, amount, etc.)
 * @returns {Promise<void>}
 */
export async function activateSubscription(uid, paymentData) {
  if (!uid) throw new Error('User ID is required');

  const subscriptionRef = ref(database, `users/${uid}/subscription`);
  const now = Date.now();
  const oneMonthFromNow = now + 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  const subscriptionData = {
    status: 'active',
    activatedAt: now,
    expiresAt: oneMonthFromNow, // Auto-renewal will update this
    autoRenew: true,
    paymentData: {
      ...paymentData,
      lastPaymentAt: now,
    },
    updatedAt: now,
  };

  await set(subscriptionRef, subscriptionData);

  // Grant premium badge
  await grantBadge({ database, uid, badgeId: PREMIUM_BADGE_ID });
}

/**
 * Cancel subscription (sets autoRenew to false, but keeps status active until expiresAt)
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export async function cancelSubscription(uid) {
  if (!uid) throw new Error('User ID is required');

  const subscriptionRef = ref(database, `users/${uid}/subscription`);
  const snap = await get(subscriptionRef);
  const current = snap.val() || {};

  await set(subscriptionRef, {
    ...current,
    autoRenew: false,
    cancelledAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Check if user has access to premium features
 * This is a utility function that can be used throughout the app
 * @param {{ uid: string } | null} user - Current auth user
 * @param {boolean} isSubscribed - Subscription status from useSubscription hook
 * @returns {boolean}
 */
export function hasPremiumAccess(user, isSubscribed) {
  return !!(user?.uid && isSubscribed);
}

/**
 * Get the user's Stripe role from custom claims
 * This checks the stripeRole custom claim set by the Firebase Extension
 * @returns {Promise<string | null>} The user's role (e.g., "premium") or null
 */
export async function getStripeRole() {
  try {
    const user = auth.currentUser;
    if (!user) return null;

    // Force refresh token to get latest custom claims
    const tokenResult = await user.getIdTokenResult(true);
    return tokenResult?.claims?.stripeRole || null;
  } catch (err) {
    console.error('Failed to get Stripe role:', err);
    return null;
  }
}
