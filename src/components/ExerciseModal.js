"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ExerciseModal.module.css";

export default function ExerciseModal({ open, onClose, onLog, defaultWeight = 70 }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exercise, setExercise] = useState("");
  const [duration, setDuration] = useState(30);
  const [weight, setWeight] = useState(defaultWeight);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 220);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setMounted(false);
      onClose?.();
    }, 200);
  };

  const fetchEstimate = async () => {
    if (!exercise.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
      if (!apiKey) throw new Error("Missing API key");

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Return ONLY JSON: { "name": string, "caloriesBurned": number, "metValue": number } for this exercise. Exercise: ${exercise}. If duration or weight missing, estimate using typical values (70kg, 30min) and clearly reflect that in numbers only.`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.1 },
          }),
        },
      );

      const data = await res.json().catch(async () => ({ raw: await res.text() }));
      if (!res.ok) {
        throw new Error(data?.error?.message || JSON.stringify(data));
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.raw || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Model returned non-JSON");
        parsed = JSON.parse(match[0]);
      }

      setResult(parsed);
    } catch (err) {
      setError(err.message || "Estimate failed");
    } finally {
      setLoading(false);
    }
  };

  const caloriesBurned = (() => {
    if (!result) return 0;
    const met = Number(result.metValue) || 1;
    const mins = duration;
    const wt = weight || defaultWeight;
    return Math.round(met * 3.5 * wt * mins / 200);
  })();

  const handleLog = () => {
    if (!exercise.trim()) return;
    onLog?.({
      name: result?.name || exercise.trim(),
      durationMinutes: duration,
      caloriesBurned,
      metValue: result?.metValue || null,
    });
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

        <header className={styles.header}>
          <h2 className={styles.title}>Log Exercise</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className={styles.field}>
          <label className={styles.label}>Exercise</label>
          <input
            ref={inputRef}
            className={`input ${styles.input}`}
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            placeholder="Running, Push-ups, Cycling"
          />
        </div>

        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label className={styles.label}>Duration (min)</label>
            <input
              type="number"
              className={`input ${styles.input}`}
              value={duration}
              min={5}
              max={180}
              onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 5))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Weight (kg)</label>
            <input
              type="number"
              className={`input ${styles.input}`}
              value={weight}
              min={30}
              max={200}
              onChange={(e) => setWeight(Math.max(30, parseFloat(e.target.value) || defaultWeight))}
            />
          </div>
        </div>

        <button className="btn btn-secondary btn-full" onClick={fetchEstimate} disabled={loading || !exercise.trim()}>
          {loading ? "Estimating..." : "Estimate calories"}
        </button>

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <div className={styles.resultCard}>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>Exercise</span>
              <span className={styles.resultValue}>{result.name}</span>
            </div>
            <div className={styles.resultRow}>
              <span className={styles.resultLabel}>Calories</span>
              <span className={styles.resultValue}>{caloriesBurned} kcal</span>
            </div>
            {result.metValue && (
              <div className={styles.resultRow}>
                <span className={styles.resultLabel}>MET</span>
                <span className={styles.resultValue}>{result.metValue}</span>
              </div>
            )}
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          disabled={!exercise.trim()}
          onClick={handleLog}
        >
          Log workout
        </button>
      </div>
    </div>,
    document.body,
  );
}
