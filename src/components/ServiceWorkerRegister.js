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

    // Register after the page has loaded so the worker's own downloads don't
    // compete with first paint. This effect often runs after "load" has
    // already fired (hydration is late), and a listener added then never
    // runs — so register straight away in that case.
    if (document.readyState === "complete") {
      onLoad();
      return;
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
