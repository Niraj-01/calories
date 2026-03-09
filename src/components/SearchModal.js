"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchFoods } from "@/src/services/nutritionService";
import styles from "./SearchModal.module.css";

export default function SearchModal({ meal, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingAmount, setServingAmount] = useState(100);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      clearTimeout(timerRef.current);
    };
  }, []);

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
        console.error(err);
        setError("Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedFood(null);
    handleSearch(val);
  };

  const handleSelect = (food) => {
    setSelectedFood(food);
    setServingAmount(100);
  };

  const handleAdd = () => {
    if (!selectedFood) return;
    onAdd({ ...selectedFood, servingAmount });
    setSelectedFood(null);
    setQuery("");
    setResults([]);
    onClose();
  };

  const scaledCals = selectedFood
    ? Math.round((selectedFood.calories * servingAmount) / 100)
    : 0;

  const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);

  return (
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

        {/* Search input */}
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

        {/* Selected food detail */}
        {selectedFood && (
          <div className={styles.selectedCard}>
            <div className={styles.selectedInfo}>
              <p className={styles.selectedName}>{selectedFood.name}</p>
              {selectedFood.brand && (
                <p className={styles.selectedBrand}>{selectedFood.brand}</p>
              )}
              <div className={styles.macros}>
                <span className={styles.macroChip} style={{ borderColor: "var(--protein)" }}>
                  P: {Math.round(selectedFood.protein * servingAmount / 100 * 10) / 10}g
                </span>
                <span className={styles.macroChip} style={{ borderColor: "var(--carbs)" }}>
                  C: {Math.round(selectedFood.carbs * servingAmount / 100 * 10) / 10}g
                </span>
                <span className={styles.macroChip} style={{ borderColor: "var(--fat)" }}>
                  F: {Math.round(selectedFood.fat * servingAmount / 100 * 10) / 10}g
                </span>
              </div>
            </div>

            <div className={styles.servingRow}>
              <label className="label">Serving (g)</label>
              <input
                type="number"
                className={`input ${styles.servingInput}`}
                value={servingAmount}
                min={1}
                onChange={(e) => setServingAmount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <button className={`btn btn-primary btn-full ${styles.addBtn}`} onClick={handleAdd}>
              Add — <span className="num">{scaledCals} kcal</span>
            </button>
          </div>
        )}

        {/* Results list */}
        {!selectedFood && (
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
        )}
      </div>
    </div>
  );
}
