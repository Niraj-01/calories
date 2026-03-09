"use client";

import { useState } from "react";
import styles from "./MealSection.module.css";

const mealIcons = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snacks: "🍿",
};

export default function MealSection({ meal, entries = [], onAdd, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  const totalCals = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
  const count = entries.length;

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <div className={styles.headerLeft}>
          <span className={styles.icon}>{mealIcons[meal] || "🍽️"}</span>
          <span className={styles.mealName}>
            {meal.charAt(0).toUpperCase() + meal.slice(1)}
          </span>
          {count > 0 && (
            <span className={styles.count}>{count}</span>
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={`${styles.totalCals} num`}>{totalCals}</span>
          <span className={styles.chevron} data-expanded={expanded}>
            ›
          </span>
        </div>
      </button>

      {expanded && (
        <div className={styles.body}>
          {entries.length === 0 ? (
            <p className={styles.empty}>No entries yet</p>
          ) : (
            <ul className={styles.list}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.entry}>
                  <div className={styles.entryInfo}>
                    <span className={styles.entryName}>{entry.name}</span>
                    <span className={styles.entryMeta}>
                      {entry.servingAmount || 100}{entry.servingUnit || "g"}
                    </span>
                  </div>
                  <div className={styles.entryRight}>
                    <span className={`${styles.entryCals} num`}>
                      {entry.calories}
                    </span>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => onDelete(entry.id)}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button className={styles.addBtn} onClick={onAdd}>
            <span>+</span> Add food
          </button>
        </div>
      )}
    </div>
  );
}
