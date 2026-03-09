"use client";

import styles from "./MacroBar.module.css";

const macroConfig = [
  { key: "protein", label: "Protein", color: "var(--protein)", unit: "g" },
  { key: "carbs", label: "Carbs", color: "var(--carbs)", unit: "g" },
  { key: "fat", label: "Fat", color: "var(--fat)", unit: "g" },
];

export default function MacroBar({ protein = 0, carbs = 0, fat = 0 }) {
  const values = { protein, carbs, fat };
  const maxVal = Math.max(protein, carbs, fat, 1);

  return (
    <div className={styles.container}>
      {macroConfig.map((m) => (
        <div key={m.key} className={styles.row}>
          <div className={styles.labelRow}>
            <span className={styles.dot} style={{ background: m.color }} />
            <span className={styles.label}>{m.label}</span>
            <span className={`${styles.value} num`}>
              {values[m.key].toFixed(1)}{m.unit}
            </span>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{
                width: `${Math.min((values[m.key] / maxVal) * 100, 100)}%`,
                background: m.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
