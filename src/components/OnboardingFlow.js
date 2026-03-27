"use client";

import { useEffect, useMemo, useState } from "react";
import { updateUserSettings } from "@/src/services/firestoreService";
import styles from "./OnboardingFlow.module.css";

const goals = [
  { key: "lose", title: "Lose weight", desc: "Calorie deficit with protein focus" },
  { key: "maintain", title: "Maintain", desc: "Keep energy steady" },
  { key: "gain", title: "Gain muscle", desc: "Slight surplus to build" },
];

const activityLevels = [
  { key: "sedentary", title: "Sedentary", desc: "Desk job, little exercise", factor: 1.2 },
  { key: "light", title: "Light", desc: "1-3 workouts/week", factor: 1.375 },
  { key: "moderate", title: "Moderate", desc: "3-5 workouts/week", factor: 1.55 },
  { key: "active", title: "Active", desc: "6+ workouts/week", factor: 1.725 },
];

function estimateTDEE({ weight, height, age, gender, activity }) {
  if (!weight || !height || !age) return 2000;
  const w = weight;
  const h = height;
  const a = age;
  const bmr =
    gender === "female"
      ? 447.593 + 9.247 * w + 3.098 * h - 4.330 * a
      : 88.362 + 13.397 * w + 4.799 * h - 5.677 * a;
  const factor = activityLevels.find((x) => x.key === activity)?.factor || 1.2;
  return Math.round(bmr * factor);
}

function macroSplit(goal) {
  if (goal === "gain") return { proteinPct: 0.25, carbsPct: 0.45, fatPct: 0.3 };
  if (goal === "lose") return { proteinPct: 0.3, carbsPct: 0.4, fatPct: 0.3 };
  return { proteinPct: 0.25, carbsPct: 0.45, fatPct: 0.3 };
}

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("lose");
  const [gender, setGender] = useState("male");
  const [age, setAge] = useState(28);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState("light");
  const [saving, setSaving] = useState(false);

  const tdee = useMemo(
    () => estimateTDEE({ weight, height, age, gender, activity }),
    [weight, height, age, gender, activity],
  );

  const targetCals = useMemo(() => {
    const delta = goal === "lose" ? -400 : goal === "gain" ? 250 : 0;
    return Math.max(1200, tdee + delta);
  }, [tdee, goal]);

  const macros = useMemo(() => {
    const { proteinPct, carbsPct, fatPct } = macroSplit(goal);
    const cal = targetCals;
    const protein = Math.round((cal * proteinPct) / 4);
    const carbs = Math.round((cal * carbsPct) / 4);
    const fat = Math.round((cal * fatPct) / 9);
    return { protein, carbs, fat };
  }, [targetCals, goal]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings(user.uid, {
        goal,
        gender,
        age,
        height,
        weight,
        activity,
        calorieGoal: targetCals,
        macroProtein: macros.protein,
        macroCarbs: macros.carbs,
        macroFat: macros.fat,
      });
      onComplete?.();
    } catch (err) {
      console.warn("Onboarding save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "What's your goal?",
      content: (
        <div className={styles.cardGrid}>
          {goals.map((g) => (
            <button
              key={g.key}
              className={`${styles.card} ${goal === g.key ? styles.cardActive : ""}`}
              onClick={() => setGoal(g.key)}
            >
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Gender & Age",
      content: (
        <div className={styles.splitRow}>
          <div className={styles.cardGridTwo}>
            {["male", "female"].map((g) => (
              <button
                key={g}
                className={`${styles.card} ${gender === g ? styles.cardActive : ""}`}
                onClick={() => setGender(g)}
              >
                <h3 style={{ textTransform: "capitalize" }}>{g}</h3>
              </button>
            ))}
          </div>
          <div className={styles.field}>
            <label>Age</label>
            <input
              type="number"
              className={`input ${styles.input}`}
              min={14}
              max={90}
              value={age}
              onChange={(e) => setAge(Math.max(14, parseInt(e.target.value) || age))}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Height & Weight",
      content: (
        <div className={styles.splitRow}>
          <div className={styles.field}>
            <label>Height (cm)</label>
            <input
              type="range"
              min={130}
              max={210}
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || height)}
            />
            <div className={styles.value}>{height} cm</div>
          </div>
          <div className={styles.field}>
            <label>Weight (kg)</label>
            <input
              type="number"
              className={`input ${styles.input}`}
              min={35}
              max={200}
              value={weight}
              onChange={(e) => setWeight(Math.max(35, parseFloat(e.target.value) || weight))}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Activity level",
      content: (
        <div className={styles.cardGrid}>
          {activityLevels.map((a) => (
            <button
              key={a.key}
              className={`${styles.card} ${activity === a.key ? styles.cardActive : ""}`}
              onClick={() => setActivity(a.key)}
            >
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Your plan is ready",
      content: (
        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Daily calories</span>
            <strong>{targetCals} kcal</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Protein</span>
            <strong>{macros.protein} kcal ({Math.round((macros.protein * 4 * 100) / targetCals)}%)</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Carbs</span>
            <strong>{macros.carbs} kcal</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Fat</span>
            <strong>{macros.fat} kcal</strong>
          </div>
          <p className={styles.validation}>
            {goal === "lose"
              ? "This should get you losing ~0.4 kg/week."
              : goal === "gain"
                ? "Expect ~0.25 kg/week gain if you train."
                : "Maintenance plan to keep you steady."}
          </p>
        </div>
      ),
    },
  ];

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
          <h1 className={styles.title}>{steps[step].title}</h1>
        </div>

        <div className={styles.body}>{steps[step].content}</div>

        <div className={styles.footer}>
          <button className={styles.secondary} onClick={back} disabled={step === 0}>
            Back
          </button>
          {step < steps.length - 1 ? (
            <button className={styles.primary} onClick={next}>
              Next
            </button>
          ) : (
            <button className={styles.primary} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Start tracking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
