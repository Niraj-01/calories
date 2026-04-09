"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

export default function CalorieRing({ consumed = 0, goal = 2000, burned = 0 }) {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const adjustedGoal = Math.max(goal + burned, 1);
  const isOver = consumed > adjustedGoal;
  const remaining = Math.max(adjustedGoal - consumed, 0);

  useEffect(() => {
    const ratio = Math.min(consumed / adjustedGoal, 1);
    const targetOffset = circumference - ratio * circumference;
    const timer = setTimeout(() => setOffset(targetOffset), 80);
    return () => clearTimeout(timer);
  }, [consumed, adjustedGoal, circumference]);

  return (
    <div className={styles.container}>
      <div className={`${styles.glow} ${isOver ? styles.glowOver : ""}`} />
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className={styles.svg}
      >
        <defs>
          <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-hover)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="90" className={styles.bg} />
        <circle
          cx="100"
          cy="100"
          r="90"
          className={`${styles.progress} ${isOver ? styles.progressOver : ""}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke={isOver ? "var(--danger)" : "url(#primaryGradient)"}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.value}>
          {Math.round(consumed).toLocaleString()}
        </span>
        <span className={styles.unit}>kcal consumed</span>
        {burned > 0 && (
          <span className={styles.sub}>Net: {Math.round(consumed - burned)} kcal</span>
        )}
        <span className={styles.remaining}>
          {isOver
            ? `${Math.round(consumed - adjustedGoal)} over`
            : `${Math.round(remaining)} left`}
        </span>
      </div>
    </div>
  );
}
