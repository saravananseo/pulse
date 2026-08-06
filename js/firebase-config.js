// ─────────────────────────────────────────────
//  STEP 1: Replace these values with your own
//  Firebase project config (Project Settings →
//  Your apps → Web app → Config snippet)
// ─────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "AIzaSyDYLXUPR77jqxZZFKUHUC-LeRqdHUZcIQs",
  authDomain: "pulse-tracker-f03b7.firebaseapp.com",
  projectId: "pulse-tracker-f03b7",
  storageBucket: "pulse-tracker-f03b7.firebasestorage.app",
  messagingSenderId: "840165267942",
  appId: "1:840165267942:web:a64626be802176fd809e27"
};

// ─────────────────────────────────────────────
//  STEP 2: In Firebase Console → Authentication
//  enable "Email/Password" and "Google" providers
//
//  STEP 3: In Firestore → Rules, paste:
//
//  rules_version = '2';
//  service cloud.firestore {
//    match /databases/{database}/documents {
//      match /users/{userId}/{document=**} {
//        allow read, write: if request.auth.uid == userId;
//      }
//    }
//  }
// ─────────────────────────────────────────────
