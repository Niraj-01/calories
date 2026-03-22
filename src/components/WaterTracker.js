"use client";

import { useState } from "react";
import styles from "./WaterTracker.module.css";

const GOAL = 2500; // ml

export default function WaterTracker({ intake, onAdd }) {
  const [animating, setAnimating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const pct = Math.min((intake / GOAL) * 100, 100);

  const add = (ml) => {
    setAnimating(true);
    onAdd(ml);
    setExpanded(false);
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.leftPair}>
          <span className={styles.icon}>💧</span>
          <span className={styles.title}>Water</span>
        </div>
        <div className={styles.rightPair}>
          <span className={styles.amount}>
            {(intake / 1000).toFixed(1)}L / {(GOAL / 1000).toFixed(1)}L
          </span>
          <button className={styles.addBtn} onClick={() => setExpanded(!expanded)}>
            +
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.track}>
        <div
          className={`${styles.fill} ${animating ? styles.pulse : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick-add buttons */}
      {expanded && (
        <div className={styles.buttons}>
          <button className={styles.btn} onClick={() => add(150)}>
            <span className={styles.btnIcon}>☕</span>
            <span className={styles.btnLabel}>150ml</span>
          </button>
          <button className={styles.btn} onClick={() => add(250)}>
            <span className={styles.btnIcon}>🥛</span>
            <span className={styles.btnLabel}>250ml</span>
          </button>
          <button className={styles.btn} onClick={() => add(500)}>
            <span className={styles.btnIcon}>🍶</span>
            <span className={styles.btnLabel}>500ml</span>
          </button>
          <button className={styles.btn} onClick={() => add(750)}>
            <span className={styles.btnIcon}>🧴</span>
            <span className={styles.btnLabel}>750ml</span>
          </button>
        </div>
      )}
    </div>
  );
}
