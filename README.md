# Calories Tracker

Next.js app with Firebase Auth + Firestore for storing user foods and daily logs.

## Quickstart (local)

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Firebase setup

1. Create a Firebase project and enable Firestore (production mode) and Google Sign-In.
2. In the Firebase console, add a Web App and copy the config.
3. Paste the config into [src/firebase.js](src/firebase.js) `firebaseConfig`.
4. Deploy strict rules: `firebase deploy --only firestore` using [firestore.rules](firestore.rules).
   - Rules enforce that users can only read/write their own `users/{uid}` subtree.
5. (Optional) To speed up cold loads, Firestore persistence is enabled in [src/firebase.js](src/firebase.js); keep this file as-is.

## Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
firebase init hosting   # choose existing project, framework: Next.js
npm run build
firebase deploy --only hosting
```

## Notes

- Auth: Google sign-in via Firebase Auth.
- Data: per-user logs at `users/{uid}/logs/{date}/entries` and custom foods at `users/{uid}/myFoods`.
- If data seems missing after reload, ensure you are signed into the same Firebase project and account used to create it.
