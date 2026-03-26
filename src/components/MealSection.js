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
  const hasEntries = entries.length > 0;

  const toggleExpanded = () => setExpanded((val) => !val);

  return (
    <div className={styles.card}>
      <button className={styles.summaryRow} onClick={toggleExpanded}>
        <div className={styles.leftPair}>
          <span className={styles.icon}>{ICONS[meal] || "🍽️"}</span>
          <div className={styles.nameBlock}>
            <span className={styles.mealName}>{meal}</span>
            <span className={styles.mealMeta}>
              {hasEntries
                ? `${entries.length} item${entries.length > 1 ? "s" : ""}`
                : "Empty"}
            </span>
          </div>
        </div>

        <div className={styles.rightPair}>
          <span className={styles.mealCalories}>
            {hasEntries ? `${totalCals} kcal` : "— kcal"}
          </span>
          <svg
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </button>

      <div className={`${styles.panel} ${expanded ? styles.panelOpen : ""}`}>
        <div className={styles.itemsList}>
          {hasEntries ? (
            entries.map((e) => (
              <div key={e.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{e.name}</span>
                  <span className={styles.itemSub}>
                    {e.servingAmount} {e.servingUnit} {e.brand ? `· ${e.brand}` : ""}
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
            ))
          ) : (
            <div className={styles.emptyState}>No foods logged yet</div>
          )}
        </div>

        <button
          className={styles.inlineAddBtn}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
