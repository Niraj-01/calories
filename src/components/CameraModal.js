"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scaleMacros } from "@/src/services/foodDataService";
import styles from "./CameraModal.module.css";

export default function CameraModal({ meal, onAdd, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [foodName, setFoodName] = useState("");
  const [servingGrams, setServingGrams] = useState(100);
  const [confidence, setConfidence] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState("");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      const base64 = typeof result === "string" ? result.split(",")[1] : "";
      setPreview(result);
      setImageBase64(base64);
      setAnalysis(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const parseAnalysis = (data) => {
    const estimatedGrams = Number(data.estimatedGrams) || 100;
    setAnalysis(data);
    setFoodName(data.name || "Food");
    setServingGrams(estimatedGrams);
    setConfidence(data.confidence || null);
    setItems(Array.isArray(data.items) ? data.items : []);
  };

  const sanitizeAndParse = (rawText) => {
    const cleaned = (rawText || "").replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Model returned non-JSON response");
    }
  };

  const callGeminiDirect = async ({ descriptionOnly = false }) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    if (!key) throw new Error("Missing GOOGLE_AI_API_KEY");

    const prompt =
      'You are a food nutrition expert. Analyze the food in this image. Return ONLY a JSON object (no markdown, no explanation) with this exact shape:\\n{ "name": string, "estimatedGrams": number, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "high"|"medium"|"low", "items": [{ "name": string, "grams": number, "calories": number }] }\\nIf multiple foods are visible, list each in items[] and sum the totals. Estimate portion sizes from visual cues.';

    const parts = [];
    if (!descriptionOnly && imageBase64) {
      parts.push({
        inline_data: {
          mime_type: preview?.split(";")[0]?.split(":")[1] || "image/jpeg",
          data: imageBase64,
        },
      });
    }
    if (descriptionOnly && correctionText) {
      parts.push({ text: `User description: ${correctionText}` });
    }
    parts.push({ text: prompt });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || "Analysis failed";
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return sanitizeAndParse(text);
  };

  const callServerAnalysis = async ({ descriptionOnly = false }) => {
    const payload = {
      imageBase64: descriptionOnly ? undefined : imageBase64,
      mimeType: preview?.split(";")[0]?.split(":")[1] || "image/jpeg",
      textDescription: descriptionOnly ? correctionText : undefined,
    };

    const res = await fetch("/api/analyze-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const textBody = await res.text();
    let data;
    try {
      data = JSON.parse(textBody);
    } catch {
      if (textBody?.trim().startsWith("<")) {
        throw new Error("Server API unavailable (HTML response)");
      }
      throw new Error("Unexpected response from analysis API");
    }

    if (!res.ok) {
      throw new Error(data?.error || "Analysis failed");
    }

    return data;
  };

  const runAnalysis = async ({ descriptionOnly = false } = {}) => {
    if (!descriptionOnly && !imageBase64) {
      setError("Please add a photo first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Prefer server API; fall back to direct Gemini if server is unreachable or returns HTML
      let result;
      try {
        result = await callServerAnalysis({ descriptionOnly });
      } catch (serverErr) {
        console.warn("Server analysis failed, falling back to client Gemini:", serverErr);
        result = await callGeminiDirect({ descriptionOnly });
      }
      parseAnalysis(result);
    } catch (err) {
      const msg = err.message || "Analysis failed";
      setError(
        msg === "Failed to fetch"
          ? "Network error — check your connection and try again."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  const per100g = useMemo(() => {
    if (!analysis) return null;
    const grams = analysis.estimatedGrams || 100;
    const factor = grams / 100;
    return {
      calories: Math.round((analysis.calories || 0) / factor),
      protein: Math.round((analysis.protein || 0) / factor),
      carbs: Math.round((analysis.carbs || 0) / factor),
      fat: Math.round((analysis.fat || 0) / factor),
      fiber: Math.round((analysis.fiber || 0) / factor),
    };
  }, [analysis]);

  const scaledMacros = useMemo(() => {
    if (!per100g) return null;
    return scaleMacros(per100g, servingGrams || 0);
  }, [per100g, servingGrams]);

  const handleLog = () => {
    if (!per100g) return;
    const foodData = {
      name: foodName?.trim() || "Food",
      per_100g: per100g,
      servingAmount: servingGrams,
      servingUnit: "g",
      source: "ai",
      defaultAmount: servingGrams,
      defaultUnit: "g",
      calories: scaledMacros?.calories,
      protein: scaledMacros?.protein,
      carbs: scaledMacros?.carbs,
      fat: scaledMacros?.fat,
      fiber: scaledMacros?.fiber,
    };
    onAdd(foodData);
    handleClose();
  };

  const confidenceClass = confidence
    ? confidence === "high"
      ? styles.confidenceHigh
      : confidence === "medium"
        ? styles.confidenceMedium
        : styles.confidenceLow
    : "";

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
          <h2 className={styles.sheetTitle}>Scan Food for {meal}</h2>
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
          {!analysis && !loading && (
            <div className={styles.uploadArea}>
              {preview ? (
                <div className={styles.previewContainer}>
                  <img
                    src={preview}
                    alt="Upload preview"
                    className={styles.previewImage}
                  />
                  <button
                    className={styles.changeBtn}
                    onClick={() => {
                      setPreview(null);
                      setImageBase64(null);
                    }}
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div className={styles.sourceChoices}>
                  <button
                    type="button"
                    className={styles.sourceTile}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <div className={styles.sourceIcon}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    </div>
                    <div className={styles.sourceTextGroup}>
                      <span className={styles.sourceTitle}>Take Photo</span>
                      <span className={styles.sourceSub}>Use camera now</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={styles.sourceTile}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={styles.sourceIcon}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2.5" />
                        <circle cx="8.5" cy="9" r="1.6" />
                        <path d="M21 15l-5-5-8 8" />
                      </svg>
                    </div>
                    <div className={styles.sourceTextGroup}>
                      <span className={styles.sourceTitle}>Choose Photo</span>
                      <span className={styles.sourceSub}>From library</span>
                    </div>
                  </button>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    className={styles.fileInput}
                    onChange={handleImageChange}
                  />
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
                </div>
              )}

              <button
                className="btn btn-primary btn-full"
                disabled={!preview}
                onClick={() => runAnalysis()}
              >
                Analyze Food
              </button>
            </div>
          )}

          {loading && (
            <div className={styles.loadingArea}>
              <div className={styles.pulseRing}>
                <div className={styles.pulseInner}>🍽️</div>
              </div>
              <p className={styles.loadingText}>Analyzing your meal...</p>
              {preview && (
                <img
                  src={preview}
                  alt="Analyzing"
                  className={styles.loadingPreview}
                />
              )}
            </div>
          )}

          {analysis && !loading && (
            <div className={styles.resultArea}>
              <div className={styles.resultHeader}>
                <input
                  className={styles.foodNameInput}
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                />
                {confidence && (
                  <span className={`${styles.confidenceBadge} ${confidenceClass}`}>
                    {confidence} confidence
                  </span>
                )}
              </div>

              {items.length > 0 && (
                <div className={styles.itemsList}>
                  {items.map((it, idx) => (
                    <div key={`${it.name}-${idx}`} className={styles.itemRow}>
                      <span className={styles.itemName}>{it.name}</span>
                      <span className={styles.itemDetail}>{Math.round(it.grams)}g</span>
                    </div>
                  ))}
                </div>
              )}

              {scaledMacros && (
                <div className={styles.macrosPills}>
                  <span className={styles.pill} data-type="calories">
                    {scaledMacros.calories} kcal
                  </span>
                  <span className={styles.pill}>{scaledMacros.protein}g P</span>
                  <span className={styles.pill}>{scaledMacros.carbs}g C</span>
                  <span className={styles.pill}>{scaledMacros.fat}g F</span>
                </div>
              )}

              <div className={styles.servingSection}>
                <label className={styles.servingLabel}>Serving size (g)</label>
                <input
                  type="number"
                  className={`input ${styles.servingInput}`}
                  value={servingGrams}
                  onChange={(e) =>
                    setServingGrams(Math.max(1, parseFloat(e.target.value) || 1))
                  }
                  min="1"
                />
              </div>

              {(confidence === "low" || showCorrection) && (
                <div className={styles.correctionBox}>
                  <p className={styles.correctionTitle}>Describe your meal</p>
                  <textarea
                    className={styles.correctionInput}
                    rows={3}
                    value={correctionText}
                    onChange={(e) => setCorrectionText(e.target.value)}
                    placeholder="e.g. Two scrambled eggs with butter and toast"
                  />
                  <button
                    className="btn btn-secondary btn-full"
                    disabled={!correctionText.trim()}
                    onClick={() => runAnalysis({ descriptionOnly: true })}
                  >
                    Re-analyze
                  </button>
                </div>
              )}

              {confidence === "low" && !showCorrection && (
                <button
                  className={styles.correctionPrompt}
                  onClick={() => setShowCorrection(true)}
                >
                  Confidence is low — tap to correct
                </button>
              )}

              {error && (
                <div className={styles.errorCard}>
                  <p className={styles.errorText}>{error}</p>
                </div>
              )}

              <div className={styles.actionButtons}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setAnalysis(null);
                    setItems([]);
                    setShowCorrection(false);
                    setCorrectionText("");
                  }}
                >
                  Start Over
                </button>
                <button className="btn btn-primary" onClick={handleLog}>
                  Log it
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
