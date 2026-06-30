"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/src/context/AuthContext";
import { getMyFoods } from "@/src/services/firestoreService";
import { resolveFood } from "@/src/services/foodDataService";
import styles from "./SearchModal.module.css";

const RECENT_KEY = "calo:recentSearches";
const RECENT_MAX = 6;
// Common starting points shown before typing and when a query finds nothing.
const SUGGESTIONS = [
  "Chicken breast",
  "Banana",
  "Egg",
  "Greek yogurt",
  "Rice",
  "Oats",
  "Almonds",
  "Apple",
];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Wrap each matched query term in <mark> so the reason a result matched is
// scannable at a glance.
function highlightMatch(text, query, markClass) {
  const terms = query.trim().split(/\s+/).filter((t) => t.length >= 2);
  if (!terms.length) return text;
  const re = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const lower = new Set(terms.map((t) => t.toLowerCase()));
  return String(text)
    .split(re)
    .map((part, i) =>
      lower.has(part.toLowerCase()) ? (
        <mark key={i} className={markClass}>
          {part}
        </mark>
      ) : (
        part
      ),
    );
}

export default function SearchModal({ meal, onAdd, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState([]);
  const [myFoods, setMyFoods] = useState([]);
  const [myFoodsLoading, setMyFoodsLoading] = useState(false);
  const [myFoodsLoaded, setMyFoodsLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    document.body.style.overflow = "hidden";
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (Array.isArray(saved)) setRecent(saved.slice(0, RECENT_MAX));
    } catch {
      /* ignore corrupt storage */
    }
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

  // Keep the keyboard-highlighted item scrolled into view.
  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const persistRecent = useCallback((term) => {
    const t = term.trim();
    if (t.length < 2) return;
    setRecent((prev) => {
      const next = [
        t,
        ...prev.filter((r) => r.toLowerCase() !== t.toLowerCase()),
      ].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearRecent = () => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
  };

  const runSearch = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const found = await resolveFood(q, { type: "search" });
      setResults(found || []);
    } catch (err) {
      console.warn(err);
      setError("Search failed. Check your connection and try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search-as-you-type.
  const handleSearch = useCallback(
    (q) => {
      clearTimeout(timerRef.current);
      if (q.trim().length < 2) {
        setResults([]);
        setLoading(false);
        return;
      }
      timerRef.current = setTimeout(() => runSearch(q), 300);
    },
    [runSearch],
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    handleSearch(val);
  };

  // Run a search immediately for a tapped/Enter-selected term (recent/suggestion).
  const applyTerm = (term) => {
    setQuery(term);
    setActiveIndex(-1);
    clearTimeout(timerRef.current);
    runSearch(term);
    inputRef.current?.focus();
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setActiveIndex(-1);
    inputRef.current?.focus();
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
    if (query.trim().length >= 2) persistRecent(query.trim());
    onAdd(toStagedFood(food));
  };

  // What's currently on screen (and therefore keyboard-navigable).
  const trimmed = query.trim();
  const showInitial = trimmed.length < 2;
  const noResults = !loading && !showInitial && results.length === 0 && !error;
  const initialChips = [
    ...recent,
    ...SUGGESTIONS.filter(
      (s) => !recent.some((r) => r.toLowerCase() === s.toLowerCase()),
    ),
  ];
  const navIsResults = results.length > 0;
  const navItems = navIsResults
    ? results
    : showInitial
      ? initialChips
      : noResults
        ? SUGGESTIONS
        : [];

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, navItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, navItems.length ? 0 : -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < navItems.length) {
        e.preventDefault();
        if (navIsResults) handleSelect(navItems[activeIndex]);
        else applyTerm(navItems[activeIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (query) clearQuery();
      else handleClose();
    }
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
        role="dialog"
        aria-label={`Add food to ${mealLabel}`}
      >
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Add to {mealLabel}</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "search"}
            className={`${styles.tab} ${activeTab === "search" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("search")}
          >
            Search
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "myfoods"}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search foods…"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                aria-label={`Search foods to add to ${mealLabel}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {loading ? (
                <div className={`spinner ${styles.searchSpinner}`} />
              ) : query ? (
                <button className={styles.clearBtn} onClick={clearQuery} aria-label="Clear search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className={styles.resultsList} ref={listRef}>
              {/* INITIAL STATE: recent searches + suggestions */}
              {showInitial && !loading && (
                <>
                  {recent.length > 0 && (
                    <div className={styles.section}>
                      <div className={styles.sectionRow}>
                        <span className={styles.sectionLabel}>Recent</span>
                        <button className={styles.textBtn} onClick={clearRecent}>
                          Clear
                        </button>
                      </div>
                      <div className={styles.chips}>
                        {recent.map((term, i) => (
                          <button
                            key={term}
                            data-active={activeIndex === i}
                            className={`${styles.chip} ${activeIndex === i ? styles.chipActive : ""}`}
                            onClick={() => applyTerm(term)}
                          >
                            <svg className={styles.chipIcon} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="9" />
                              <path d="M12 7v5l3 2" />
                            </svg>
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className={styles.section}>
                    <span className={styles.sectionLabel}>Try searching for</span>
                    <div className={styles.chips}>
                      {SUGGESTIONS.map((term) => {
                        const idx = initialChips.indexOf(term);
                        return (
                          <button
                            key={term}
                            data-active={activeIndex === idx}
                            className={`${styles.chip} ${activeIndex === idx ? styles.chipActive : ""}`}
                            onClick={() => applyTerm(term)}
                          >
                            {term}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* LOADING: skeleton rows */}
              {loading &&
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.skelRow}>
                    <div>
                      <div className="skeleton" style={{ width: 150, height: 15, marginBottom: 7 }} />
                      <div className="skeleton" style={{ width: 90, height: 11 }} />
                    </div>
                    <div className="skeleton" style={{ width: 44, height: 26, borderRadius: 6 }} />
                  </div>
                ))}

              {error && <p className={styles.error}>{error}</p>}

              {/* NO RESULTS: explain + suggest */}
              {noResults && (
                <div className={styles.noResults}>
                  <div className={styles.noResultsIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-3.5-3.5M8 11h6" />
                    </svg>
                  </div>
                  <p className={styles.noResultsTitle}>No matches for “{trimmed}”</p>
                  <p className={styles.noResultsHint}>
                    Check the spelling, or scan a barcode / photo to add it. Try one of these:
                  </p>
                  <div className={styles.chips}>
                    {SUGGESTIONS.map((term, i) => (
                      <button
                        key={term}
                        data-active={activeIndex === i}
                        className={`${styles.chip} ${activeIndex === i ? styles.chipActive : ""}`}
                        onClick={() => applyTerm(term)}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* RESULTS */}
              {results.map((food, i) => {
                const per100g = food.per_100g || {
                  calories: food.calories || 0,
                };
                return (
                  <button
                    key={`${food.id || food.name}-${i}`}
                    data-active={activeIndex === i}
                    className={`${styles.resultItem} ${activeIndex === i ? styles.resultItemActive : ""}`}
                    onClick={() => handleSelect(food)}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className={styles.resultInfo}>
                      <span className={styles.resultName}>
                        {highlightMatch(food.name, trimmed, styles.mark)}
                      </span>
                      <div className={styles.resultMeta}>
                        {food.brand && (
                          <span className={styles.resultBrand}>{food.brand}</span>
                        )}
                        <span className={styles.sourceBadge}>
                          {food.source === "local" ? "Local DB" : "Open Food Facts"}
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

              {/* keyboard hint footer */}
              {(navIsResults || showInitial) && (
                <div className={styles.kbdHint}>
                  <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                  <span><kbd>↵</kbd> select</span>
                  <span><kbd>esc</kbd> {query ? "clear" : "close"}</span>
                </div>
              )}
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
