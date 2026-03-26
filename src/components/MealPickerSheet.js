"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./MealPickerSheet.module.css";

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

const ICONS = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snacks: "🍿",
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
