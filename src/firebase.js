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
  apiKey: "AIzaSyDajYLU7XH08fpTQ8v0c3KJ-xImaISRGCw",
  authDomain: "gym-centre-482209.firebaseapp.com",
  projectId: "gym-centre-482209",
  storageBucket: "gym-centre-482209.firebasestorage.app",
  messagingSenderId: "299236777108",
  appId: "1:299236777108:web:a143d7eb319600e2912881",
  measurementId: "G-7X11BQ59Y3",
};

let app, auth, db, googleProvider;

if (typeof window !== "undefined") {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { app, auth, db, googleProvider };
