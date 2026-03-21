"use client";

import { useEffect, useState } from "react";
import styles from "./MacroBar.module.css";

const macroConfig = [
  { key: "protein", label: "Protein", cssColor: "var(--accent-protein)" },
  { key: "carbs", label: "Carbs", cssColor: "var(--accent-carbs)" },
  { key: "fat", label: "Fat", cssColor: "var(--accent-fat)" },
];

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const values = { protein, carbs, fat };
  const maxVal = Math.max(protein, carbs, fat, 1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={styles.container}>
      <h4 className={styles.sectionHeader}>Macros</h4>
      {macroConfig.map((m, i) => {
        const pct = Math.min((values[m.key] / maxVal) * 100, 100);
        return (
          <div key={m.key} className={styles.row}>
            <div className={styles.labelRow}>
              <div className={styles.labelLeft}>
                <span
                  className={styles.dot}
                  style={{ background: m.cssColor }}
                />
                <span className={styles.label}>{m.label}</span>
              </div>
              <span className={styles.value}>
                {values[m.key].toFixed(1)}g
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width: mounted ? `${pct}%` : "0%",
                  background: m.cssColor,
                  transitionDelay: `${i * 150}ms`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
