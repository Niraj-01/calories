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
  const [mealPickerOpen, setMealPickerOpen] = useState(false);
  const [mealPickerIntent, setMealPickerIntent] = useState(null); // "start-flow" | "assign-food"
  const [stagedFood, setStagedFood] = useState(null);
  const [waterIntake, setWaterState] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastLogDate, setLastLogDate] = useState("");
  const [recentEntries, setRecentEntries] = useState([]);
  const [frequentFoods, setFrequentFoods] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [waterGoal, setWaterGoal] = useState(2500);
  const today = dateKey();
  const lastFetchDate = useRef(null);
  const suggestedMeal = getSuggestedMeal();
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
      setDisplayName(settings.displayName || user.displayName || "");
      setWaterState(water);
      const prevStreak = prevStreakRef.current;
      setStreak(currentStreak);
      setLastLogDate(settings.lastLogDate || today);
      setRecentEntries(recent || []);
      setFrequentFoods(frequent || []);
      setExercises(todaysExercises || []);
      lastFetchDate.current = today;

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
        source: food.source,
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
    const newTotal = waterIntake + ml;
    setWaterState(newTotal);
    try {
      await setWaterIntake(user.uid, today, newTotal);
    } catch (err) {
      console.warn("Failed to save water:", err);
    }
  };

  const handleSubtractWater = async (ml) => {
    if (!user) return;
    const newTotal = Math.max(0, waterIntake - ml);
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

  const streakMessage = (val) => {
    if (val >= 30) return "Elite tracker status";
    if (val >= 14) return "Unstoppable streak!";
    if (val >= 7) return "One week strong 🔥";
    if (val >= 3) return "You're building momentum!";
    return "Start your streak today";
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

  const weekDots = (() => {
    const dots = [];
    const todayDate = new Date();
    const dayIdx = todayDate.getDay();
    const start = new Date(todayDate);
    start.setDate(start.getDate() - dayIdx);
    const todayKey = dateKey();
    const todayLogged = lastLogDate === todayKey;

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dateKey(d);
      const daysBack = Math.floor((todayDate - d) / (1000 * 60 * 60 * 24));
      const logged = todayLogged && daysBack >= 0 && daysBack < streak;
      const isToday = key === todayKey;
      dots.push({ key, isToday, logged });
    }
    return dots;
  })();

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
    <div className="page container fade-in">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.userName}>Cal</h1>
        </div>
        <div className={styles.streakBlock}>
          <div className={styles.weekRow}>
            {weekDots.map((d) => (
              <div
                key={d.key}
                className={`${styles.dot} ${d.logged ? styles.dotLogged : ""} ${d.isToday ? styles.dotToday : ""}`}
              >
                {d.logged && <span>✓</span>}
              </div>
            ))}
          </div>
          <div className={styles.streakMessage}>
            {streak} day streak · {streakMessage(streak)}
          </div>
        </div>
      </div>

      {/* Hero Card — Calorie Ring */}
      <div className={styles.section}>
        <CalorieRing consumed={totals.calories} goal={goal} burned={totalBurned} />
      </div>

      {/* Macros Card */}
      <div className={styles.section}>
        <MacroBar
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
        />
      </div>

      {/* Primary CTA */}
      <div className={styles.section}>
        <div className={styles.primaryCtaBlock}>
          <button
            className={styles.logButton}
            onClick={() => openMealPicker("start-flow")}
          >
            + Log Food
          </button>
          <div className={styles.secondaryActions}>
            <button
              className={styles.ghostButton}
              onClick={() => setCameraMeal("__quick__")}
            >
              📷 Scan Food
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => setBarcodeMeal("__quick__")}
            >
              ⬛ Scan Barcode
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => setExerciseModalOpen(true)}
            >
              🏋️ Log Exercise
            </button>
          </div>
        </div>
      </div>

      {/* Water Tracker */}
      <div className={styles.section}>
        <WaterTracker intake={waterIntake} goal={waterGoal} onAdd={handleAddWater} onSubtract={handleSubtractWater} />
      </div>

      {/* Quick Log */}
      <div className={styles.section}>
        <QuickLogPanel
          recent={recentEntries}
          frequent={frequentFoods}
          defaultMeal={suggestedMeal}
          onQuickAdd={handleQuickAdd}
        />
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

      {/* Exercise Section */}
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
                  <div>
                    <div className={styles.exerciseName}>{ex.name}</div>
                    <div className={styles.exerciseMeta}>
                      {ex.durationMinutes} min{ex.metValue ? ` · MET ${ex.metValue}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className={styles.exerciseCals}>-{Math.round(ex.caloriesBurned || 0)} kcal</div>
                    <button
                      onClick={() => handleDeleteExercise(ex.id)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255,69,58,0.2)",
                        color: "var(--danger)",
                        borderRadius: "var(--radius-sm)",
                        padding: "4px 8px",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
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
