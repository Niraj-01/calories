import { useState } from "react";
import styles from "./MealSection.module.css";

const ICONS = {
  breakfast: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg>,
  lunch: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  dinner: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  snacks: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>,
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
            <div className={styles.icon}>{ICONS[meal] || meal.charAt(0).toUpperCase()}</div>
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
                    <span className={styles.macroPill} style={{background:'rgba(74,144,217,0.1)', color:'var(--accent-protein)'}}>P {Math.round(e.protein)}</span>
                    <span className={styles.macroPill} style={{background:'rgba(245,166,35,0.1)', color:'#C48200'}}>C {Math.round(e.carbs)}</span>
                    <span className={styles.macroPill} style={{background:'rgba(208,2,27,0.08)', color:'var(--accent-fat)'}}>F {Math.round(e.fat)}</span>
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
