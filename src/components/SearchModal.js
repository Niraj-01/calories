"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/src/context/AuthContext";
import { searchFoods } from "@/src/services/nutritionService";
import { getMyFoods } from "@/src/services/firestoreService";
import styles from "./SearchModal.module.css";

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
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible && activeTab === "search") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, activeTab]);

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

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

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
    handleClose();
  };

  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);

  if (!mounted) return null;

  return createPortal(
    <div className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`} onClick={handleClose}>
      <div
        className={`${styles.sheet} ${visible ? styles.sheetVisible : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        {/* Header */}
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Add to {mealLabel}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
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

        {/* Selected food detail */}
        {selectedFood && (
          <div className={styles.selectedCard}>
            <div className={styles.selectedInfo}>
              <p className={styles.selectedName}>{selectedFood.name}</p>
              {selectedFood.brand && (
                <p className={styles.selectedBrand}>{selectedFood.brand}</p>
              )}
            </div>

            {/* Macros chips */}
            <div className={styles.macroRow}>
              <div className={styles.macroChip}>
                <span className={styles.macroDot} data-type="protein" />
                <span className={styles.macroVal}>{scaledProtein}g</span>
              </div>
              <div className={styles.macroChip}>
                <span className={styles.macroDot} data-type="carbs" />
                <span className={styles.macroVal}>{scaledCarbs}g</span>
              </div>
              <div className={styles.macroChip}>
                <span className={styles.macroDot} data-type="fat" />
                <span className={styles.macroVal}>{scaledFat}g</span>
              </div>
            </div>

            {/* Serving */}
            <div className={styles.servingSection}>
              <span className={styles.servingLabel}>Serving</span>
              <div className={styles.servingGroup}>
                <input
                  type="number"
                  className={`input ${styles.servingInput}`}
                  value={servingAmount}
                  min={1}
                  onChange={(e) => setServingAmount(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <div className={styles.unitPills}>
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      className={`${styles.unitPill} ${unit === u ? styles.unitPillActive : ""}`}
                      onClick={() => setUnit(u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-full" onClick={handleAdd}>
              Add — <span className="num">{scaledCals} kcal</span>
            </button>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === "search" && !selectedFood && (
          <>
            <div className={styles.searchWrap}>
              <div className={styles.searchIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
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
                  <p className="empty-state-text">No results for &ldquo;{query}&rdquo;</p>
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
                    <span className={styles.resultCalNum}>{food.calories}</span>
                    <span className={styles.resultCalUnit}>kcal</span>
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
                  <span className={styles.resultCalNum}>{food.calories}</span>
                  <span className={styles.resultCalUnit}>kcal</span>
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
