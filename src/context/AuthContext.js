"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  browserPopupRedirectResolver,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/src/firebase";

const AuthContext = createContext(null);

const signIn = async () => {
  try {
    await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
  } catch (err) {
    if (
      err.code === "auth/cancelled-popup-request" ||
      err.code === "auth/popup-closed-by-user"
    ) {
      return; // user dismissed the popup — not an error
    }
    console.error("Sign-in error:", err);
  }
};

const signOutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error("Sign-out error:", err);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Stable value: consumers re-render only when the user or loading changes.
  const value = useMemo(
    () => ({ user, loading, signIn, signOut: signOutUser }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Auth no longer loads the Google sign-in iframe at start-up (see firebase.js).
// The login screen calls this to load it in the background, so by the time the
// user taps "Sign in" the popup can open straight away — mobile Safari blocks
// popups that open too long after the tap.
export function warmUpSignIn() {
  if (!auth) return;
  getRedirectResult(auth, browserPopupRedirectResolver).catch(() => {});
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
