"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  getUserSettings,
  setUserSettings,
  getDayRange,
  dateKey,
} from "@/src/services/firestoreService";
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

const IN_TO_CM = 2.54;
const LB_TO_KG = 0.45359237;

function toNumber(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : null;
}

function formatOneDecimal(value) {
  if (value === null) return "";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}`;
}

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [heightValue, setHeightValue] = useState("");
  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [activity, setActivity] = useState(1.55);
  const [weightGoal, setWeightGoal] = useState("maintain");
  const [loading, setLoading] = useState(true);
  const [waterGoal, setWaterGoal] = useState(2500);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const s = await getUserSettings(user.uid);
        setDisplayName(s.displayName || user.displayName || "");
        setCalorieGoal(s.calorieGoal || 2000);
        setAge(s.age || "");
        setGender(s.gender || "male");
        setHeightValue(s.height || "");
        setHeightUnit("cm");
        setWeightValue(s.weight || "");
        setWeightUnit("kg");
        setActivity(s.activityLevel || 1.55);
        setWeightGoal(s.weightGoal || "maintain");
        setWaterGoal(s.waterGoal || 2500);
      } catch (err) {
        console.warn("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const numericHeight = toNumber(heightValue);
  const numericWeight = toNumber(weightValue);
  const heightCm =
    numericHeight === null
      ? null
      : heightUnit === "cm"
        ? numericHeight
        : numericHeight * IN_TO_CM;
  const weightKg =
    numericWeight === null
      ? null
      : weightUnit === "kg"
        ? numericWeight
        : numericWeight * LB_TO_KG;

  // Auto-calculate calorie goal when profile fields change
  useEffect(() => {
    const bmr = calcBMR(weightKg, heightCm, parseInt(age), gender);
    if (bmr) {
      const tdee = calcTDEE(bmr, activity);
      const adjusted = goalAdjust(tdee, weightGoal);
      setCalorieGoal(adjusted);
    }
  }, [weightKg, heightCm, age, gender, activity, weightGoal]);

  const handleHeightUnitChange = (nextUnit) => {
    if (nextUnit === heightUnit) return;
    const cmValue =
      numericHeight === null
        ? null
        : heightUnit === "cm"
          ? numericHeight
          : numericHeight * IN_TO_CM;
    setHeightUnit(nextUnit);
    if (cmValue !== null) {
      const nextValue = nextUnit === "cm" ? cmValue : cmValue / IN_TO_CM;
      setHeightValue(formatOneDecimal(nextValue));
    }
  };

  const handleWeightUnitChange = (nextUnit) => {
    if (nextUnit === weightUnit) return;
    const kgValue =
      numericWeight === null
        ? null
        : weightUnit === "kg"
          ? numericWeight
          : numericWeight * LB_TO_KG;
    setWeightUnit(nextUnit);
    if (kgValue !== null) {
      const nextValue = nextUnit === "kg" ? kgValue : kgValue / LB_TO_KG;
      setWeightValue(formatOneDecimal(nextValue));
    }
  };

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
        height: heightCm || null,
        weight: weightKg || null,
        activityLevel: activity,
        weightGoal,
        waterGoal: parseInt(waterGoal) || 2500,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const today = new Date();
      const start = new Date(today);
      start.setMonth(start.getMonth() - 30);
      const rangeData = await getDayRange(user.uid, dateKey(start), dateKey(today));

      const rows = [["Date", "Meal", "Name", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Serving", "Unit"]];
      Object.entries(rangeData)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, entries]) => {
          entries.forEach((e) => {
            rows.push([
              date,
              e.meal || "",
              `"${(e.name || "").replace(/"/g, '""')}"`,
              e.calories || 0,
              e.protein || 0,
              e.carbs || 0,
              e.fat || 0,
              e.servingAmount || "",
              e.servingUnit || "",
            ]);
          });
        });

      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calories-export-last-30-months-${dateKey()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Export failed:", err);
    } finally {
      setExporting(false);
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

  const currentBMR = calcBMR(weightKg, heightCm, parseInt(age), gender);
  const currentTDEE = currentBMR ? calcTDEE(currentBMR, activity) : null;

  return (
    <div className={`page fade-in ${styles.container}`}>
      {/* Header Section */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          User Profile and <br />
          Settings
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
          <input
            className={styles.rowInput}
            type="number"
            placeholder="25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Gender</label>
          <select
            className={styles.rowSelect}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Height</label>
          <div className={styles.rowInputGroup}>
            <input
              className={styles.rowInput}
              type="number"
              placeholder={heightUnit === "cm" ? "175" : "69"}
              value={heightValue}
              onChange={(e) => setHeightValue(e.target.value)}
            />
            <select
              className={styles.rowUnitSelect}
              value={heightUnit}
              onChange={(e) => handleHeightUnitChange(e.target.value)}
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Weight</label>
          <div className={styles.rowInputGroup}>
            <input
              className={styles.rowInput}
              type="number"
              placeholder={weightUnit === "kg" ? "70" : "154"}
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
            />
            <select
              className={styles.rowUnitSelect}
              value={weightUnit}
              onChange={(e) => handleWeightUnitChange(e.target.value)}
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Activity Level</label>
          <select
            className={styles.rowSelect}
            value={activity}
            onChange={(e) => setActivity(parseFloat(e.target.value))}
          >
            {ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Goal</label>
          <select
            className={styles.rowSelect}
            value={weightGoal}
            onChange={(e) => setWeightGoal(e.target.value)}
          >
            <option value="lose">Lose Weight</option>
            <option value="maintain">Maintain Weight</option>
            <option value="gain">Gain Weight</option>
          </select>
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Daily Target</label>
          <input
            className={styles.rowInput}
            type="number"
            placeholder="2000"
            value={calorieGoal}
            onChange={(e) => setCalorieGoal(e.target.value)}
          />
        </div>
        <div className={styles.listRow}>
          <label className={styles.rowLabel}>Water Goal (ml)</label>
          <input
            className={styles.rowInput}
            type="number"
            placeholder="2500"
            value={waterGoal}
            onChange={(e) => setWaterGoal(e.target.value)}
          />
        </div>
      </section>

      {/* BMR/TDEE Stat Card */}
      {currentBMR && currentTDEE && (
        <section className={styles.glowCard}>
          <p className={styles.glowLabel}>BMR / TDEE*</p>
          <div className={styles.glowStats}>
            <span className={styles.glowStatValue}>
              {Math.round(currentBMR).toLocaleString()} kcal
            </span>
            <span className={styles.glowStatValue}>
              {Math.round(currentTDEE).toLocaleString()} kcal
            </span>
          </div>
          <p className={styles.glowStatHint}>Daily Estimate</p>
          <p className={styles.glowStatFootnote}>
            * Basal Metabolic Rate / Total Daily Energy Expenditure
          </p>
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
        <button
          type="button"
          className={styles.signOutBtn}
          onClick={handleExportCSV}
          disabled={exporting}
          style={{ marginBottom: 8 }}
        >
          {exporting ? "Exporting..." : "Export Last 30 Months (CSV)"}
        </button>
        <button
          type="button"
          className={styles.signOutBtn}
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </section>
    </div>
  );
}
