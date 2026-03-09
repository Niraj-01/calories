"use client";

import { useAuth } from "@/src/context/AuthContext";
import LoginPage from "@/src/components/LoginPage";
import HomePage from "@/src/components/HomePage";

export default function Page() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;
  return <HomePage />;
}
