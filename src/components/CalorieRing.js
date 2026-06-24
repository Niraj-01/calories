"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

const R = 86;
const CIRC = 2 * Math.PI * R;

export default function CalorieRing({ consumed = 0, goal = 2000, burned = 0 }) {
  const [mounted, setMounted] = useState(false);
  const adjustedGoal = Math.max(goal + burned, 1);
  const left = Math.max(Math.round(adjustedGoal - consumed), 0);
  const pct = Math.min(consumed / adjustedGoal, 1);
  const offset = CIRC * (1 - (mounted ? pct : 0));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.ringWrap}>
        <div className={styles.ring}>
          <svg width="200" height="200" viewBox="0 0 200 200" className={styles.svg}>
            <circle cx="100" cy="100" r={R} fill="none" stroke="var(--bg-highest)" strokeWidth="17" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="url(#calg)"
              strokeWidth="17"
              strokeLinecap="round"
              strokeDasharray={CIRC.toFixed(1)}
              strokeDashoffset={offset}
              className={styles.progress}
            />
            <defs>
              <linearGradient id="calg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1FD080" />
                <stop offset="1" stopColor="#0E9A59" />
              </linearGradient>
            </defs>
          </svg>
          <div className={styles.center}>
            <div className={styles.left}>{left.toLocaleString()}</div>
            <div className={styles.leftLabel}>KCAL LEFT</div>
          </div>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>GOAL</div>
          <div className={styles.statVal}>{goal.toLocaleString()}</div>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <div className={`${styles.statLabel} ${styles.food}`}>FOOD</div>
          <div className={styles.statVal}>{Math.round(consumed).toLocaleString()}</div>
        </div>
        <div className={styles.divider} />
        <div className={styles.stat}>
          <div className={`${styles.statLabel} ${styles.burn}`}>BURN</div>
          <div className={styles.statVal}>{Math.round(burned).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
