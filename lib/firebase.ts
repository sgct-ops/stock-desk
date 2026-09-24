'use client';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// All Firebase settings come from environment variables (Vercel → Project → Settings →
// Environment Variables, or .env.local for local dev). Nothing is hardcoded here.
// Next.js needs each NEXT_PUBLIC_ variable written out in full so it can inline it at build time.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const missing = (['apiKey', 'authDomain', 'projectId', 'appId'] as const).filter((k) => !firebaseConfig[k]);
if (missing.length && typeof window !== 'undefined') {
  console.error(`Stock Desk: missing Firebase env variables for ${missing.join(', ')}. See .env.example.`);
}

export const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'carbontree.com';

// Created on first use in the browser, so the build (which pre-renders pages) never needs the keys.
let _app: FirebaseApp | null = null;
function app(): FirebaseApp {
  if (!_app) {
    _app = getApps()[0] ?? initializeApp(firebaseConfig);
    if (firebaseConfig.measurementId) {
      import('firebase/analytics')
        .then(async ({ getAnalytics, isSupported }) => { if (await isSupported()) getAnalytics(_app!); })
        .catch(() => {});
    }
  }
  return _app;
}
export const fbAuth = (): Auth => getAuth(app());
export const fbDb = (): Firestore => getFirestore(app());
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: 'select_account' });
