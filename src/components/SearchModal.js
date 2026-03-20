"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/src/context/AuthContext";
import { searchFoods } from "@/src/services/nutritionService";
import { getMyFoods } from "@/src/services/firestoreService";
import styles from "./SearchModal.module.css";

// Conversion factors to grams (all values per 100g base)
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

const UNITS = Object.keys(UNIT_FACTORS);

export default function SearchModal({ meal, onAdd, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingAmount, setServingAmount] = useState(100);
  const [unit, setUnit] = useState("g");
  const [error, setError] = useState(null);
  const [myFoods, setMyFoods] = useState([]);
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);
  const [myFoodsLoaded, setMyFoodsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    if (activeTab === "search") inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timerRef.current);
    };
  }, [activeTab]);

  // Load My Foods when tab is switched
  useEffect(() => {
    if (activeTab === "myfoods" && !myFoodsLoaded && user) {
      (async () => {
        setMyFoodsLoading(true);
        try {
          const foods = await getMyFoods(user.uid);
          setMyFoods(foods);
          setMyFoodsLoaded(true);
        } catch (err) {
          console.warn("Failed to load my foods:", err);
        } finally {
          setMyFoodsLoading(false);
        }
      })();
    }
  }, [activeTab, myFoodsLoaded, user]);

  const handleSearch = useCallback(async (q) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchFoods(q);
        setResults(data);
      } catch (err) {
        console.warn(err);
        setError("Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedFood(null);
    handleSearch(val);
  };

  const handleSelect = (food) => {
    setSelectedFood(food);
    const defaultAmount = Math.max(1, parseFloat(food.defaultAmount) || 100);
    const defaultUnit = food.defaultUnit || "g";
    setServingAmount(defaultAmount);
    setUnit(defaultUnit);
  };

  // Compute grams equivalent for scaling
  const gramsEquiv = servingAmount * UNIT_FACTORS[unit];

  const scaledCals = selectedFood
    ? Math.round((selectedFood.calories * gramsEquiv) / 100)
    : 0;
  const scaledProtein = selectedFood
    ? Math.round((selectedFood.protein * gramsEquiv) / 100 * 10) / 10
    : 0;
  const scaledCarbs = selectedFood
    ? Math.round((selectedFood.carbs * gramsEquiv) / 100 * 10) / 10
    : 0;
  const scaledFat = selectedFood
    ? Math.round((selectedFood.fat * gramsEquiv) / 100 * 10) / 10
    : 0;

  const handleAdd = () => {
    if (!selectedFood) return;
    onAdd({
      ...selectedFood,
      servingAmount: gramsEquiv,
      servingUnit: unit,
      servingDisplay: servingAmount,
    });
    setSelectedFood(null);
    setQuery("");
    setResults([]);
    onClose();
  };

  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add to {mealLabel}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "search" ? styles.tabActive : ""}`}
            onClick={() => { setActiveTab("search"); setSelectedFood(null); }}
          >
            Search
          </button>
          <button
            className={`${styles.tab} ${activeTab === "myfoods" ? styles.tabActive : ""}`}
            onClick={() => { setActiveTab("myfoods"); setSelectedFood(null); }}
          >
            My Foods
          </button>
        </div>

        {/* Selected food detail (shared between tabs) */}
        {selectedFood && (
          <div className={styles.selectedCard}>
            <div className={styles.selectedInfo}>
              <p className={styles.selectedName}>{selectedFood.name}</p>
              {selectedFood.brand && (
                <p className={styles.selectedBrand}>{selectedFood.brand}</p>
              )}
              <div className={styles.macros}>
                <span className={styles.macroChip} style={{ borderColor: "var(--protein)" }}>
                  P: {scaledProtein}g
                </span>
                <span className={styles.macroChip} style={{ borderColor: "var(--carbs)" }}>
                  C: {scaledCarbs}g
                </span>
                <span className={styles.macroChip} style={{ borderColor: "var(--fat)" }}>
                  F: {scaledFat}g
                </span>
              </div>
            </div>

            <div className={styles.servingRow}>
              <label className="label">Serving</label>
              <div className={styles.servingGroup}>
                <input
                  type="number"
                  className={`input ${styles.servingInput}`}
                  value={servingAmount}
                  min={1}
                  onChange={(e) => setServingAmount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <select
                  className={`input ${styles.unitSelect}`}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className={`btn btn-primary btn-full ${styles.addBtn}`} onClick={handleAdd}>
              Add — <span className="num">{scaledCals} kcal</span>
            </button>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === "search" && !selectedFood && (
          <>
            <div className={styles.searchWrap}>
              <input
                ref={inputRef}
                type="text"
                className={`input ${styles.searchInput}`}
                placeholder="Search foods..."
                value={query}
                onChange={handleInputChange}
              />
              {loading && <div className={`spinner ${styles.searchSpinner}`} />}
            </div>

            <div className={styles.resultsList}>
              {error && <p className={styles.error}>{error}</p>}

              {!loading && query.length >= 2 && results.length === 0 && !error && (
                <div className="empty-state">
                  <p className="empty-state-text">No results found for &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {results.map((food, i) => (
                <button
                  key={`${food.name}-${i}`}
                  className={styles.resultItem}
                  onClick={() => handleSelect(food)}
                >
                  <div className={styles.resultInfo}>
                    <span className={styles.resultName}>{food.name}</span>
                    {food.brand && (
                      <span className={styles.resultBrand}>{food.brand}</span>
                    )}
                  </div>
                  <div className={styles.resultCals}>
                    <span className="num">{food.calories}</span>
                    <span className={styles.resultUnit}>kcal</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* MY FOODS TAB */}
        {activeTab === "myfoods" && !selectedFood && (
          <div className={styles.resultsList}>
            {myFoodsLoading && (
              <div className="empty-state">
                <div className="spinner spinner-lg" />
              </div>
            )}

            {!myFoodsLoading && myFoods.length === 0 && (
              <div className="empty-state">
                <p className="empty-state-icon">★</p>
                <p className="empty-state-text">
                  No custom foods yet.<br />
                  Go to My Foods to add some.
                </p>
              </div>
            )}

            {myFoods.map((food) => (
              <button
                key={food.id}
                className={styles.resultItem}
                onClick={() => handleSelect(food)}
              >
                <div className={styles.resultInfo}>
                  <span className={styles.resultName}>{food.name}</span>
                  <span className={styles.resultBrand}>
                    P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                  </span>
                </div>
                <div className={styles.resultCals}>
                  <span className="num">{food.calories}</span>
                  <span className={styles.resultUnit}>kcal</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
