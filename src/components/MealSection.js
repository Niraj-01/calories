import { useState } from "react";
import styles from "./MealSection.module.css";

const ICONS = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snacks: "🍿",
};

export default function MealSection({ meal, entries = [], onAdd, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totalCals = entries.reduce((s, e) => s + (e.calories || 0), 0);

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div
          className={styles.leftPair}
          onClick={() => setExpanded(!expanded)}
          style={{
            cursor: entries.length > 0 ? "pointer" : "default",
            flex: 1,
          }}
        >
          <span className={styles.icon}>{ICONS[meal] || "🍽️"}</span>
          <div className={styles.nameBlock}>
            <span className={styles.mealName}>{meal}</span>
            <span className={styles.mealCalories}>
              {totalCals} kcal
              {entries.length > 0 && (
                <svg
                  className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </span>
          </div>
        </div>
        <button className={styles.addBtn} onClick={onAdd}>
          + Add Food
        </button>
      </div>

      {expanded && entries.length > 0 && (
        <div className={styles.itemsList}>
          {entries.map((e) => (
            <div key={e.id} className={styles.itemRow}>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{e.name}</span>
                <span className={styles.itemSub}>
                  {e.servingAmount} {e.servingUnit}{" "}
                  {e.brand ? `· ${e.brand}` : ""}
                </span>
              </div>
              <div className={styles.itemRight}>
                <span className={styles.itemCals}>{e.calories} kcal</span>
                <button
                  className={styles.deleteBtn}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onDelete(e.id);
                  }}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
