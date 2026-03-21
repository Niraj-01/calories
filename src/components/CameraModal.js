"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./CameraModal.module.css";

export default function CameraModal({ meal, onAdd, onClose }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const [servingAmount, setServingAmount] = useState(100);
  const [servingUnit, setServingUnit] = useState("g");

  const fileInputRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setPrediction(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // 1. Send image to HuggingFace
      const buffer = await image.arrayBuffer();
      let hfResponse;
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        hfResponse = await fetch(
          "https://router.huggingface.co/hf-inference/models/nateraw/food",
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/octet-stream",
              "x-wait-for-model": "true",
            },
            method: "POST",
            body: buffer,
          }
        );

        if (hfResponse.ok) break;

        if (hfResponse.status === 503 && attempt < maxRetries - 1) {
          try {
            const body = await hfResponse.json();
            const waitTime = Math.min((body.estimated_time || 15) * 1000, 30000);
            await new Promise((r) => setTimeout(r, waitTime));
            continue;
          } catch {
            await new Promise((r) => setTimeout(r, 10000));
            continue;
          }
        }
        const errorText = await hfResponse.text();
        throw new Error(`AI model error (${hfResponse.status}). Please try again.`);
      }

      const hfText = await hfResponse.text();
      const hfResult = JSON.parse(hfText);

      if (!Array.isArray(hfResult) || hfResult.length === 0) {
        throw new Error(typeof hfResult?.error === "string" ? hfResult.error : "Could not identify food.");
      }

      const topPrediction = hfResult[0];
      const foodName = topPrediction.label.replace(/_/g, " ");

      // 2. Get local nutrition data
      const { getNutrition } = await import("@/src/data/foodNutrition");
      const nutrition = getNutrition(foodName);

      if (!nutrition) {
        throw new Error("Food identified, but no nutrition data available.");
      }

      setPrediction({
        name: foodName,
        confidence: topPrediction.score,
        calories: nutrition[0],
        protein: nutrition[1],
        carbs: nutrition[2],
        fat: nutrition[3],
      });
      setServingAmount(100);
      setServingUnit("g");

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateMacros = () => {
    if (!prediction) return null;
    const multiplier = servingAmount / 100;
    return {
      calories: Math.round(prediction.calories * multiplier),
      protein: Math.round(prediction.protein * multiplier * 10) / 10,
      carbs: Math.round(prediction.carbs * multiplier * 10) / 10,
      fat: Math.round(prediction.fat * multiplier * 10) / 10,
    };
  };

  const handleAddSubmit = () => {
    if (!prediction) return;
    const foodData = {
      name: prediction.name.charAt(0).toUpperCase() + prediction.name.slice(1),
      brand: "AI Estimate",
      calories: prediction.calories,
      protein: prediction.protein,
      carbs: prediction.carbs,
      fat: prediction.fat,
      servingAmount: servingAmount,
      servingUnit: servingUnit,
    };
    onAdd(foodData);
    handleClose();
  };

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
          <h2 className={styles.sheetTitle}>Scan Food for {meal}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>

          {/* Upload Area — idle state */}
          {!prediction && !loading && (
            <div className={styles.uploadArea}>
              {preview ? (
                <div className={styles.previewContainer}>
                  <img src={preview} alt="Upload preview" className={styles.previewImage} />
                  <button
                    className={styles.changeBtn}
                    onClick={() => {
                      setImage(null);
                      setPreview(null);
                    }}
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div
                  className={styles.dropzone}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={styles.uploadIcon}>📷</div>
                  <p className={styles.uploadText}>Tap to scan or choose photo</p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className={styles.fileInput}
                    onChange={handleImageChange}
                  />
                </div>
              )}

              {error && (
                <div className={styles.errorCard}>
                  <p className={styles.errorText}>{error}</p>
                  <p className={styles.errorHint}>Try a clearer photo of the food</p>
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                disabled={!image}
                onClick={handleAnalyze}
              >
                Analyze Food
              </button>
            </div>
          )}

          {/* Loading / Analyzing state */}
          {loading && (
            <div className={styles.loadingArea}>
              <div className={styles.pulseRing}>
                <div className={styles.pulseInner}>🍽️</div>
              </div>
              <p className={styles.loadingText}>Identifying food...</p>
              <p className={styles.loadingHint}>This may take up to 30s on first use</p>
              {preview && (
                <img src={preview} alt="Analyzing" className={styles.loadingPreview} />
              )}
            </div>
          )}

          {/* Result state */}
          {prediction && !loading && (
            <div className={styles.resultArea}>
              <div className={styles.resultHeader}>
                <h3 className={styles.foodName}>
                  {prediction.name.charAt(0).toUpperCase() + prediction.name.slice(1)}
                </h3>
                <span className={styles.confidenceBadge}>
                  {Math.round(prediction.confidence * 100)}% match
                </span>
              </div>

              {prediction.message && prediction.message !== "Success" && (
                <p className={styles.disclaimer}>{prediction.message}</p>
              )}

              {/* Serving adjustment */}
              <div className={styles.servingSection}>
                <span className={styles.servingLabel}>Serving</span>
                <div className={styles.servingGroup}>
                  <input
                    type="number"
                    className={`input ${styles.servingInput}`}
                    value={servingAmount}
                    onChange={(e) => setServingAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                  />
                  <select
                    className={`input ${styles.unitSelect}`}
                    value={servingUnit}
                    onChange={(e) => setServingUnit(e.target.value)}
                  >
                    <option value="g">grams</option>
                    <option value="ml">ml</option>
                    <option value="oz">oz</option>
                    <option value="serving">servings</option>
                  </select>
                </div>
              </div>

              {/* Macros card */}
              <div className={styles.macrosCard}>
                <span className={styles.macrosTitle}>Estimated Nutrition</span>
                {(() => {
                  const calculated = calculateMacros();
                  return (
                    <div className={styles.macrosGrid}>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} data-type="calories">{calculated.calories}</span>
                        <span className={styles.macroLabel}>kcal</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} data-type="protein">{calculated.protein}g</span>
                        <span className={styles.macroLabel}>Protein</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} data-type="carbs">{calculated.carbs}g</span>
                        <span className={styles.macroLabel}>Carbs</span>
                      </div>
                      <div className={styles.macroBox}>
                        <span className={styles.macroValue} data-type="fat">{calculated.fat}g</span>
                        <span className={styles.macroLabel}>Fat</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className={styles.actionButtons}>
                <button className="btn btn-secondary" onClick={() => setPrediction(null)}>
                  Try Again
                </button>
                <button className="btn btn-primary" onClick={handleAddSubmit}>
                  Log Food
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
