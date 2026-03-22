"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  addFoodEntry,
  getDayEntries,
  deleteFoodEntry,
  getUserSettings,
  dateKey,
  getWaterIntake,
  setWaterIntake,
  updateStreak,
} from "@/src/services/firestoreService";
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import SearchModal from "@/src/components/SearchModal";
import CameraModal from "@/src/components/CameraModal";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import AddFoodModal from "@/src/components/AddFoodModal";
import FoodDetailsModal from "@/src/components/FoodDetailsModal";
import WaterTracker from "@/src/components/WaterTracker";
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
  const [addFoodMeal, setAddFoodMeal] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null); // { food, meal }
  const [searchMeal, setSearchMeal] = useState(null);
  const [cameraMeal, setCameraMeal] = useState(null);
  const [barcodeMeal, setBarcodeMeal] = useState(null);
  const [waterIntake, setWaterState] = useState(0);
  const [streak, setStreak] = useState(0);
  const today = dateKey();
  const lastFetchDate = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [dayEntries, settings, water, currentStreak] = await Promise.all([
        getDayEntries(user.uid, today),
        getUserSettings(user.uid),
        getWaterIntake(user.uid, today),
        updateStreak(user.uid),
      ]);
      setEntries(dayEntries);
      setGoal(settings.calorieGoal || 2000);
      setDisplayName(settings.displayName || user.displayName || "");
      setWaterState(water);
      setStreak(currentStreak);
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

  const handleAddWater = async (ml) => {
    if (!user) return;
    const newTotal = waterIntake + ml;
    setWaterState(newTotal);
    try {
      await setWaterIntake(user.uid, today, newTotal);
    } catch (err) {
      console.warn("Failed to save water:", err);
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

  const handleStageFood = (food, targetMeal) => {
    const stagedFood = {
      ...food,
      defaultAmount: food.defaultAmount || 100,
      defaultUnit: food.defaultUnit || "g",
    };
    setFoodDetail({ food: stagedFood, meal: targetMeal });
    setSearchMeal(null);
    setCameraMeal(null);
    setBarcodeMeal(null);
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div>
            <div className="skeleton" style={{ width: 100, height: 16, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 140, height: 24 }} />
          </div>
        </div>
        <div className={styles.section} style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: "50%" }} />
        </div>
        <div className={styles.section}>
          <div className="skeleton" style={{ width: "100%", height: 100, borderRadius: 20 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.userName}>Cal</h1>
        </div>
        {streak > 0 && (
          <div className={styles.streakBadge} title={`${streak} day streak!`}>
            <span className={styles.streakIcon}>🔥</span>
            <span className={styles.streakText}>
              <span className={styles.streakValue}>{streak} day</span>{" "}
              <span className={styles.streakLabel}>streak</span>
            </span>
          </div>
        )}
      </div>

      {/* Hero Card — Calorie Ring */}
      <div className={styles.section}>
        <CalorieRing consumed={totals.calories} goal={goal} />
      </div>

      {/* Macros Card */}
      <div className={styles.section}>
        <MacroBar
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />
      </div>

      {/* Water Tracker */}
      <div className={styles.section}>
        <WaterTracker intake={waterIntake} onAdd={handleAddWater} />
      </div>

      {/* Meals */}
      <div className={styles.meals}>
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={mealEntries[meal]}
            onAdd={() => setAddFoodMeal(meal)}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add Food Selection Modal (Stitch UI) */}
      <AddFoodModal
        open={!!addFoodMeal}
        onClose={() => setAddFoodMeal(null)}
        onCamera={() => setCameraMeal(addFoodMeal)}
        onSearch={() => setSearchMeal(addFoodMeal)}
        onBarcode={() => setBarcodeMeal(addFoodMeal)}
      />

      {/* Selected Food Details / Logging Modal */}
      {foodDetail && (
        <FoodDetailsModal
          food={foodDetail.food}
          initialMeal={foodDetail.meal}
          onClose={() => setFoodDetail(null)}
          onAdd={handleAddFood}
        />
      )}

      {/* Search Modal */}
      {searchMeal && (
        <SearchModal
          meal={searchMeal}
          onAdd={(food) => handleStageFood(food, searchMeal)}
          onClose={() => setSearchMeal(null)}
        />
      )}

      {/* Camera Modal */}
      {cameraMeal && (
        <CameraModal
          meal={cameraMeal}
          onAdd={(food) => handleStageFood(food, cameraMeal)}
          onClose={() => setCameraMeal(null)}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={!!barcodeMeal}
        meal={barcodeMeal || ""}
        onAdd={handleStageFood}
        onClose={() => setBarcodeMeal(null)}
      />
    </div>
  );
}
