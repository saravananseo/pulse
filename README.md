# Pulse – Money Movement PWA

A Progressive Web App to track income, expenses, and investments with category-wise breakdowns. Data is stored per-user in Firebase Firestore.

---

## 🚀 Setup (5 minutes)

### 1. Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics if you don't need it → **Create project**

### 2. Enable Authentication
1. In the left sidebar → **Build → Authentication**
2. Click **Get started**
3. Enable **Email/Password** provider
4. Enable **Google** provider (set your project's support email)

### 3. Create Firestore Database
1. In the left sidebar → **Build → Firestore Database**
2. Click **Create database** → choose **Start in production mode** → pick a region
3. After creation, go to **Rules** tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```
4. Click **Publish**

### 4. Get Your Config
1. In Firebase Console → **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → click **</>** (Web app)
3. Register the app (any nickname) → copy the `firebaseConfig` object

### 5. Paste Config into the App
Open `js/firebase-config.js` and replace the placeholder values:

```js
export const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc"
};
```

### 6. Deploy
Host on any static server. Recommended free options:
- **Firebase Hosting**: `npm i -g firebase-tools && firebase deploy`
- **Netlify**: drag-and-drop the folder at netlify.com
- **Vercel**: `npx vercel` in the project folder

> ⚠️ PWA features (offline, install prompt) require **HTTPS**. All the above options provide this automatically.

---

## 📱 Features
- ✅ Google & Email/Password login
- ✅ Add income, expenses, investments
- ✅ Custom categories with color coding
- ✅ Category-wise bar chart breakdown
- ✅ Period filter (all time / this month / this week)
- ✅ Filter transactions by type, category, month
- ✅ Net balance summary
- ✅ Delete transactions & categories
- ✅ Offline-capable (app shell cached)
- ✅ Installable on Android & iOS
- ✅ Dark mode + light mode (follows system)
- ✅ Data isolated per user

---

## 📁 File Structure
```
money-tracker/
├── index.html          ← App shell & modals
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (offline)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── firebase-config.js  ← 🔑 Put your config here
│   └── app.js          ← Full app logic
└── icons/
    ├── icon-192.png    ← Replace with your branded icon
    └── icon-512.png    ← Replace with your branded icon
```
