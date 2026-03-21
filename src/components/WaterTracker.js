"use client";

import { useState } from "react";
import styles from "./WaterTracker.module.css";

const GOAL = 2500; // ml

export default function WaterTracker({ intake, onAdd }) {
  const [animating, setAnimating] = useState(false);
  const pct = Math.min((intake / GOAL) * 100, 100);

  const add = (ml) => {
    setAnimating(true);
    onAdd(ml);
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <div className={`card ${styles.card}`}>
      <div className={styles.header}>
        <span className={styles.title}>💧 Water</span>
        <span className={styles.amount}>
          {(intake / 1000).toFixed(1)}
          <span className={styles.unit}> / {(GOAL / 1000).toFixed(1)}L</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${animating ? styles.pulse : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick-add buttons */}
      <div className={styles.buttons}>
        <button className={styles.btn} onClick={() => add(150)}>
          <span className={styles.icon}>☕</span>
          <span>150ml</span>
        </button>
        <button className={styles.btn} onClick={() => add(250)}>
          <span className={styles.icon}>🥛</span>
          <span>250ml</span>
        </button>
        <button className={styles.btn} onClick={() => add(500)}>
          <span className={styles.icon}>🍶</span>
          <span>500ml</span>
        </button>
        <button className={styles.btn} onClick={() => add(750)}>
          <span className={styles.icon}>🧴</span>
          <span>750ml</span>
        </button>
      </div>
    </div>
  );
}
