// ─────────────────────────────────────────────
//  STEP 1: Replace these values with your own
//  Firebase project config (Project Settings →
//  Your apps → Web app → Config snippet)
// ─────────────────────────────────────────────
export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
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
