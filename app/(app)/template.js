"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/src/context/AuthContext";
import BottomNav from "@/src/components/BottomNav";
import { useAuth } from "@/src/context/AuthContext";

// Full-screen, self-contained routes that own their whole viewport. The chat
// pins its composer to the bottom edge, so the floating nav would sit on top of
// it — these screens carry their own back button instead.
const FULLSCREEN_ROUTES = new Set(["/chat"]);

function AppShell({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

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

export default function Template({ children }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
