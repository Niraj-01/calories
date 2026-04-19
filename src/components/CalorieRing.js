"use client";

import { useEffect, useState } from "react";
import styles from "./CalorieRing.module.css";

export default function CalorieRing({ consumed = 0, goal = 2000, burned = 0 }) {
  const [mounted, setMounted] = useState(false);
  const r = 88, cx = 110, cy = 110;
  const circumference = 2 * Math.PI * r;

  const adjustedGoal = Math.max(goal + burned, 1);
  const pct = Math.min(consumed / adjustedGoal, 1);
  const offset = circumference * (1 - pct);
  const net = adjustedGoal - consumed;

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

  return (
    <div className={styles.section}>
      <div className={styles.wrapper}>
        <svg width="220" height="220" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F4F4F7" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Track background */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14"/>

          {/* Main progress ring */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={mounted ? offset : circumference}
            transform={`rotate(-90 ${cx} ${cy})`}
            filter="url(#glow)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
            }}
          />

          {/* Burned ring (outer inner) */}
          <circle cx={cx} cy={cy} r={r - 20} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
          <circle
            cx={cx} cy={cy} r={r - 20}
            fill="none"
            stroke="rgba(255,159,10,0.45)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference * 0.85}
            strokeDashoffset={mounted ? (2 * Math.PI * (r-20)) * (1 - Math.min(burned / (goal * 0.25), 1)) : (2 * Math.PI * (r-20))}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dashoffset 1s ease 0.3s' }}
          />
        </svg>

        <div className={styles.center}>
          <div className={styles.caloriesNum}>{consumed.toLocaleString()}</div>
          <div className={styles.caloriesLabel}>kcal eaten</div>
        </div>
      </div>

      <div className={styles.remaining}>
        <span>{net > 0 ? net.toLocaleString() : 0} kcal</span> {net > 0 ? 'remaining' : 'over goal'}
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'rgba(255,107,53,0.8)'}}>{goal.toLocaleString()}</div>
          <div className={styles.statLabel}>Goal</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'rgba(255,140,90,0.7)'}}>+{burned}</div>
          <div className={styles.statLabel}>Burned</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>{Math.round(pct * 100)}%</div>
          <div className={styles.statLabel}>Progress</div>
        </div>
      </div>
    </div>
  );
}
