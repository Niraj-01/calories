"use client";

import { useMemo, useState } from "react";
import { rescaleItem, totalsFor, SOURCE_DATABASE } from "@/src/services/mealResolver";
import styles from "./MealConfirmCard.module.css";

const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snacks", label: "Snacks" },
];

/**
 * The editable review step between "the AI parsed your sentence" and "it's in
 * your log". Nothing here touches Firestore until the user taps Log.
 *
 * Once logged the card stays visible but goes read-only, so the transcript
 * remains an accurate record of what was actually saved.
 */
export default function MealConfirmCard({
  items: initialItems,
  meal: initialMeal,
  logged = false,
  onLog,
}) {
  const [items, setItems] = useState(initialItems);
  const [meal, setMeal] = useState(initialMeal);
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => totalsFor(items), [items]);

  const updateGrams = (index, grams) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? rescaleItem(item, grams) : item)),
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLog = async () => {
    if (saving || items.length === 0) return;
    setSaving(true);
    try {
      await onLog(items, meal);
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return <div className={styles.emptied}>All items removed.</div>;
  }

  return (
    <div className={`${styles.card} ${logged ? styles.cardLogged : ""}`}>
      <div className={styles.itemList}>
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className={styles.item}>
            <div className={styles.itemMain}>
              <div className={styles.itemHead}>
                <span className={styles.itemName}>{item.name}</span>
                <span
                  className={`${styles.badge} ${
                    item.source === SOURCE_DATABASE ? styles.badgeDb : styles.badgeAi
                  }`}
                  title={
                    item.source === SOURCE_DATABASE
                      ? `Nutrition from database${item.matchedName ? `: ${item.matchedName}` : ""}`
                      : "Estimated by AI — no database match found"
                  }
                >
                  {item.source === SOURCE_DATABASE ? "DB" : "AI"}
                </span>
              </div>

              <div className={styles.macros}>
                <span className={styles.macroP}>P {item.protein}g</span>
                <span className={styles.macroC}>C {item.carbs}g</span>
                <span className={styles.macroF}>F {item.fat}g</span>
              </div>
            </div>

            <div className={styles.itemSide}>
              <span className={styles.calories}>{item.calories}</span>
              <span className={styles.kcal}>kcal</span>
            </div>

            {!logged && (
              <div className={styles.controls}>
                <label className={styles.gramsWrap}>
                  <input
                    className={styles.gramsInput}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="5000"
                    value={item.grams}
                    onChange={(e) => updateGrams(index, e.target.value)}
                    aria-label={`Portion size for ${item.name} in grams`}
                  />
                  <span className={styles.gramsUnit}>g</span>
                </label>
                <button
                  className={styles.remove}
                  onClick={() => removeItem(index)}
                  aria-label={`Remove ${item.name}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {logged && (
              <div className={styles.controls}>
                <span className={styles.gramsStatic}>{item.grams}g</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.totalRow}>
        <span className={styles.totalLabel}>Total</span>
        <span className={styles.totalValue}>{totals.calories} kcal</span>
      </div>

      {logged ? (
        <div className={styles.loggedNote}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Added to {MEALS.find((m) => m.key === meal)?.label || meal}
        </div>
      ) : (
        <>
          <div className={styles.mealPicker} role="group" aria-label="Choose meal">
            {MEALS.map((m) => (
              <button
                key={m.key}
                className={`${styles.mealChip} ${meal === m.key ? styles.mealChipActive : ""}`}
                onClick={() => setMeal(m.key)}
                aria-pressed={meal === m.key}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button className={styles.logButton} onClick={handleLog} disabled={saving}>
            {saving ? (
              <span className={styles.btnSpinner} />
            ) : (
              `Log ${items.length} item${items.length > 1 ? "s" : ""}`
            )}
          </button>
        </>
      )}
    </div>
  );
}
