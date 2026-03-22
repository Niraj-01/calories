"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

export default function CalorieRing({ consumed = 0, goal = 2000 }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const isOver = consumed > goal;

  useEffect(() => {
    const ratio = Math.min(consumed / Math.max(goal, 1), 1);
    const targetOffset = circumference - ratio * circumference;
    const timer = setTimeout(() => setOffset(targetOffset), 80);
    return () => clearTimeout(timer);
  }, [consumed, goal, circumference]);

  return (
    <div className={styles.container}>
      <div className={`${styles.glow} ${isOver ? styles.glowOver : ""}`} />
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className={styles.svg}
      >
        <circle cx="100" cy="100" r="90" className={styles.bg} />
        <circle
          cx="100"
          cy="100"
          r="90"
          className={`${styles.progress} ${isOver ? styles.progressOver : ""}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.value}>
          {Math.round(consumed).toLocaleString()}
        </span>
        <span className={styles.unit}>kcal</span>
        <span className={styles.sub}>
          of {Math.round(goal).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
