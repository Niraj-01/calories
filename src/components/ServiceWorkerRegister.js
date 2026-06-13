"use client";

import { useEffect } from "react";

// Registers the service worker on the client. Required for PWA installability
// (and therefore for the Trusted Web Activity / Play Store wrapper).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("SW registration failed:", err));
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
