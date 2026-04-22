"use client";

import { useEffect, useState } from "react";
import styles from "./WaterTracker.module.css";

const DEFAULT_GOAL = 2500; // ml

export default function WaterTracker({ intake, goal: goalProp, onAdd, onSubtract }) {
  const [filled, setFilled] = useState(Math.round(intake / 250)); // cups
  const GOAL = Math.round((goalProp || DEFAULT_GOAL) / 250); // convert ml to cups
  const pct = Math.min((filled / GOAL) * 100, 100);

  useEffect(() => {
    setFilled(Math.round(intake / 250));
  }, [intake]);

  const handleCupClick = (index) => {
    const newFilled = index < filled ? index : index + 1;
    const mlDiff = (newFilled - filled) * 250;
    setFilled(newFilled);
    if (mlDiff > 0 && onAdd) {
      onAdd(mlDiff);
    } else if (mlDiff < 0 && onSubtract) {
      onSubtract(Math.abs(mlDiff));
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.icon}><svg width="18" height="18" viewBox="0 0 24 24" fill="#4A90D9" stroke="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg></div>
          <div>
            <div className={styles.title}>Water</div>
            <div className={styles.sub}>Daily intake</div>
          </div>
        </div>
        <div>
          <div className={styles.amount}>
            {(filled * 250 / 1000).toFixed(1)}L / {(GOAL * 250 / 1000).toFixed(1)}L
          </div>
          <div className={styles.goal}>
            {filled}/{GOAL} cups
          </div>
        </div>
      </div>

      <div className={styles.track}>
        <div className={styles.fill} style={{width: `${pct}%`}} />
      </div>

      <div className={styles.cups}>
        {Array.from({length: GOAL}).map((_, i) => (
          <button
            key={i}
            className={`${styles.cup} ${i < filled ? styles.filled : ""}`}
            onClick={() => handleCupClick(i)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}
