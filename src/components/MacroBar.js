"use client";

import { useEffect, useState } from "react";
import styles from "./MacroBar.module.css";

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  const macros = [
    { name: "Protein", val: protein, goal: 158, color: "var(--accent-protein)" },
    { name: "Carbs", val: carbs, goal: 210, color: "var(--accent-carbs)" },
    { name: "Fat", val: fat, goal: 70, color: "var(--accent-fat)" },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        {macros.map((m, i) => {
          const pct = Math.min((m.val / m.goal) * 100, 100);
          const r = 28;
          const circumference = 2 * Math.PI * r;
          const offset = circumference * (1 - (mounted ? pct / 100 : 0));

          return (
            <div key={m.name} className={styles.macroItem}>
              <div className={styles.ringWrapper}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle
                    cx="34" cy="34" r={r}
                    fill="none"
                    stroke="var(--bg-highest)"
                    strokeWidth="5"
                  />
                  <circle
                    cx="34" cy="34" r={r}
                    fill="none"
                    stroke={m.color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 34 34)"
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                  />
                </svg>
                <div className={styles.ringCenter}>
                  <span className={styles.ringVal}>{Math.round(m.val)}</span>
                </div>
              </div>
              <div className={styles.macroLabel}>{m.name}</div>
              <div className={styles.macroGoal}>{Math.round(m.val)}/{m.goal}g</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
