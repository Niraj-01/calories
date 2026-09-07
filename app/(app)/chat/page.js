"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/src/context/AuthContext";

// ssr:false — the chat reads Firestore and the Web Speech API, both client-only.
const ChatPage = dynamic(() => import("@/src/components/ChatPage"), {
  ssr: false,
});

export default function ChatRoute() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [user, loading, router]);

  if (!user) return null;

  // ChatPage reads ?q= via useSearchParams, which must sit inside a Suspense
  // boundary in the App Router.
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}
