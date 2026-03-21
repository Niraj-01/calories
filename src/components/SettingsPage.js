"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getUserSettings, setUserSettings } from "@/src/services/firestoreService";
import styles from "./SettingsPage.module.css";

export default function SettingsPage() {
  const { user, signOutUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const settings = await getUserSettings(user.uid);
        setDisplayName(settings.displayName || user.displayName || "");
        setCalorieGoal(settings.calorieGoal || 2000);
      } catch (err) {
        console.warn("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await setUserSettings(user.uid, {
        displayName,
        calorieGoal: parseInt(calorieGoal) || 2000,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div style={{ marginBottom: 20 }}>
          <div className="skeleton" style={{ width: 100, height: 32 }} />
        </div>
        <div className={`card ${styles.group}`}>
          {[1, 2].map((i) => (
            <div key={i} className={styles.row}>
              <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: "100%", height: 48, borderRadius: 16 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <h1 className="page-title" style={{ marginBottom: 24 }}>Settings</h1>

      {/* Profile section */}
      <div className={`card ${styles.group}`}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {(displayName || user?.email || "U")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>
              {displayName || "No name set"}
            </span>
            <span className={styles.profileEmail}>{user?.email}</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.row}>
          <label className="label">Display Name</label>
          <input
            className="input"
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className={styles.row}>
          <label className="label">Daily Calorie Goal</label>
          <input
            className="input"
            type="number"
            placeholder="2000"
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          disabled={saving}
          onClick={handleSave}
        >
          {saved ? "✓ Saved" : saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Sign out */}
      <div className={`card ${styles.group}`} style={{ marginTop: 12 }}>
        <button
          className={`btn btn-danger btn-full ${styles.signOutBtn}`}
          onClick={signOutUser}
        >
          Sign Out
        </button>
      </div>

      <p className={styles.version}>CALORIES v1.0</p>
    </div>
  );
}
