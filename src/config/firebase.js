// Firebase configuration
// Replace these values with your Firebase project configuration
// Get these from Firebase Console > Project Settings > General > Your apps

import { initializeApp, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Your web app's Firebase configuration (env preferred; fallbacks from .env for local/dev)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCd9eodM3NUscQAIf02-Q6c2YK37MYl88o",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wuzzle-games.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wuzzle-games",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wuzzle-games.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "190786846587",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:190786846587:web:cea8ff9822372ebfdf47de",
  databaseURL:
    (import.meta.env.VITE_FIREBASE_DATABASE_URL && import.meta.env.VITE_FIREBASE_DATABASE_URL.trim()) ||
    "https://wuzzle-games-default-rtdb.firebaseio.com",
};



if (import.meta.env.MODE === 'development') {
  console.log('[Firebase] Realtime Database URL:', firebaseConfig.databaseURL);
  if (!import.meta.env.VITE_FIREBASE_DATABASE_URL) {
    console.warn(
      '[Firebase] Realtime Database: VITE_FIREBASE_DATABASE_URL is not set. Set it in .env to the exact URL from Firebase Console (e.g. https://your-project-default-rtdb.firebaseio.com or ...europe-west1.firebasedatabase.app).'
    );
  }
}

// In non-development builds, guard against accidentally shipping a build that
// still uses placeholder Firebase configuration values. Failing fast here
// makes misconfiguration obvious rather than causing confusing runtime errors.
const mode = import.meta.env.MODE || 'development';
if (mode !== 'development' && mode !== 'test') {
  const placeholderTokens = [
    'your-api-key',
    'your-auth-domain',
    'your-project-id',
    'your-storage-bucket',
    'your-messaging-sender-id',
    'your-app-id',
  ];

  const hasPlaceholder = Object.values(firebaseConfig).some((value) =>
    typeof value === 'string' && placeholderTokens.some((token) => value.includes(token)),
  );

  if (hasPlaceholder) {
    throw new Error(
      'Invalid Firebase configuration: one or more VITE_FIREBASE_* environment variables are missing or still use placeholder values.',
    );
  }
}

// Initialize Firebase (reuse existing app if present, e.g. HMR or Strict Mode)
let app;
try {
  app = getApp();
} catch {
  app = initializeApp(firebaseConfig);
  console.log("FIREBASE_INIT_MARKER: wuzzle-2026-02-17");

  console.log("[env] MODE:", import.meta.env.MODE);
console.log("[env] VITE_FIREBASE_PROJECT_ID:", import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log("[env] VITE_FIREBASE_AUTH_DOMAIN:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log("[env] VITE_FIREBASE_DATABASE_URL:", import.meta.env.VITE_FIREBASE_DATABASE_URL);
console.log("[env] resolved firebaseConfig:", firebaseConfig);
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firebase Realtime Database (explicit URL so we use the same instance as config, not SDK default)
export const database = getDatabase(app, firebaseConfig.databaseURL);

// Initialize Cloud Firestore
export const firestore = getFirestore(app);

// Cloud Functions
export const functions = getFunctions(app);

// Callable helpers for gift subscription
export const createGiftCheckoutSessionCallable = () => httpsCallable(functions, 'createGiftCheckoutSession');
export const adminGiftSubscriptionCallable = () => httpsCallable(functions, 'adminGiftSubscription');

// Callable helpers for subscription management (Manage premium)
export const getSubscriptionDetailsCallable = () => httpsCallable(functions, 'getSubscriptionDetails');
export const updateSubscriptionAutoRenewCallable = () => httpsCallable(functions, 'updateSubscriptionAutoRenew');
export const cancelSubscriptionCallable = () => httpsCallable(functions, 'cancelSubscription');

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;
