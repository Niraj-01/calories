import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  memoryLocalCache,
  connectFirestoreEmulator
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxDmz6_pw_MK-UQ2lVYoJweT8giiDZGDI",
  authDomain: "calories-88b0d.firebaseapp.com",
  projectId: "calories-88b0d",
  storageBucket: "calories-88b0d.firebasestorage.app",
  messagingSenderId: "34828594720",
  appId: "1:34828594720:web:41937eb2f0712de1451645",
  measurementId: "G-4V3EHPQMW8",
};

let app, auth, db, googleProvider;

if (typeof window !== "undefined") {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  // initializeAuth rather than getAuth: getAuth also wires in the popup/redirect
  // resolver, and on mobile browsers and Safari that makes auth start-up WAIT for
  // a hidden Google iframe (plus its scripts) to load before it reports who is
  // signed in — a network round trip on every app open. Without the resolver,
  // a returning user is read straight from IndexedDB. Sign-in passes the
  // resolver explicitly (see AuthContext), so popups still work.
  // Same persistence chain as getAuth's default, so nobody gets signed out.
  try {
    auth = initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
      ],
    });
  } catch {
    auth = getAuth(app); // already initialized (fast refresh)
  }
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }),
    });
  } catch (err) {
    console.warn(
      "Persistent cache unavailable, falling back to memory cache",
      err,
    );
    db = getFirestore(app, { localCache: memoryLocalCache() });
  }
  googleProvider = new GoogleAuthProvider();

  if (process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
}

export { app, auth, db, googleProvider };
