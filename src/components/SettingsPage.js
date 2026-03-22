"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getUserSettings, setUserSettings } from "@/src/services/firestoreService";
import { useRouter } from "next/navigation";
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
  const { user, signOut } = useAuth();
  const router = useRouter();
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

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (err) {
      console.error("Manual sign out failed", err);
    }
  };

  if (loading) {
    return (
      <div className={`page container fade-in ${styles.container}`}>
        <div className="spinner" style={{ margin: "auto" }}></div>
      </div>
    );
  }

  const currentBMR = calcBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender);
  const currentTDEE = currentBMR ? calcTDEE(currentBMR, activity) : null;

  return (
    <div className={`page fade-in ${styles.container}`}>
      {/* Header Section */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          User Profile and <br />Settings
        </h1>
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>
            {(displayName || user?.email || "U")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <input 
            type="text" 
            className={styles.nameInput} 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            placeholder="Your Name"
          />
        </div>
      </header>

      {/* Profile Data Form */}
      <section className={styles.frostedGlass}>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Age</label>
          <input className={styles.rowInput} type="number" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Gender</label>
          <select className={styles.rowSelect} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Height (cm)</label>
          <input className={styles.rowInput} type="number" placeholder="175" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Weight (kg)</label>
          <input className={styles.rowInput} type="number" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Activity Level</label>
          <select className={styles.rowSelect} value={activity} onChange={(e) => setActivity(parseFloat(e.target.value))}>
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Goal</label>
          <select className={styles.rowSelect} value={weightGoal} onChange={(e) => setWeightGoal(e.target.value)}>
             <option value="lose">Lose Weight</option>
             <option value="maintain">Maintain Weight</option>
             <option value="gain">Gain Weight</option>
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Daily Target</label>
          <input className={styles.rowInput} type="number" placeholder="2000" value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)} />
        </div>
      </section>

      {/* BMR/TDEE Stat Card */}
      {currentBMR && currentTDEE && (
        <section className={styles.glowCard}>
          <p className={styles.glowLabel}>BMR / TDEE</p>
          <div className={styles.glowStats}>
            <span className={styles.glowStatValue}>
              {Math.round(currentBMR).toLocaleString()} kcal
            </span>
            <span className={styles.glowStatValue}>
              {Math.round(currentTDEE).toLocaleString()} kcal
            </span>
          </div>
          <p className={styles.glowStatHint}>Daily Estimate</p>
        </section>
      )}

      {/* Actions */}
      <section>
        <button 
          className={styles.saveBtn} 
          onClick={handleSave} 
          disabled={saving}
        >
          {saved ? "✓ Saved" : saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
          Sign Out
        </button>
      </section>
    </div>
  );
}
