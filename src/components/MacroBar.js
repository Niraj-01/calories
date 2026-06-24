"use client";

import { useEffect, useState } from "react";
import styles from "./MacroBar.module.css";

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const macros = [
    { name: "Protein", val: protein, goal: 158, color: "var(--accent-protein)", track: "var(--tint-protein)" },
    { name: "Carbs", val: carbs, goal: 210, color: "var(--accent-carbs)", track: "var(--tint-carbs)" },
    { name: "Fat", val: fat, goal: 70, color: "var(--accent-fat)", track: "var(--tint-fat)" },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        {macros.map((m) => {
          const r = 29;
          const circumference = 2 * Math.PI * r;
          const pct = Math.min((m.val / m.goal) * 100, 100);
          const offset = circumference * (1 - (mounted ? pct / 100 : 0));

          return (
            <div key={m.name} className={styles.macroItem}>
              <div className={styles.ringWrapper}>
                <svg width="70" height="70" viewBox="0 0 70 70" className={styles.svg}>
                  <circle cx="35" cy="35" r={r} fill="none" stroke={m.track} strokeWidth="7" />
                  <circle
                    cx="35"
                    cy="35"
                    r={r}
                    fill="none"
                    stroke={m.color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={styles.progress}
                  />
                </svg>
                <div className={styles.ringCenter}>
                  <span className={styles.ringVal}>{Math.round(m.val)}</span>
                  <span className={styles.ringUnit}>g</span>
                </div>
              </div>
              <div className={styles.macroLabel}>{m.name}</div>
              <div className={styles.macroGoal}>of {m.goal}g</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
