"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getUserSettings, setUserSettings } from "@/src/services/firestoreService";
import styles from "./SettingsPage.module.css";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [goal, setGoal] = useState(2000);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const settings = await getUserSettings(user.uid);
        setGoal(settings.calorieGoal || 2000);
        setDisplayName(settings.displayName || user.displayName || "");
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
    try {
      await setUserSettings(user.uid, {
        calorieGoal: parseInt(goal) || 2000,
        displayName: displayName.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page container">
        <div className={styles.loadingWrap}>
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Profile */}
      <div className={`card ${styles.card}`}>
        <div className={styles.profileRow}>
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className={styles.avatar}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {(displayName || user?.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className={styles.profileInfo}>
            <p className={styles.profileName}>
              {displayName || user?.displayName || "User"}
            </p>
            <p className={styles.profileEmail}>{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Settings form */}
      <div className={`card ${styles.card}`}>
        <div className={styles.field}>
          <label className="label" htmlFor="displayName">Display Name</label>
          <input
            id="displayName"
            type="text"
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className={styles.field}>
          <label className="label" htmlFor="calorieGoal">Daily Calorie Goal</label>
          <div className={styles.goalRow}>
            <input
              id="calorieGoal"
              type="number"
              className={`input ${styles.goalInput} num`}
              value={goal}
              min={500}
              max={10000}
              onChange={(e) => setGoal(e.target.value)}
            />
            <span className={styles.goalUnit}>kcal</span>
          </div>
        </div>

        <button
          className={`btn btn-primary btn-full ${styles.saveBtn}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>

      {/* Sign out */}
      <div className={`card ${styles.card}`}>
        <button
          className={`btn btn-danger btn-full ${styles.signOutBtn}`}
          onClick={signOut}
        >
          Sign out
        </button>
      </div>

      <p className={styles.version}>Calories v1.0</p>
    </div>
  );
}
