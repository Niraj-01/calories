"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

export default function CalorieRing({ consumed = 0, goal = 2000 }) {
  const radius = 100;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const [offset, setOffset] = useState(circumference);
  const isOver = consumed > goal;

  useEffect(() => {
    const ratio = Math.min(consumed / Math.max(goal, 1), 1.5);
    const targetOffset = circumference - ratio * circumference;
    const timer = setTimeout(() => setOffset(targetOffset), 80);
    return () => clearTimeout(timer);
  }, [consumed, goal, circumference]);

  return (
    <div className={styles.wrapper}>
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className={styles.svg}
      >
        {/* Background track */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          className={styles.track}
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={radius}
          cy={radius}
          r={normalizedRadius}
          fill="none"
          className={`${styles.progress} ${isOver ? styles.over : ""}`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
      </svg>
      <div className={styles.center}>
        <span className={styles.consumed}>{consumed}</span>
        <span className={styles.kcalLabel}>kcal</span>
        <span className={styles.goalLabel}>of {goal}</span>
      </div>
    </div>
  );
}
