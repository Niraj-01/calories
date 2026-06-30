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
import dynamic from "next/dynamic";
import { scaleMacros } from "@/src/services/foodDataService";
// Eager: part of the initial Today view, needed for first paint.
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import WaterTracker from "@/src/components/WaterTracker";
import { useToast } from "@/src/components/Toast";
import styles from "./HomePage.module.css";

// Lazy: interaction-only modals/sheets. These are client-only (portals, camera,
// network) and never shown on first paint, so we split each into its own chunk
// that loads on demand when the user opens it — keeping the Today route's
// initial bundle to just what the first view needs.
const ModalLoading = () => (
  <div className={styles.modalLoading}>
    <div className="spinner spinner-lg" />
  </div>
);
const lazyModal = (importer, withFallback = true) =>
  dynamic(importer, { ssr: false, ...(withFallback ? { loading: ModalLoading } : {}) });

const SearchModal = lazyModal(() => import("@/src/components/SearchModal"));
const CameraModal = lazyModal(() => import("@/src/components/CameraModal"));
const BarcodeScannerModal = lazyModal(() => import("@/src/components/BarcodeScannerModal"));
const FoodDetailsModal = lazyModal(() => import("@/src/components/FoodDetailsModal"));
const ExerciseModal = lazyModal(() => import("@/src/components/ExerciseModal"));
// Small, instant sheets — no spinner fallback to avoid a flicker.
const AddFoodModal = lazyModal(() => import("@/src/components/AddFoodModal"), false);
const MealPickerSheet = lazyModal(() => import("@/src/components/MealPickerSheet"), false);

// Local-only id for an optimistic row that hasn't been persisted yet.
const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const MEALS = ["breakfast", "lunch", "dinner", "snacks"];

function getSuggestedMeal() {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 20) return "dinner";
  return "snacks";
}

