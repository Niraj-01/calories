"use client";

import { useEffect, useState } from "react";
import styles from "./WaterTracker.module.css";

const DEFAULT_GOAL = 2500; // ml
const CUP_ML = 250;

export default function WaterTracker({ intake, goal: goalProp, onAdd, onSubtract }) {
  const [filled, setFilled] = useState(Math.round(intake / CUP_ML));
  const GOAL = Math.round((goalProp || DEFAULT_GOAL) / CUP_ML); // cups

  useEffect(() => {
    setFilled(Math.round(intake / CUP_ML));
  }, [intake]);

  const handleCupClick = (index) => {
    const newFilled = index + 1 === filled ? index : index + 1;
    const mlDiff = (newFilled - filled) * CUP_ML;
    setFilled(newFilled);
    if (mlDiff > 0 && onAdd) onAdd(mlDiff);
    else if (mlDiff < 0 && onSubtract) onSubtract(Math.abs(mlDiff));
  };

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <div className={styles.icon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--accent-water)">
              <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" />
            </svg>
          </div>
          <div>
            <div className={styles.title}>Water</div>
            <div className={styles.sub}>
              {filled} of {GOAL} cups
            </div>
          </div>
        </div>
        <div className={styles.amount}>
          {(filled * CUP_ML / 1000).toFixed(1)}
          <span className={styles.amountGoal}> / {(GOAL * CUP_ML / 1000).toFixed(1)}L</span>
        </div>
      </div>

      <div className={styles.cups}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <button
            key={i}
            className={`${styles.cup} ${i < filled ? styles.filled : ""}`}
            onClick={() => handleCupClick(i)}
            aria-label={`${i + 1} cups`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
