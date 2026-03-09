"use client";

import { useAuth } from "@/src/context/AuthContext";
import LoginPage from "@/src/components/LoginPage";
import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("@/src/components/HomePage"), { ssr: false });

export default function Page() {
  const { user } = useAuth();

  if (!user) return <LoginPage />;
  return <HomePage />;
}
