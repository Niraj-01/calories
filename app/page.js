"use client";

import { useAuth } from "@/src/context/AuthContext";
import LoginPage from "@/src/components/LoginPage";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getUserSettings } from "@/src/services/firestoreService";
import OnboardingFlow from "@/src/components/OnboardingFlow";

const HomePage = dynamic(() => import("@/src/components/HomePage"), {
  ssr: false,
});

export default function Page() {
  const { user } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoadingSettings(true);
        const settings = await getUserSettings(user.uid);
        setNeedsOnboarding(!settings.calorieGoal);
      } catch (err) {
        console.warn("Settings load failed", err);
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [user]);

  if (!user) return <LoginPage />;
  if (loadingSettings) return null;
  if (needsOnboarding)
    return <OnboardingFlow user={user} onComplete={() => setNeedsOnboarding(false)} />;
  return <HomePage />;
}
