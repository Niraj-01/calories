"use client";

import { useEffect, useState } from "react";
import styles from "./MacroBar.module.css";

const macroConfig = [
  { key: "protein", label: "Protein", icon: "🍗", color: "#22c55e", bg: "rgba(34, 197, 94, 0.4)", shadow: "rgba(34, 197, 94, 0.2)", max: 150 },
  { key: "carbs", label: "Carbs", icon: "🍞", color: "#eab308", bg: "rgba(234, 179, 8, 0.4)", shadow: "rgba(234, 179, 8, 0.2)", max: 250 },
  { key: "fat", label: "Fat", icon: "🥑", color: "#ef4444", bg: "rgba(239, 68, 68, 0.4)", shadow: "rgba(239, 68, 68, 0.2)", max: 80 },
];

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const values = { protein, carbs, fat };
  const maxVals = {
    protein: Math.max(protein, 150),
    carbs: Math.max(carbs, 250),
    fat: Math.max(fat, 80)
  };
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.grid}>
      {macroConfig.map((m, i) => {
        const pct = Math.min((values[m.key] / maxVals[m.key]) * 100, 100);
        return (
          <div key={m.key} className={styles.card}>
            <div className={styles.header}>
              <span className={styles.icon}>{m.icon}</span>
              <span className={styles.label}>{m.label}</span>
            </div>
            <span className={styles.value}>
              {values[m.key].toFixed(0)}g
            </span>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  backgroundColor: m.bg,
                  boxShadow: `0 0 5px ${m.shadow}`,
                  transitionDelay: `${i * 100}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
