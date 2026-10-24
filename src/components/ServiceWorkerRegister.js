"use client";

import { useEffect } from "react";

const RELOAD_KEY = "calo:chunk-reload";

function isChunkLoadError(error) {
  if (!error) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Failed to (load|fetch dynamically imported) (chunk|module)|Loading chunk/i.test(error.message || "")
  );
}

// The service worker opens the app from the copy cached on the last visit. If a
// deploy has happened since, a screen or modal that this device never fetched
// may no longer exist on the server. Reload once — the worker has fetched the
// new version in the background by then — at most once a minute so a real
// outage can't loop.
function useChunkErrorRecovery() {
  useEffect(() => {
    const recover = (error) => {
      if (!isChunkLoadError(error)) return;
      try {
        const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
        if (Date.now() - last < 60_000) return;
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {}
      window.location.reload();
    };
    const onError = (e) => recover(e.error);
    const onRejection = (e) => recover(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
}

// Registers the service worker on the client. Required for PWA installability
// (and therefore for the Trusted Web Activity / Play Store wrapper).
export default function ServiceWorkerRegister() {
  useChunkErrorRecovery();

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
