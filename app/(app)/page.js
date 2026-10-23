"use client";

import { useAuth } from "@/src/context/AuthContext";
import LoginPage from "@/src/components/LoginPage";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getUserSettings } from "@/src/services/firestoreService";
import OnboardingFlow from "@/src/components/OnboardingFlow";

const loadHomePage = () => import("@/src/components/HomePage");
const HomePage = dynamic(loadHomePage, { ssr: false });

// Start fetching Today's chunk as soon as this route's code runs, in parallel
// with the auth check, instead of only after the onboarding check resolves.
if (typeof window !== "undefined") loadHomePage().catch(() => {});

export default function Page() {
  const { user } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingSettings(true);
        // Nobody un-onboards, so a goal in the on-device cache settles it with
        // no network wait. Only a first visit on this device asks the server.
        const cached = await getUserSettings(user.uid, { cache: true });
        const settings = cached?.calorieGoal ? cached : await getUserSettings(user.uid);
        if (!cancelled) setNeedsOnboarding(!settings.calorieGoal);
      } catch (err) {
        console.warn("Settings load failed", err);
      } finally {
        if (!cancelled) setLoadingSettings(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return <LoginPage />;
  if (loadingSettings) return null;
  if (needsOnboarding)
    return <OnboardingFlow user={user} onComplete={() => setNeedsOnboarding(false)} />;
  return <HomePage />;
}
