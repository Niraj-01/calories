"use client";

import { useState } from "react";
import styles from "./MealSection.module.css";

const mealIcons = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snacks: "🍿",
};

export default function MealSection({ meal, entries = [], onAdd, onScan, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  const totalCals = entries.reduce((sum, e) => sum + (e.calories || 0), 0);

  return (
    <div className={`card ${styles.section}`}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={styles.headerLeft}>
          <span className={styles.icon}>{mealIcons[meal] || "🍽️"}</span>
          <span className={styles.mealName}>
            {meal.charAt(0).toUpperCase() + meal.slice(1)}
          </span>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.totalCals}>
            {totalCals > 0 && <>{totalCals}<span className={styles.kcalUnit}>kcal</span></>}
          </span>
          <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}>
            ‹
          </span>
        </div>
      </button>

      <div className={`${styles.body} ${expanded ? styles.bodyOpen : ""}`}>
        {entries.length === 0 ? (
          <p className={styles.empty}>Nothing logged yet</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => (
              <li key={entry.id} className={styles.entry}>
                <div className={styles.entryInfo}>
                  <span className={styles.entryName}>{entry.name}</span>
                  <span className={styles.entryBrand}>
                    {entry.brand || `${entry.servingAmount || 100}${entry.servingUnit || "g"}`}
                  </span>
                </div>
                <div className={styles.entryRight}>
                  <span className={styles.entryCals}>
                    {entry.calories}
                    <span className={styles.entryUnit}>kcal</span>
                  </span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete(entry.id)}
                    aria-label="Remove"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.actions}>
          <button className={styles.addBtn} onClick={onAdd}>
            + Add Food
          </button>
          <button className={styles.addBtn} onClick={onScan}>
            📷 Scan
          </button>
        </div>
      </div>
    </div>
  );
}
