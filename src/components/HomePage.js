"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  addFoodEntry,
  addExerciseEntry,
  getDayEntries,
  deleteFoodEntry,
  getUserSettings,
  dateKey,
  getWaterIntake,
  setWaterIntake,
  updateStreak,
  getRecentEntries,
  getFrequentFoods,
  getExerciseEntries,
  deleteExerciseEntry,
} from "@/src/services/firestoreService";
import { scaleMacros } from "@/src/services/foodDataService";
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import SearchModal from "@/src/components/SearchModal";
import CameraModal from "@/src/components/CameraModal";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import AddFoodModal from "@/src/components/AddFoodModal";
import FoodDetailsModal from "@/src/components/FoodDetailsModal";
import WaterTracker from "@/src/components/WaterTracker";
import MealPickerSheet from "@/src/components/MealPickerSheet";
import QuickLogPanel from "@/src/components/QuickLogPanel";
import ExerciseModal from "@/src/components/ExerciseModal";
import styles from "./HomePage.module.css";

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

function getSuggestedMeal() {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snacks";
}

function getTodayLabel() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export default function HomePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);
  const [addFoodMeal, setAddFoodMeal] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null); // { food, meal }
  const [searchMeal, setSearchMeal] = useState(null);
  const [cameraMeal, setCameraMeal] = useState(null);
  const [barcodeMeal, setBarcodeMeal] = useState(null);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [mealPickerIntent, setMealPickerIntent] = useState(null); // "start-flow" | "assign-food"
  const [stagedFood, setStagedFood] = useState(null);
  const [waterIntake, setWaterState] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentEntries, setRecentEntries] = useState([]);
  const [frequentFoods, setFrequentFoods] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [waterGoal, setWaterGoal] = useState(2500);
  const today = dateKey();
  const suggestedMeal = getSuggestedMeal();
  const todayLabel = getTodayLabel();
  const prevStreakRef = useRef(0);
  const confettiLoaded = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [dayEntries, settings, water, currentStreak, recent, frequent, todaysExercises] =
        await Promise.all([
          getDayEntries(user.uid, today),
          getUserSettings(user.uid),
          getWaterIntake(user.uid, today),
          updateStreak(user.uid),
          getRecentEntries(user.uid, 10),
          getFrequentFoods(user.uid, 8),
          getExerciseEntries(user.uid, today),
        ]);
      setEntries(dayEntries);
      setGoal(settings.calorieGoal || 2000);
      setWaterGoal(settings.waterGoal || 2500);
      setWaterState(water);
      const prevStreak = prevStreakRef.current;
      setStreak(currentStreak);
      setRecentEntries(recent || []);
      setFrequentFoods(frequent || []);
      setExercises(todaysExercises || []);

      if (currentStreak > prevStreak && [3, 7, 14, 30, 60, 90].includes(currentStreak)) {
        triggerConfetti();
      }
      prevStreakRef.current = currentStreak;
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
      const per100g = food.per_100g || {
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        fiber: food.fiber || 0,
      };
      const servingAmount = food.servingAmount || food.defaultAmount || 100;
      const servingUnit = food.servingUnit || food.defaultUnit || "g";
      const scaled = scaleMacros(per100g, servingAmount);
      const entry = {
        name: food.name,
        brand: food.brand || "",
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        meal,
        servingAmount,
        servingUnit,
        source: food.source || "user",
      };
      const id = await addFoodEntry(user.uid, today, entry);
      setEntries((prev) => [...prev, { id, ...entry }]);
    } catch (err) {
      console.warn("Failed to add food:", err);
    }
  };

  const handleAddExercise = async (exData) => {
    if (!user) return;
    try {
      const id = await addExerciseEntry(user.uid, today, exData);
      setExercises((prev) => [{ id, ...exData }, ...prev]);
    } catch (err) {
      console.warn("Failed to add exercise:", err);
    }
  };

  const handleDeleteExercise = async (entryId) => {
    if (!user) return;
    try {
      await deleteExerciseEntry(user.uid, today, entryId);
      setExercises((prev) => prev.filter((e) => e.id !== entryId));
    } catch (err) {
      console.warn("Failed to delete exercise:", err);
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
    setWaterState((prev) => {
      const newTotal = prev + ml;
      setWaterIntake(user.uid, today, newTotal).catch((err) => {
        console.warn("Failed to save water:", err);
      });
      return newTotal;
    });
  };

  const handleSubtractWater = async (ml) => {
    if (!user) return;
    setWaterState((prev) => {
      const newTotal = Math.max(0, prev - ml);
      setWaterIntake(user.uid, today, newTotal).catch((err) => {
        console.warn("Failed to save water:", err);
      });
      return newTotal;
    });
  };

  // Compute totals
  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  // Group by meal
  const mealEntries = {};
  MEALS.forEach((m) => {
    mealEntries[m] = entries.filter((e) => e.meal === m);
  });

  const totalBurned = exercises.reduce((s, ex) => s + (ex.caloriesBurned || 0), 0);

  const handleStageFood = (food, targetMeal) => {
    const per100g = food.per_100g || {
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
    };
    const defaultServing =
      food.common_servings?.[0]?.grams ||
      food.defaultAmount ||
      food.servingAmount ||
      100;
    const stagedFood = {
      ...food,
      per_100g: per100g,
      defaultAmount: defaultServing,
      defaultUnit: food.defaultUnit || food.servingUnit || "g",
    };
    setFoodDetail({ food: stagedFood, meal: targetMeal });
    setSearchMeal(null);
    setCameraMeal(null);
    setBarcodeMeal(null);
    setStagedFood(null);
  };

  const openMealPicker = (intent) => {
    setMealPickerIntent(intent);
    setMealPickerOpen(true);
  };

  const handleMealPicked = (meal) => {
    if (!meal) {
      setMealPickerOpen(false);
      setMealPickerIntent(null);
      return;
    }

    if (mealPickerIntent === "start-flow") {
      setAddFoodMeal(meal);
    } else if (mealPickerIntent === "assign-food" && stagedFood) {
      handleStageFood(stagedFood, meal);
    }

    setMealPickerOpen(false);
    setMealPickerIntent(null);
  };

  const handleQuickScanResult = (food) => {
    setStagedFood(food);
    openMealPicker("assign-food");
  };

  const handleQuickAdd = (foodData, meal) => {
    handleAddFood(foodData, meal);
  };

  const triggerConfetti = async () => {
    if (typeof window === "undefined") return;
    if (!confettiLoaded.current) {
      await import("https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js");
      confettiLoaded.current = true;
    }
    if (window.confetti) {
      window.confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.7 },
      });
    }
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div>
            <div
              className="skeleton"
              style={{ width: 100, height: 16, marginBottom: 6 }}
            />
            <div className="skeleton" style={{ width: 140, height: 24 }} />
          </div>
        </div>
        <div
          className={styles.section}
          style={{ display: "flex", justifyContent: "center" }}
        >
          <div
            className="skeleton"
            style={{ width: 200, height: 200, borderRadius: "50%" }}
          />
        </div>
        <div className={styles.section}>
          <div
            className="skeleton"
            style={{ width: "100%", height: 100, borderRadius: 20 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`page container fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>Cal</h1>
          <p className={styles.headerMeta}>{todayLabel}</p>
        </div>
        <div className={styles.streakBadge}>
          <span className={styles.streakIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 23c-3.866 0-7-3.358-7-7.5 0-3.133 2.268-6.093 4.5-8.5L12 4l2.5 3c2.232 2.407 4.5 5.367 4.5 8.5 0 4.142-3.134 7.5-7 7.5z"/></svg></span>
          <span className={styles.streakText}>
            <span className={styles.streakCount}>{streak}</span> day streak
          </span>
        </div>
      </div>

      <div className={styles.heroSection}>
        <CalorieRing consumed={totals.calories} goal={goal} burned={totalBurned} />
      </div>

      <div className={styles.macroSection}>
        <MacroBar
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />
      </div>

      <div className={styles.section}>
        <WaterTracker
          intake={waterIntake}
          goal={waterGoal}
          onAdd={handleAddWater}
          onSubtract={handleSubtractWater}
        />
      </div>

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

      <div className={styles.section}>
        <div className={styles.utilityCard}>
          <div className={styles.utilityHeader}>
            <div>
              <div className={styles.utilityTitle}>Quick Actions</div>
              <div className={styles.utilityMeta}>Use the Claude logging flow directly</div>
            </div>
            <button
              className={styles.utilityButton}
              onClick={() => openMealPicker("start-flow")}
            >
              <span className={styles.utilityIcon}>+</span>
              <span className={styles.utilityLabel}>Add Food</span>
            </button>
          </div>
          <div className={styles.utilityGrid}>
            <button
              className={styles.utilityButton}
              onClick={() => setCameraMeal("__quick__")}
            >
              <span className={styles.utilityIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
              <span className={styles.utilityLabel}>Scan Food</span>
            </button>
            <button
              className={styles.utilityButton}
              onClick={() => setBarcodeMeal("__quick__")}
            >
              <span className={styles.utilityIcon}>▦</span>
              <span className={styles.utilityLabel}>Scan Barcode</span>
            </button>
            <button
              className={styles.utilityButton}
              onClick={() => setExerciseModalOpen(true)}
            >
              <span className={styles.utilityIcon}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>
              <span className={styles.utilityLabel}>Log Exercise</span>
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <QuickLogPanel
          recent={recentEntries}
          frequent={frequentFoods}
          defaultMeal={suggestedMeal}
          onQuickAdd={handleQuickAdd}
        />
      </div>

      {exercises.length > 0 && (
        <div className={styles.section}>
          <div className={styles.exerciseCard}>
            <div className={styles.exerciseHeader}>
              <span className={styles.exerciseTitle}>Exercise</span>
              <span className={styles.exerciseBurn}>
                {Math.round(totalBurned)} kcal burned
              </span>
            </div>
            <div className={styles.exerciseList}>
              {exercises.map((ex) => (
                <div key={ex.id} className={styles.exerciseRow}>
                  <div className={styles.exerciseInfo}>
                    <div className={styles.exerciseName}>{ex.name}</div>
                    <div className={styles.exerciseMeta}>
                      {ex.durationMinutes} min{ex.metValue ? ` · MET ${ex.metValue}` : ""}
                    </div>
                  </div>
                  <div className={styles.exerciseActions}>
                    <div className={styles.exerciseCals}>
                      -{Math.round(ex.caloriesBurned || 0)} kcal
                    </div>
                    <button
                      className={styles.exerciseDelete}
                      onClick={() => handleDeleteExercise(ex.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
          meal={cameraMeal === "__quick__" ? suggestedMeal : cameraMeal}
          onAdd={(food) =>
            cameraMeal === "__quick__"
              ? handleQuickScanResult(food)
              : handleStageFood(food, cameraMeal)
          }
          onClose={() => setCameraMeal(null)}
        />
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        open={!!barcodeMeal}
        meal={barcodeMeal === "__quick__" ? suggestedMeal : barcodeMeal || ""}
        onAdd={(food, meal) => {
          if (barcodeMeal === "__quick__" || !meal) {
            handleQuickScanResult(food);
          } else {
            handleStageFood(food, meal || suggestedMeal);
          }
        }}
        onClose={() => setBarcodeMeal(null)}
      />

      {/* Meal Picker Bottom Sheet */}
      <MealPickerSheet
        open={mealPickerOpen}
        defaultMeal={suggestedMeal}
        onSelect={handleMealPicked}
        onClose={() => {
          setMealPickerOpen(false);
          setMealPickerIntent(null);
        }}
      />

      <ExerciseModal
        open={exerciseModalOpen}
        onClose={() => setExerciseModalOpen(false)}
        onLog={handleAddExercise}
      />
    </div>
  );
}
