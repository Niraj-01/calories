"use client";

import { useMemo, useState } from "react";
import styles from "./QuickLogPanel.module.css";

const MEALS = [
  { key: "breakfast", label: "Breakfast", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg> },
  { key: "lunch", label: "Lunch", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> },
  { key: "dinner", label: "Dinner", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
  { key: "snacks", label: "Snacks", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg> },
];

function per100gFromEntry(entry) {
  const grams = entry.servingAmount || 100;
  const factor = grams / 100 || 1;
  return {
    calories: Math.round((entry.calories || 0) / factor),
    protein: Math.round((entry.protein || 0) / factor * 10) / 10,
    carbs: Math.round((entry.carbs || 0) / factor * 10) / 10,
    fat: Math.round((entry.fat || 0) / factor * 10) / 10,
    fiber: Math.round((entry.fiber || 0) / factor * 10) / 10,
  };
}

export default function QuickLogPanel({
  recent = [],
  frequent = [],
  defaultMeal = "lunch",
  onQuickAdd,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState(null); // { source, food }
  const [serving, setServing] = useState(100);
  const [meal, setMeal] = useState(defaultMeal);

  const openPicker = (food, source, initialGrams) => {
    setSelected({ food, source });
    setServing(Math.round(initialGrams || 100));
    setMeal(defaultMeal);
    setPickerOpen(true);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const entry = selected.food;
    const per100 = per100gFromEntry(entry);
    const foodData = {
      name: entry.name,
      brand: entry.brand || "",
      per_100g: per100,
      servingAmount: serving,
      servingUnit: entry.servingUnit || "g",
      source: "quick-log",
      calories: Math.round((per100.calories * serving) / 100),
      protein: Math.round((per100.protein * serving)) / 100,
      carbs: Math.round((per100.carbs * serving)) / 100,
      fat: Math.round((per100.fat * serving)) / 100,
      fiber: Math.round((per100.fiber * serving)) / 100,
    };
    onQuickAdd(foodData, meal);
    setPickerOpen(false);
    setSelected(null);
  };

  const frequentDisplay = useMemo(
    () => frequent.map((f) => ({ ...f, calories: f.avgCalories || 0 })),
    [frequent],
  );

  return (
    <div className={styles.card}>
      <div className={styles.rowHeader}>
        <span className={styles.title}>Quick Log</span>
      </div>

      <div className={styles.rowLabel}>Recent</div>
      <div className={styles.scroller}>
        {recent.length === 0 && <div className={styles.empty}>Nothing yet</div>}
        {recent.map((item) => (
          <button
            key={item.id}
            className={styles.pill}
            onClick={() => openPicker(item, "recent", item.servingAmount)}
          >
            <span className={styles.pillName}>{item.name}</span>
            <span className={styles.pillCals}>{Math.round(item.calories || 0)} kcal</span>
          </button>
        ))}
      </div>

      <div className={styles.rowLabel}>Frequent</div>
      <div className={styles.scroller}>
        {frequentDisplay.length === 0 && <div className={styles.empty}>No data yet</div>}
        {frequentDisplay.map((item, idx) => (
          <button
            key={`${item.name}-${idx}`}
            className={styles.pill}
            onClick={() =>
              openPicker(
                {
                  name: item.name,
                  calories: item.avgCalories,
                  protein: item.avgProtein,
                  carbs: item.avgCarbs,
                  fat: item.avgFat,
                  fiber: item.avgFiber,
                  servingAmount: 100,
                  servingUnit: "g",
                },
                "frequent",
                100,
              )
            }
          >
            <span className={styles.pillName}>{item.name}</span>
            <span className={styles.pillCals}>{item.avgCalories} kcal</span>
          </button>
        ))}
      </div>

      {pickerOpen && selected && (
        <div className={styles.sheetOverlay} onClick={() => setPickerOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <span className={styles.sheetTitle}>Log {selected.food.name}</span>
            </div>
            <label className={styles.sheetLabel}>Meal</label>
            <div className={styles.mealRow}>
              {MEALS.map((m) => (
                <button
                  key={m.key}
                  className={`${styles.mealChip} ${meal === m.key ? styles.mealChipActive : ""}`}
                  onClick={() => setMeal(m.key)}
                >
                  <span className={styles.mealIcon}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <label className={styles.sheetLabel}>Serving (g)</label>
            <input
              type="number"
              className={`input ${styles.sheetInput}`}
              value={serving}
              min="1"
              onChange={(e) => setServing(Math.max(1, parseFloat(e.target.value) || 1))}
            />

            <button className="btn btn-primary btn-full" onClick={handleConfirm}>
              Log to {meal}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
