"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  addFoodEntry,
  getDayEntries,
  deleteFoodEntry,
  getUserSettings,
  dateKey,
  logFoodItems,
} from "@/src/services/firestoreService";
import dynamic from "next/dynamic";
import { scaleMacros } from "@/src/services/foodDataService";
// Eager: part of the initial Today view, needed for first paint.
import CalorieRing from "@/src/components/CalorieRing";
import MacroBar from "@/src/components/MacroBar";
import MealSection from "@/src/components/MealSection";
import ChatBar from "@/src/components/ChatBar";
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
  const today = dateKey();
  const suggestedMeal = getSuggestedMeal();
  const todayLabel = getTodayLabel();
  const { showToast, toastNode } = useToast();

  // Called on mount and again whenever the user returns to the tab, so meals
  // logged from the chat page or another device show up. State is only set
  // after the awaits, so the refresh never flashes the skeleton.
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // allSettled: a failed settings read must never hide the day's own log.
      const [dayEntries, settings] = await Promise.allSettled([
        getDayEntries(user.uid, today),
        getUserSettings(user.uid),
      ]);
      if (dayEntries.status === "fulfilled") setEntries(dayEntries.value);
      else console.warn("Failed to load entries:", dayEntries.reason);
      if (settings.status === "fulfilled") setGoal(settings.value.calorieGoal || 2000);
      else console.warn("Failed to load settings:", settings.reason);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pick up meals logged elsewhere (the chat page, another device) when the
  // user returns to this tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
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

  // Inline AI log from the Today bar. Optimistic like handleAddFood: rows show
  // up (and the ring moves) the moment the user taps Log.
  const handleLogItems = async (items, meal) => {
    if (!user) return;
    const tids = items.map(() => tempId());
    const optimistic = items.map((item, i) => ({
      id: tids[i],
      name: item.name,
      calories: Math.round(item.calories || 0),
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      meal,
      servingAmount: item.grams || 100,
      servingUnit: "g",
      pending: true,
    }));
    setEntries((prev) => [...prev, ...optimistic]);
    try {
      const saved = await logFoodItems(user.uid, today, items, meal);
      setEntries((prev) => [...prev.filter((e) => !tids.includes(e.id)), ...saved]);
      const kcal = saved.reduce((sum, e) => sum + (e.calories || 0), 0);
      showToast(`Logged ${saved.length} item${saved.length > 1 ? "s" : ""} · ${kcal} kcal`, "success");
    } catch (err) {
      console.warn("Failed to log meal:", err);
      setEntries((prev) => prev.filter((e) => !tids.includes(e.id)));
      showToast("Couldn't save that — nothing was logged.");
      // Keep the card open so the user can retry without retyping.
      throw err;
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


  if (loading) {
    // Skeleton mirrors the real content's structure and per-section heights so
    // that when data arrives nothing below shifts. Heights match the live
    // components: CalorieRing card ≈320px, MacroBar card ≈108px,
    // MealSection rows ≈64px. Same wrapper classes
    // (styles.page/header/heroSection/macroSection/meals) keep the
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
        <div className={styles.chatSection}>
          <div
            className="skeleton"
            style={{ width: "100%", height: 52, borderRadius: 999 }}
          />
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
          <div className={styles.avatar}>
            {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className={styles.chatSection}>
        <ChatBar onLog={handleLogItems} />
      </div>

      <div className={styles.heroSection}>
        <CalorieRing consumed={totals.calories} goal={goal} />
      </div>

      <div className={styles.macroSection}>
        <MacroBar
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
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

      {toastNode}
    </div>
  );
}
