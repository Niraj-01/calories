"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import styles from "./BarcodeScannerModal.module.css";

export default function BarcodeScannerModal({ open, meal, onClose, onAdd }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [servingAmount, setServingAmount] = useState(100);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      setProduct(null);
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
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,nutriments,serving_size`,
      );
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        const n = p.nutriments || {};
        setProduct({
          name: p.product_name || "Unknown Product",
          brand: p.brands || "",
          calories: Math.round(n["energy-kcal_100g"] || n["energy-kcal"] || 0),
          protein: Math.round((n.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((n.fat_100g || 0) * 10) / 10,
          servingSize: p.serving_size || "100g",
        });
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
    const ratio = servingAmount / 100;
    onAdd(
      {
        name: product.name,
        brand: product.brand,
        calories: Math.round(product.calories * ratio),
        protein: Math.round(product.protein * ratio * 10) / 10,
        carbs: Math.round(product.carbs * ratio * 10) / 10,
        fat: Math.round(product.fat * ratio * 10) / 10,
        servingAmount,
        servingUnit: "g",
      },
      meal,
    );
    handleClose();
  };

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
                  📷 Start Scanning
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
                <div className={styles.macroItem}>
                  <span className={styles.macroValue}>
                    {Math.round((product.calories * servingAmount) / 100)}
                  </span>
                  <span className={styles.macroLabel}>kcal</span>
                </div>
                <div className={styles.macroItem}>
                  <span className={styles.macroValue}>
                    {((product.protein * servingAmount) / 100).toFixed(1)}
                  </span>
                  <span className={styles.macroLabel}>Protein</span>
                </div>
                <div className={styles.macroItem}>
                  <span className={styles.macroValue}>
                    {((product.carbs * servingAmount) / 100).toFixed(1)}
                  </span>
                  <span className={styles.macroLabel}>Carbs</span>
                </div>
                <div className={styles.macroItem}>
                  <span className={styles.macroValue}>
                    {((product.fat * servingAmount) / 100).toFixed(1)}
                  </span>
                  <span className={styles.macroLabel}>Fat</span>
                </div>
              </div>

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
                Add to {meal}
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
