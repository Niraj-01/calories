"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

export default function CalorieRing({ consumed = 0, goal = 2000, burned = 0 }) {
  const [mounted, setMounted] = useState(false);
  const adjustedGoal = Math.max(goal + burned, 1);
  const remaining = Math.max(adjustedGoal - consumed, 0);
  const pct = Math.min(consumed / adjustedGoal, 1);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    <div className={styles.card}>
      {/* Main remaining display */}
      <div className={styles.remainingBlock}>
        <div className={styles.remainingNum}>{remaining.toLocaleString()}</div>
        <div className={styles.remainingLabel}>Remaining</div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressTrack}>
        <div
          className={styles.progressFill}
          style={{ width: mounted ? `${pct * 100}%` : "0%" }}
        />
      </div>

      {/* Stat columns */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className={styles.statVal}>{goal.toLocaleString()}</div>
          <div className={styles.statLabel}>Goal</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statIcon} style={{ color: "var(--accent)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </div>
          <div className={styles.statVal}>{consumed.toLocaleString()}</div>
          <div className={styles.statLabel}>Food</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statIcon} style={{ color: "var(--accent-streak)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className={styles.statVal}>{burned}</div>
          <div className={styles.statLabel}>Exercise</div>
        </div>
      </div>
    </div>
  );
}
