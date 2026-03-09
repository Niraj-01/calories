"use client";

import { AuthProvider } from "@/src/context/AuthContext";
import BottomNav from "@/src/components/BottomNav";
import { useAuth } from "@/src/context/AuthContext";

function AppShell({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span className="app-name">CALORIES</span>
      </div>
    );
  }

  return (
    <>
      {children}
      {user && <BottomNav />}
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
