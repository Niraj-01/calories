"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getUserSettings, setUserSettings } from "@/src/services/firestoreService";
import styles from "./SettingsPage.module.css";

// Mifflin-St Jeor Equation
function calcBMR(weight, height, age, gender) {
  if (!weight || !height || !age) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "female" ? base - 161 : base + 5;
}

function calcTDEE(bmr, activity) {
  return Math.round(bmr * (activity || 1.55));
}

function goalAdjust(tdee, goal) {
  if (goal === "lose") return tdee - 500;
  if (goal === "gain") return tdee + 400;
  return tdee; // maintain
}

const ACTIVITY_OPTIONS = [
  { value: 1.2, label: "Sedentary (desk job)" },
  { value: 1.375, label: "Lightly active (1–3 days/wk)" },
  { value: 1.55, label: "Moderately active (3–5 days/wk)" },
  { value: 1.725, label: "Very active (6–7 days/wk)" },
  { value: 1.9, label: "Extremely active (athlete)" },
];

export default function SettingsPage() {
  const { user, signOutUser } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState(1.55);
  const [weightGoal, setWeightGoal] = useState("maintain");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const s = await getUserSettings(user.uid);
        setDisplayName(s.displayName || user.displayName || "");
        setCalorieGoal(s.calorieGoal || 2000);
        setAge(s.age || "");
        setGender(s.gender || "male");
        setHeight(s.height || "");
        setWeight(s.weight || "");
        setActivity(s.activityLevel || 1.55);
        setWeightGoal(s.weightGoal || "maintain");
      } catch (err) {
        console.warn("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  // Auto-calculate calorie goal when profile fields change
  useEffect(() => {
    const bmr = calcBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender);
    if (bmr) {
      const tdee = calcTDEE(bmr, activity);
      const adjusted = goalAdjust(tdee, weightGoal);
      setCalorieGoal(adjusted);
    }
  }, [weight, height, age, gender, activity, weightGoal]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await setUserSettings(user.uid, {
        displayName,
        calorieGoal: parseInt(calorieGoal) || 2000,
        age: parseInt(age) || null,
        gender,
        height: parseFloat(height) || null,
        weight: parseFloat(weight) || null,
        activityLevel: activity,
        weightGoal,
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
      </div>

      {/* Body Profile */}
      <div className={`card ${styles.group}`} style={{ marginTop: 12 }}>
        <h3 className={styles.sectionTitle}>⚖️ Body Profile</h3>
        <p className={styles.sectionHint}>We use this to calculate your daily calorie goal automatically.</p>

        <div className={styles.rowGroup}>
          <div className={styles.halfRow}>
            <label className="label">Age</label>
            <input className="input" type="number" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className={styles.halfRow}>
            <label className="label">Gender</label>
            <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className={styles.rowGroup}>
          <div className={styles.halfRow}>
            <label className="label">Height (cm)</label>
            <input className="input" type="number" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
          </div>
          <div className={styles.halfRow}>
            <label className="label">Weight (kg)</label>
            <input className="input" type="number" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </div>
        </div>

        <div className={styles.row}>
          <label className="label">Activity Level</label>
          <select className="input" value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <label className="label">Goal</label>
          <div className={styles.goalPicker}>
            {[
              { value: "lose", label: "Lose", emoji: "📉" },
              { value: "maintain", label: "Maintain", emoji: "⚖️" },
              { value: "gain", label: "Gain", emoji: "📈" },
            ].map((g) => (
              <button
                key={g.value}
                className={`${styles.goalBtn} ${weightGoal === g.value ? styles.goalActive : ""}`}
                onClick={() => setWeightGoal(g.value)}
              >
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calorie Goal */}
      <div className={`card ${styles.group}`} style={{ marginTop: 12 }}>
        <div className={styles.row}>
          <label className="label">Daily Calorie Goal</label>
          <input
            className="input"
            type="number"
            placeholder="2000"
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
          />
          <p className={styles.goalHint}>
            {age && weight && height
              ? "✨ Auto-calculated from your profile"
              : "Fill in your Body Profile above to auto-calculate"}
          </p>
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

      <p className={styles.version}>CALORIES v2.0</p>
    </div>
  );
}
