"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/src/context/AuthContext";
import { getMyFoods } from "@/src/services/firestoreService";
import { resolveFood } from "@/src/services/foodDataService";
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
        const found = await resolveFood(q, { type: "search" });
        setResults(found || []);
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
    handleSearch(val);
  };

  const toStagedFood = (food) => {
    const per100g = food.per_100g || {
      calories: food.calories || 0,
      protein: food.protein || 0,
      carbs: food.carbs || 0,
      fat: food.fat || 0,
      fiber: food.fiber || 0,
    };
    const firstServing = food.common_servings?.[0];
    return {
      ...food,
      per_100g: per100g,
      defaultAmount:
        (firstServing && firstServing.grams) ||
        food.defaultAmount ||
        food.servingAmount ||
        100,
      defaultUnit: food.defaultUnit || food.servingUnit || "g",
    };
  };

  const handleSelect = (food) => {
    onAdd(toStagedFood(food));
  };

  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`${styles.overlay} ${visible ? styles.overlayVisible : ""}`}
      onClick={handleClose}
    >
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
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "search" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
          <button
            className={`${styles.tab} ${activeTab === "myfoods" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("myfoods")}
          >
            My Foods
          </button>
        </div>

        {/* SEARCH TAB */}
        {activeTab === "search" && (
          <>
            <div className={styles.searchWrap}>
              <div className={styles.searchIcon}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
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

              {!loading &&
                query.length >= 2 &&
                results.length === 0 &&
                !error && (
                  <div className="empty-state">
                    <p className="empty-state-text">
                      No results for &ldquo;{query}&rdquo;
                    </p>
                  </div>
                )}

              {results.map((food, i) => {
                const per100g = food.per_100g || {
                  calories: food.calories || 0,
                  protein: food.protein || 0,
                  carbs: food.carbs || 0,
                  fat: food.fat || 0,
                };
                return (
                  <button
                    key={`${food.id || food.name}-${i}`}
                    className={styles.resultItem}
                    onClick={() => handleSelect(food)}
                  >
                    <div className={styles.resultInfo}>
                      <span className={styles.resultName}>{food.name}</span>
                      <div className={styles.resultMeta}>
                        {food.brand && (
                          <span className={styles.resultBrand}>{food.brand}</span>
                        )}
                        <span className={styles.sourceBadge}>
                          {food.source === "local" ? "🏠 Local DB" : "🌐 Open Food Facts"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.resultCals}>
                      <span className={styles.resultCalNum}>{per100g.calories}</span>
                      <span className={styles.resultCalUnit}>kcal /100g</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* MY FOODS TAB */}
        {activeTab === "myfoods" && (
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
                  No custom foods yet.
                  <br />
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
    document.body,
  );
}
