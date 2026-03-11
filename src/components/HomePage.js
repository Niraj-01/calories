"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { addFoodEntry, getDayEntries, deleteFoodEntry, getUserSettings, dateKey } from "@/src/services/firestoreService";
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import SearchModal from "@/src/components/SearchModal";
import styles from "./HomePage.module.css";

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

export default function HomePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);
  const [searchMeal, setSearchMeal] = useState(null);
  const today = dateKey();
  const lastFetchDate = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [dayEntries, settings] = await Promise.all([
        getDayEntries(user.uid, today),
        getUserSettings(user.uid),
      ]);
      setEntries(dayEntries);
      setGoal(settings.calorieGoal || 2000);
      lastFetchDate.current = today;
    } catch (err) {
      console.warn("Failed to load data:", err);
      // Show empty state instead of infinite spinner
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddFood = async (food, meal) => {
    if (!user) return;
    try {
      const entry = {
        name: food.name,
        brand: food.brand || "",
        calories: Math.round(food.calories * (food.servingAmount || 100) / 100),
        protein: Math.round(food.protein * (food.servingAmount || 100) / 100 * 10) / 10,
        carbs: Math.round(food.carbs * (food.servingAmount || 100) / 100 * 10) / 10,
        fat: Math.round(food.fat * (food.servingAmount || 100) / 100 * 10) / 10,
        meal,
        servingAmount: food.servingAmount || 100,
        servingUnit: food.servingUnit || "g",
      };
      const id = await addFoodEntry(user.uid, today, entry);
      setEntries((prev) => [...prev, { id, ...entry }]);
    } catch (err) {
      console.warn("Failed to add food:", err);
    }
  };

  const handleDelete = async (entryId) => {
    if (!user) return;
    try {
      await deleteFoodEntry(user.uid, today, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.warn("Failed to delete entry:", err);
    }
  };

  // Compute totals
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Group by meal
  const mealEntries = {};
  MEALS.forEach((m) => {
    mealEntries[m] = entries.filter((e) => e.meal === m);
  });

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div>
            <div className="skeleton" style={{ width: 120, height: 32, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 150, height: 20 }} />
          </div>
        </div>
        <div className={styles.ringWrap}>
          <div className="skeleton" style={{ width: 220, height: 220, borderRadius: "50%" }} />
        </div>
        <div className={styles.remaining}>
          <div className="skeleton" style={{ width: 180, height: 24, margin: "0 auto" }} />
        </div>
        <div className={`card ${styles.macroCard}`}>
          <div className="skeleton" style={{ width: "100%", height: 60 }} />
        </div>
        <div className={styles.meals}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`card ${styles.macroCard}`} style={{ marginTop: 16 }}>
              <div className="skeleton" style={{ width: "100%", height: 80 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <div>
          <h1 className="page-title">Today</h1>
          <p className="page-subtitle">{todayLabel}</p>
        </div>
      </div>

      {/* Calorie Ring */}
      <div className={styles.ringWrap}>
        <CalorieRing consumed={totals.calories} goal={goal} />
      </div>

      {/* Remaining  */}
      <div className={styles.remaining}>
        {totals.calories <= goal ? (
          <p className={styles.remainingText}>
            <span className={`num ${styles.remainingNum}`}>{goal - totals.calories}</span>
            <span> kcal remaining</span>
          </p>
        ) : (
          <p className={`${styles.remainingText} ${styles.over}`}>
            <span className={`num ${styles.remainingNum}`}>{totals.calories - goal}</span>
            <span> kcal over goal</span>
          </p>
        )}
      </div>

      {/* Macros */}
      <div className={`card ${styles.macroCard}`}>
        <MacroBar
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />
      </div>

      {/* Meals */}
      <div className={styles.meals}>
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={mealEntries[meal]}
            onAdd={() => setSearchMeal(meal)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Search Modal */}
      {searchMeal && (
        <SearchModal
          meal={searchMeal}
          onAdd={(food) => handleAddFood(food, searchMeal)}
          onClose={() => setSearchMeal(null)}
        />
      )}
    </div>
  );
}
