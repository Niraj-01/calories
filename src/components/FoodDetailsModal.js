import { useState, useEffect } from "react";
import styles from "./FoodDetailsModal.module.css";

const UNIT_FACTORS = {
  g: 1,
  ml: 1,
  kg: 1000,
  l: 1000,
  oz: 28.35,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const MEALS = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export default function FoodDetailsModal({ food, initialMeal, onClose, onAdd }) {
  const [servingAmount, setServingAmount] = useState(100);
  const [unit, setUnit] = useState("g");
  const [selectedMeal, setSelectedMeal] = useState(initialMeal || "lunch");

  useEffect(() => {
    if (food) {
      document.body.style.overflow = "hidden";
      const defaultAmount = Math.max(1, parseFloat(food.defaultAmount) || 100);
      const defaultUnit = food.defaultUnit || "g";
      setServingAmount(defaultAmount);
      setUnit(defaultUnit);
      if (initialMeal) {
        setSelectedMeal(initialMeal);
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [food, initialMeal]);

  if (!food) return null;

  const handleMinus = () => {
    setServingAmount(prev => Math.max(1, prev - 5));
  };

  const handlePlus = () => {
    setServingAmount(prev => prev + 5);
  };

  const gramsEquiv = servingAmount * UNIT_FACTORS[unit];

  const scaledCals = Math.round((food.calories * gramsEquiv) / 100);
  const scaledProtein = Math.round((food.protein * gramsEquiv) / 100 * 10) / 10;
  const scaledCarbs = Math.round((food.carbs * gramsEquiv) / 100 * 10) / 10;
  const scaledFat = Math.round((food.fat * gramsEquiv) / 100 * 10) / 10;

  const handleAddLog = () => {
    onAdd({
      ...food,
      servingAmount: gramsEquiv,
      servingUnit: unit,
      servingDisplay: servingAmount,
    }, selectedMeal);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <main className={styles.main}>
        {/* Navigation Header */}
        <header className={styles.header}>
          <button className={styles.iconButton} onClick={onClose} aria-label="Back">
            <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24" width="24">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h1 className={styles.headerTitle}>Food Details</h1>
          <button className={styles.iconButton} aria-label="Share">
            <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" x2="12" y1="2" y2="15"></line>
            </svg>
          </button>
        </header>

        {/* Title Section */}
        <section className={styles.titleSection}>
          <h2 className={styles.foodName}>{food.name}</h2>
          {food.brand && <p className={styles.foodBrand}>{food.brand}</p>}
        </section>

        {/* Serving Stepper Card */}
        <section className={styles.section}>
          <div className={styles.stepperBg}>
            <button className={styles.stepperBtn} onClick={handleMinus} aria-label="Decrease quantity">
              <svg fill="none" height="2" viewBox="0 0 24 2" width="24" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#8E8E93" height="2" rx="1" width="24"></rect>
              </svg>
            </button>
            <div className={styles.weightContainer}>
              <input 
                type="number" 
                className={styles.weightValue} 
                value={servingAmount} 
                onChange={(e) => setServingAmount(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className={styles.weightUnit}>{unit}</span>
            </div>
            <button className={styles.stepperBtn} onClick={handlePlus} aria-label="Increase quantity">
              <svg fill="none" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <rect fill="#8E8E93" height="24" rx="1" width="2" x="11" y="0"></rect>
                <rect fill="#8E8E93" height="2" rx="1" width="24" y="11"></rect>
              </svg>
            </button>
          </div>
        </section>

        {/* Macro Table Card */}
        <section className={styles.section}>
          <div className={`glass-card ${styles.macroCard}`}>
            <div className={`${styles.macroRow} ${styles.separator}`}>
              <span className={styles.macroLabel}>Calories</span>
              <span className={styles.macroValue}>{scaledCals} kcal</span>
            </div>
            <div className={`${styles.macroRow} ${styles.separator}`}>
              <span className={styles.macroLabel}>Protein</span>
              <span className={styles.macroValue}>{scaledProtein}g</span>
            </div>
            <div className={`${styles.macroRow} ${styles.separator}`}>
              <span className={styles.macroLabel}>Carbs</span>
              <span className={styles.macroValue}>{scaledCarbs}g</span>
            </div>
            <div className={styles.macroRow}>
              <span className={styles.macroLabel}>Fat</span>
              <span className={styles.macroValue}>{scaledFat}g</span>
            </div>
          </div>
        </section>

        {/* Meal Selector */}
        <section className={styles.section}>
           <div className={styles.segmentedControl}>
             {MEALS.map((mealName) => {
               const lowerMeal = mealName.toLowerCase();
               return (
                 <button 
                   key={lowerMeal}
                   className={`${styles.segmentedItem} ${selectedMeal === lowerMeal ? styles.active : ""}`}
                   onClick={() => setSelectedMeal(lowerMeal)}
                 >
                   {mealName}
                 </button>
               );
             })}
           </div>
        </section>

        <div className={styles.flexGrow}></div>

        {/* Footer Actions */}
        <footer className={styles.footer}>
          <button className={styles.ctaBtn} onClick={handleAddLog}>
            Add to Log
          </button>
        </footer>
      </main>
    </div>
  );
}
