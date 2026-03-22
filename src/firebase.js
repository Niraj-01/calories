import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  memoryLocalCache,
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
  auth = getAuth(app);
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
}

export { app, auth, db, googleProvider };
