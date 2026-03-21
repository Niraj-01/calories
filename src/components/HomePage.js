"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { addFoodEntry, getDayEntries, deleteFoodEntry, getUserSettings, dateKey } from "@/src/services/firestoreService";
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import SearchModal from "@/src/components/SearchModal";
import CameraModal from "@/src/components/CameraModal";
import styles from "./HomePage.module.css";

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);
  const [displayName, setDisplayName] = useState("");
  const [searchMeal, setSearchMeal] = useState(null);
  const [cameraMeal, setCameraMeal] = useState(null);
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
      setDisplayName(settings.displayName || user.displayName || "");
      lastFetchDate.current = today;
    } catch (err) {
      console.warn("Failed to load data:", err);
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

  const remaining = goal - totals.calories;

  // Group by meal
  const mealEntries = {};
  MEALS.forEach((m) => {
    mealEntries[m] = entries.filter((e) => e.meal === m);
  });

  const initials = (displayName || user?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div>
            <div className="skeleton" style={{ width: 100, height: 16, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 140, height: 24 }} />
          </div>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
        </div>
        <div className={styles.heroCard}>
          <div className={styles.ringWrap}>
            <div className="skeleton" style={{ width: 200, height: 200, borderRadius: "50%" }} />
          </div>
          <div className={styles.statRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ width: 80, height: 48, borderRadius: 12 }} />
            ))}
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 4 }}>
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div className="skeleton" style={{ width: 60, height: 14 }} />
                  <div className="skeleton" style={{ width: 40, height: 20 }} />
                </div>
                <div className="skeleton" style={{ width: "100%", height: 4, borderRadius: 100 }} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.meals}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ padding: 0, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div className="skeleton" style={{ width: 24, height: 24, borderRadius: "50%" }} />
                  <div className="skeleton" style={{ width: 80, height: 16 }} />
                </div>
                <div className="skeleton" style={{ width: 40, height: 16 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{getGreeting()}</p>
          <h1 className={styles.userName}>{displayName || "Hi there"}</h1>
        </div>
        <div className={styles.avatar}>
          {initials}
        </div>
      </div>

      {/* Hero Card — Calorie Ring + Stats */}
      <div className={`card ${styles.heroCard}`}>
        <div className={styles.ringWrap}>
          <CalorieRing consumed={totals.calories} goal={goal} />
        </div>
        <div className={styles.statRow}>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{goal}</span>
            <span className={styles.statLabel}>Goal</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statPill}>
            <span className={styles.statValue}>{totals.calories}</span>
            <span className={styles.statLabel}>Eaten</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statPill}>
            <span className={`${styles.statValue} ${remaining < 0 ? styles.statOver : ""}`}>
              {Math.abs(remaining)}
            </span>
            <span className={styles.statLabel}>{remaining < 0 ? "Over" : "Left"}</span>
          </div>
        </div>
      </div>

      {/* Macros Card */}
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
            onScan={() => setCameraMeal(meal)}
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

      {/* Camera Modal */}
      {cameraMeal && (
        <CameraModal
          meal={cameraMeal}
          onAdd={(food) => handleAddFood(food, cameraMeal)}
          onClose={() => setCameraMeal(null)}
        />
      )}
    </div>
  );
}
