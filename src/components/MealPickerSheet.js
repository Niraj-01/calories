"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./MealPickerSheet.module.css";

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

const ICONS = {
  breakfast: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 18v4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg>,
  lunch: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  dinner: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  snacks: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>,
};

const LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export default function MealPickerSheet({
  open,
  defaultMeal = "lunch",
  onSelect,
  onClose,
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 220);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 180);
  };

  const handleSelect = (meal) => {
    setVisible(false);
    setTimeout(() => {
      onSelect?.(meal);
      onClose?.();
    }, 140);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        <header className={styles.header}>
          <p className={styles.title}>Which meal?</p>
          <span className={styles.subtitle}>Pick where this log should go.</span>
        </header>

        <div className={styles.options}>
          {MEALS.map((meal) => (
            <button
              key={meal}
              className={`${styles.option} ${
                defaultMeal === meal ? styles.optionRecommended : ""
              }`}
              onClick={() => handleSelect(meal)}
            >
              <span className={styles.icon}>{ICONS[meal]}</span>
              <div className={styles.optionText}>
                <span className={styles.mealName}>{LABELS[meal]}</span>
                {defaultMeal === meal && (
                  <span className={styles.recommended}>Recommended</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
