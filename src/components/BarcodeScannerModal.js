"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { resolveFood, scaleMacros } from "@/src/services/foodDataService";
import styles from "./BarcodeScannerModal.module.css";

export default function BarcodeScannerModal({ open, meal, onClose, onAdd }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [servingAmount, setServingAmount] = useState(100);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      setProduct(null);
      setResults([]);
      setError(null);
      setServingAmount(100);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {
        /* already stopped */
      }
      html5QrRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleClose = useCallback(() => {
    stopScanner();
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      onClose();
    }, 300);
  }, [onClose, stopScanner]);

  const lookupBarcode = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const found = await resolveFood(code, { type: "barcode" });
      if (found && found.length > 0) {
        setResults(found);
        setProduct(found[0]);
      } else {
        setError("Product not found in database. Try scanning another item.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setError(null);
    setProduct(null);

    // Dynamically import to avoid SSR issues
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("barcode-reader");
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        async (decodedText) => {
          await stopScanner();
          lookupBarcode(decodedText);
        },
        () => {}, // ignore scan errors
      );
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
      setScanning(false);
    }
  };

  const handleAdd = () => {
    if (!product) return;
    const per100g = product.per_100g || {
      calories: product.calories || 0,
      protein: product.protein || 0,
      carbs: product.carbs || 0,
      fat: product.fat || 0,
      fiber: product.fiber || 0,
    };
    const scaled = scaleMacros(per100g, servingAmount);
    onAdd(
      {
        name: product.name,
        brand: product.brand || "",
        per_100g: per100g,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        fiber: scaled.fiber,
        servingAmount,
      servingUnit: "g",
      source: product.source,
      common_servings: product.common_servings || [],
    },
      meal,
    );
    handleClose();
  };

  const mealLabel = meal
    ? meal.charAt(0).toUpperCase() + meal.slice(1)
    : "meal";

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
        <div className={styles.handleBar}>
          <div className={styles.handle} />
        </div>

        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>Scan Barcode</h2>
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

        <div className={styles.content}>
          {/* Scanner View */}
          {!product && !loading && (
            <div className={styles.scannerArea}>
              <div id="barcode-reader" className={styles.reader} />
              {!scanning && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={startScanner}
                >
                  Start Scanning
                </button>
              )}
              {scanning && (
                <p className={styles.hint}>
                  Point at a barcode on any packaged food
                </p>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className={styles.loadingArea}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Looking up product…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorCard}>
              <p className={styles.errorText}>{error}</p>
              <button
                className="btn btn-primary btn-full"
                onClick={startScanner}
                style={{ marginTop: 12 }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Product Result */}
          {product && !loading && (
            <div className={styles.resultArea}>
              <div className={styles.resultHeader}>
                <h3 className={styles.productName}>{product.name}</h3>
                {product.brand && (
                  <span className={styles.brandBadge}>{product.brand}</span>
                )}
              </div>

              <div className={styles.macroGrid}>
                {(() => {
                  const per100g = product.per_100g || {
                    calories: product.calories || 0,
                    protein: product.protein || 0,
                    carbs: product.carbs || 0,
                    fat: product.fat || 0,
                    fiber: product.fiber || 0,
                  };
                  const scaled = scaleMacros(per100g, servingAmount);
                  return (
                    <>
                      <div className={styles.macroItem}>
                        <span className={styles.macroValue}>{scaled.calories}</span>
                        <span className={styles.macroLabel}>kcal</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroValue}>{scaled.protein}</span>
                        <span className={styles.macroLabel}>Protein</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroValue}>{scaled.carbs}</span>
                        <span className={styles.macroLabel}>Carbs</span>
                      </div>
                      <div className={styles.macroItem}>
                        <span className={styles.macroValue}>{scaled.fat}</span>
                        <span className={styles.macroLabel}>Fat</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {results.length > 1 && (
                <div style={{ marginTop: 12 }}>
                  <p className={styles.hint}>Other matches</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {results.map((item) => (
                      <button
                        key={item.id}
                        className="btn btn-sm btn-secondary"
                        style={{
                          opacity: item.id === product.id ? 1 : 0.8,
                        }}
                        onClick={() => setProduct(item)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.servingRow}>
                <label className={styles.servingLabel}>Serving (g)</label>
                <input
                  className={styles.servingInput}
                  type="number"
                  min="1"
                  value={servingAmount}
                  onChange={(e) =>
                    setServingAmount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>

              <button className="btn btn-primary btn-full" onClick={handleAdd}>
                {meal ? `Add to ${mealLabel}` : "Add & choose meal"}
              </button>

              <button
                className={styles.rescanBtn}
                onClick={() => {
                  setProduct(null);
                  startScanner();
                }}
              >
                Scan Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
