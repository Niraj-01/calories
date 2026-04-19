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
  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);

  const toggleExpanded = () => setExpanded((val) => !val);

  return (
    <div className={styles.card}>
      <div className={styles.summaryRow}>
        <button className={styles.summaryButton} onClick={toggleExpanded}>
          <div className={styles.leftPair}>
            <div className={styles.icon}>{ICONS[meal] || "🍽️"}</div>
            <div className={styles.nameBlock}>
              <span className={styles.mealName}>{mealLabel}</span>
              <span className={styles.mealMeta}>{totalCals} kcal</span>
            </div>
          </div>

          <div className={styles.rightPair}>
            <svg
              className={`${styles.chevron} ${expanded ? styles.open : ""}`}
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
        <button className={styles.addButton} onClick={onAdd}>
          + Add Food
        </button>
      </div>

      <div className={`${styles.panel} ${expanded ? styles.open : ""}`}>
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
                  <div className={styles.itemTopRow}>
                    <span className={styles.itemCals}>{e.calories} kcal</span>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDelete?.(e.id)}
                      aria-label={`Delete ${e.name}`}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.macroPills}>
                    <span className={styles.macroPill} style={{background:'rgba(52,200,138,0.15)', color:'var(--accent-protein)'}}>P {Math.round(e.protein)}</span>
                    <span className={styles.macroPill} style={{background:'rgba(91,140,255,0.15)', color:'var(--accent-carbs)'}}>C {Math.round(e.carbs)}</span>
                    <span className={styles.macroPill} style={{background:'rgba(245,166,35,0.15)', color:'var(--accent-fat)'}}>F {Math.round(e.fat)}</span>
                  </div>
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
          + Add food
        </button>
      </div>
    </div>
  );
}
