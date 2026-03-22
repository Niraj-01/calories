"use client";

import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";

const HistoryPage = dynamic(() => import("@/src/components/HistoryPage"), {
  ssr: false,
});

export default function HistoryRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (!user) return null;
  return <HistoryPage />;
}
