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
    <div className={styles.section}>
      {macros.map((m) => (
        <div key={m.name} className={styles.row}>
          <div className={styles.header}>
            <div className={styles.name}>{m.name}</div>
            <div className={styles.values}><span>{Math.round(m.val)}g</span> / {m.goal}g</div>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{
                width: mounted ? `${Math.min((m.val / m.goal) * 100, 100)}%` : "0%",
                background: m.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
