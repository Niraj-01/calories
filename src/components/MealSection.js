import { useState } from "react";
import styles from "./MealSection.module.css";

const ICONS = {
  breakfast: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  lunch: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"/></svg>,
  dinner: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
  snacks: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a3 3 0 0 1 0 6h-1M4 8h14v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M6 2v2M10 2v2M14 2v2"/></svg>,
};

const TINTS = {
  breakfast: { tint: "#FFF6E8", color: "#F0A500" },
  lunch: { tint: "#FFF1E8", color: "#FF7A3D" },
  dinner: { tint: "#EEF0FF", color: "#6B7BFF" },
  snacks: { tint: "#EAF8F1", color: "#16B26A" },
};

export default function MealSection({ meal, entries = [], onAdd, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totalCals = Math.round(entries.reduce((s, e) => s + (e.calories || 0), 0));
  const hasEntries = entries.length > 0;
  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
  const { tint, color } = TINTS[meal] || TINTS.snacks;
  const sub = hasEntries
    ? entries.map((e) => e.name).join(" · ")
    : "Nothing logged yet";

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <button
          className={styles.main}
          onClick={() => hasEntries && setExpanded((v) => !v)}
        >
          <div className={styles.iconTile} style={{ background: tint, color }}>
            {ICONS[meal]}
          </div>
          <div className={styles.nameBlock}>
            <div className={styles.mealName}>{mealLabel}</div>
            <div className={styles.mealSub}>{sub}</div>
          </div>
          <div
            className={styles.kcal}
            style={{ color: hasEntries ? "var(--text-primary)" : "var(--text-tertiary)" }}
          >
            {totalCals}
          </div>
        </button>
        <button className={styles.addBtn} onClick={onAdd} aria-label={`Add to ${mealLabel}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      <div className={`${styles.panel} ${expanded ? styles.open : ""}`}>
        {entries.map((e) => (
          <div key={e.id} className={styles.itemRow}>
            <div className={styles.itemInfo}>
              <span className={styles.itemName}>{e.name}</span>
              <span className={styles.itemMeta}>
                {e.servingAmount} {e.servingUnit}
                {e.brand ? ` · ${e.brand}` : ""}
              </span>
            </div>
            <span className={styles.itemCals}>{Math.round(e.calories)} kcal</span>
            <button
              className={styles.deleteBtn}
              onClick={() => onDelete?.(e.id)}
              aria-label={`Delete ${e.name}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
