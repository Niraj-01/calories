"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/src/context/AuthContext";
import BottomNav from "@/src/components/BottomNav";

// Full-screen, self-contained routes that own their whole viewport. The chat
// pins its composer to the bottom edge, so the floating nav would sit on top of
// it — these screens carry their own back button instead.
const FULLSCREEN_ROUTES = new Set(["/chat"]);

// Each tab's screen is its own lazy chunk, normally fetched only when the tab
// is first opened. Once the app is idle we fetch them all ahead of time, so the
// first tap on any tab renders without waiting on the network.
const TAB_SCREENS = [
  () => import("@/src/components/HomePage"),
  () => import("@/src/components/HistoryPage"),
  () => import("@/src/components/MyFoodsPage"),
  () => import("@/src/components/SettingsPage"),
];

function whenIdle(fn) {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 3000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 1500);
  return () => clearTimeout(id);
}

function Shell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) return;
    return whenIdle(() => {
      TAB_SCREENS.forEach((load) => load().catch(() => {}));
    });
  }, [user]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span className="app-name">CALORIES</span>
      </div>
    );
  }

  const showNav = user && !FULLSCREEN_ROUTES.has(pathname);

  return (
    <>
      {children}
      {showNav && <BottomNav />}
    </>
  );
}

// Lives in the (app) layout, not a template: layouts persist across
// navigations, so auth state (and the nav) survive tab switches instead of
// remounting — which used to flash the full-screen spinner and re-run the auth
// check on every tap.
export default function AppShell({ children }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
