'use client';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyA4x6quYAoBmrzYm6wyqBQDLlCEm8xE8Gk',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'stock-desk-001.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'stock-desk-001',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'stock-desk-001.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '889320746497',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:889320746497:web:215939d0556ea2387b5a00',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-BT3NMJ0FSN',
};

export const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? 'carbontree.com';

export const app: FirebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: ALLOWED_DOMAIN, prompt: 'select_account' });

// Analytics only runs in a supporting browser; never block the app on it.
if (typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => { if (await isSupported()) getAnalytics(app); })
    .catch(() => {});
}
