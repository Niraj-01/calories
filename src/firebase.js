import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDajYLU7XH08fpTQ8v0c3KJ-xImaISRGCw",
  authDomain: "gym-centre-482209.firebaseapp.com",
  projectId: "gym-centre-482209",
  storageBucket: "gym-centre-482209.firebasestorage.app",
  messagingSenderId: "299236777108",
  appId: "1:299236777108:web:a143d7eb319600e2912881",
  measurementId: "G-7X11BQ59Y3",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
