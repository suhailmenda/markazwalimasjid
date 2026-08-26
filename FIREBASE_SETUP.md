# Firebase Free Tier (Spark Plan) Setup Guide

This project is configured to use Firebase (Cloud Firestore & Firebase Authentication) on the free tier to sync prayer times and Islamic date overrides live across all visitors.

---

## 1. Create a Free Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project** (or **Add project**).
3. Enter a project name (e.g., `markaz-wali-masjid`) and continue.
4. Disable Google Analytics (optional) and click **Create project**.

---

## 2. Register Web App & Get Config Keys

1. On your project Overview page in Firebase Console, click the **Web icon (`</>`)** to add a web app.
2. Enter an app nickname (e.g., `Mosque Web App`) and click **Register app**.
3. Under **Firebase SDK snippet**, choose **Config**. You will see object values like this:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-app",
     storageBucket: "your-app.firebasestorage.app",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
4. Open `.env` in the root of this project and replace the placeholder values with your keys:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-app
   VITE_FIREBASE_STORAGE_BUCKET=your-app.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

---

## 3. Enable Authentication (Email / Password)

1. In the left menu of Firebase Console, click **Build > Authentication**.
2. Click **Get Started**.
3. Under **Sign-in method**, choose **Email/Password**.
4. Enable the **Email/Password** toggle (leave Email link disabled) and click **Save**.
5. Click on the **Users** tab at the top and click **Add user**.
6. Enter your Admin Email (e.g., `admin@markazmasjid.com`) and a strong password.

---

## 4. Enable Cloud Firestore Database

1. In the left menu of Firebase Console, click **Build > Firestore Database**.
2. Click **Create database**.
3. Select your preferred database location (e.g., `asia-south1` or nearest to your mosque) and click **Next**.
4. Select **Start in test mode** (or production mode) and click **Create**.
5. Go to the **Rules** tab in Firestore and paste the contents of `firestore.rules`:
   ```javascript
   rules_version = '2';

   service cloud.firestore {
     match /databases/{database}/documents {
       match /settings/prayerTimes {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
6. Click **Publish**.

---

## 5. Test Live Synchronization

1. Start your local dev server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:5173/admin` in your browser.
3. Sign in with the Admin email and password created in Step 3.
4. Update any Adhan/Jamat time or Hijri date.
5. Open `http://localhost:5173/` in another window or incognito browser—you will see the updated prayer times synced live!