function getTodayLabel() {
  const d = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(d);
  return `${weekday} ${d.getDate()} ${month}`;
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
  const { showToast, toastNode } = useToast();

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

  // Open the camera scanner when triggered by the bottom-nav scan FAB
  // (same-page via custom event, cross-page via sessionStorage flag).
  useEffect(() => {
    const openScan = () => setCameraMeal("__quick__");
    window.addEventListener("calo:scan", openScan);
    try {
      if (sessionStorage.getItem("calo:autoscan")) {
        sessionStorage.removeItem("calo:autoscan");
        openScan();
      }
    } catch {}
    return () => window.removeEventListener("calo:scan", openScan);
  }, []);

  const handleAddFood = async (food, meal) => {
    if (!user) return;
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

    // Optimistic: show the entry (and updated calorie ring) instantly.
    const tid = tempId();
    setEntries((prev) => [...prev, { id: tid, ...entry, pending: true }]);
    try {
      const id = await addFoodEntry(user.uid, today, entry);
      // Reconcile: swap the temp row for the persisted one.
      setEntries((prev) =>
        prev.map((e) => (e.id === tid ? { id, ...entry } : e)),
      );
    } catch (err) {
      console.warn("Failed to add food:", err);
      // Roll back the optimistic row and tell the user.
      setEntries((prev) => prev.filter((e) => e.id !== tid));
      showToast(`Couldn't save "${entry.name}" — removed.`);
    }
  };

  const handleAddExercise = async (exData) => {
    if (!user) return;
    const tid = tempId();
    setExercises((prev) => [{ id: tid, ...exData, pending: true }, ...prev]);
    try {
      const id = await addExerciseEntry(user.uid, today, exData);
      setExercises((prev) =>
        prev.map((e) => (e.id === tid ? { id, ...exData } : e)),
      );
    } catch (err) {
      console.warn("Failed to add exercise:", err);
      setExercises((prev) => prev.filter((e) => e.id !== tid));
      showToast("Couldn't save exercise — removed.");
    }
  };

  const handleDeleteExercise = async (entryId) => {
    if (!user) return;
    // Optimistic removal; snapshot the prior list to restore exact order on fail.
    let snapshot;
    setExercises((prev) => {
      snapshot = prev;
      return prev.filter((e) => e.id !== entryId);
    });
    // A not-yet-persisted row has no server doc — nothing to delete remotely.
    if (String(entryId).startsWith("temp-")) return;
    try {
      await deleteExerciseEntry(user.uid, today, entryId);
    } catch (err) {
      console.warn("Failed to delete exercise:", err);
      if (snapshot) setExercises(snapshot);
      showToast("Couldn't delete exercise — restored.");
    }
  };

  const handleDelete = async (entryId) => {
    if (!user) return;
    let snapshot;
    setEntries((prev) => {
      snapshot = prev;
      return prev.filter((e) => e.id !== entryId);
    });
    if (String(entryId).startsWith("temp-")) return;
    try {
      await deleteFoodEntry(user.uid, today, entryId);
    } catch (err) {
      console.warn("Failed to delete entry:", err);
      if (snapshot) setEntries(snapshot);
      showToast("Couldn't delete item — restored.");
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
    // Skeleton mirrors the real content's structure and per-section heights so
    // that when data arrives nothing below shifts. Heights match the live
    // components: CalorieRing card ≈320px, MacroBar card ≈108px,
    // WaterTracker card ≈110px, MealSection rows ≈64px. Same wrapper classes
    // (styles.page/header/heroSection/macroSection/section/meals) keep the
    // spacing identical, so the swap is shift-free (CLS 0).
    return (
      <div className={`page container fade-in ${styles.page}`}>
        <div className={styles.header}>
          <div>
            <div
              className="skeleton"
              style={{ width: 100, height: 16, marginBottom: 6 }}
            />
            <div className="skeleton" style={{ width: 140, height: 28 }} />
          </div>
        </div>
        <div className={styles.heroSection}>
          <div
            className="skeleton"
            style={{ width: "100%", height: 320, borderRadius: 24 }}
          />
        </div>
        <div className={styles.macroSection}>
          <div
            className="skeleton"
            style={{ width: "100%", height: 108, borderRadius: 20 }}
          />
        </div>
        <div className={styles.section}>
          <div
            className="skeleton"
            style={{ width: "100%", height: 110, borderRadius: 20 }}
          />
        </div>
        <div className={styles.meals}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ width: "100%", height: 64, borderRadius: 16, marginBottom: 10 }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`page container fade-in ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.brandBlock}>
          <h1 className={styles.brand}>Today</h1>
          <p className={styles.headerMeta}>{todayLabel}</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.streakBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-streak)"><path d="M12 2c1 3-1 4-1 6 0 1.5 1 2 1 2s2-1 2-3c2 1.5 4 4 4 7a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-2-1-3-1-6 1 0 2 .5 2 1z"/></svg>
            <span className={styles.streakCount}>{streak}</span>
          </div>
          <div className={styles.avatar}>
            {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
          </div>
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

      <div className={styles.quickRow}>
        <button
          className={`${styles.quickTile} ${styles.quickDark}`}
          onClick={() => setCameraMeal("__quick__")}
        >
          <span className={`${styles.quickIcon} ${styles.quickIconDark}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1FD080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg>
          </span>
          <span className={styles.quickTitle}>Scan a meal</span>
          <span className={styles.quickSubDark}>Food or barcode</span>
        </button>
        <button
          className={styles.quickTile}
          onClick={() => setExerciseModalOpen(true)}
        >
          <span className={`${styles.quickIcon} ${styles.quickIconOrange}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF7A3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </span>
          <span className={styles.quickTitle}>Log activity</span>
          <span className={styles.quickSub}>Burn calories</span>
        </button>
      </div>

      {/* Add Food Selection Modal (Stitch UI). Conditionally mounted so its lazy
          chunk is fetched only when the user opens it. */}
      {!!addFoodMeal && (
        <AddFoodModal
          open
          onClose={() => setAddFoodMeal(null)}
          onCamera={() => setCameraMeal(addFoodMeal)}
          onSearch={() => setSearchMeal(addFoodMeal)}
          onBarcode={() => setBarcodeMeal(addFoodMeal)}
        />
      )}

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

      {/* Unified auto-detect scanner — its detected sheet is the final confirm,
          so it logs straight to the resolved meal. */}
      {cameraMeal && (
        <CameraModal
          meal={cameraMeal === "__quick__" ? suggestedMeal : cameraMeal}
          onAdd={(food) =>
            handleAddFood(food, cameraMeal === "__quick__" ? suggestedMeal : cameraMeal)
          }
          onClose={() => setCameraMeal(null)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {!!barcodeMeal && (
        <BarcodeScannerModal
          open
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
      )}

      {/* Meal Picker Bottom Sheet */}
      {mealPickerOpen && (
        <MealPickerSheet
          open
          defaultMeal={suggestedMeal}
          onSelect={handleMealPicked}
          onClose={() => {
            setMealPickerOpen(false);
            setMealPickerIntent(null);
          }}
        />
      )}

      {exerciseModalOpen && (
        <ExerciseModal
          open
          onClose={() => setExerciseModalOpen(false)}
          onLog={handleAddExercise}
        />
      )}
      {toastNode}
    </div>
  );
}
