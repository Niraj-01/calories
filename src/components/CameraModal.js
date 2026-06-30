"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scaleMacros } from "@/src/services/foodDataService";
import styles from "./CameraModal.module.css";

function mealLabelFor(meal) {
  if (!meal) return "diary";
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

export default function CameraModal({ meal, onAdd, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [foodName, setFoodName] = useState("");
  const [baseGrams, setBaseGrams] = useState(100);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const detected = !!analysis;

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

  // Live rear-camera preview. Falls back silently to the decorative
  // backdrop + native file capture when getUserMedia is unavailable.
  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
        return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraReady(true);
      } catch {
        setCameraReady(false);
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    setVisible(false);
    stopCamera();
    setTimeout(onClose, 320);
  };

  const ingestImage = (dataUrl) => {
    const base64 = typeof dataUrl === "string" ? dataUrl.split(",")[1] : "";
    setPreview(dataUrl);
    setImageBase64(base64);
    return base64;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      ingestImage(reader.result);
      runAnalysis(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Grab a frame from the live video and analyze it.
  const captureFrame = () => {
    const video = videoRef.current;
    if (!cameraReady || !video || !video.videoWidth) {
      fileInputRef.current?.click();
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    ingestImage(dataUrl);
    runAnalysis(dataUrl);
  };

  const sanitizeAndParse = (rawText) => {
    const cleaned = (rawText || "").replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Model returned non-JSON response");
    }
  };

  const callGeminiDirect = async (b64, mime) => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY;
    if (!key) throw new Error("Missing GOOGLE_AI_API_KEY");

    const prompt =
      'You are a food nutrition expert. Analyze the food in this image. Return ONLY a JSON object (no markdown, no explanation) with this exact shape:\n{ "name": string, "estimatedGrams": number, "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "confidence": "high"|"medium"|"low", "items": [{ "name": string, "grams": number, "calories": number }] }\nIf multiple foods are visible, list each in items[] and sum the totals. Estimate portion sizes from visual cues.';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { parts: [{ inline_data: { mime_type: mime, data: b64 } }, { text: prompt }] },
          ],
          generationConfig: { temperature: 0.1 },
        }),
      },
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || "Analysis failed");
    }
    const data = await res.json();
    return sanitizeAndParse(data?.candidates?.[0]?.content?.parts?.[0]?.text);
  };

  // Background-job flow: the POST returns a jobId in ~10ms while the slow Gemini
  // call runs out of band; we then poll for the result. The job is idempotent
  // (id = hash of the image), so a retry of the same photo never re-runs the
  // model — it just returns the cached result.
  const callServerAnalysis = async (b64, mime) => {
    const parseJobResponse = async (res) => {
      const textBody = await res.text();
      let data;
      try {
        data = JSON.parse(textBody);
      } catch {
        if (textBody?.trim().startsWith("<"))
          throw new Error("Server API unavailable (HTML response)");
        throw new Error("Unexpected response from analysis API");
      }
      return data;
    };

    // Enqueue (or join an in-flight / completed job).
    const res = await fetch("/api/analyze-food/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: b64, mimeType: mime }),
    });
    const job = await parseJobResponse(res);
    if (!res.ok && res.status !== 202)
      throw new Error(job?.error || "Analysis failed");
    if (job.status === "done") return job.result;
    if (job.status === "error") throw new Error(job.error || "Analysis failed");

    // Poll until the deferred work reaches a terminal state.
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1200));
      const pollRes = await fetch(`/api/analyze-food/jobs/${job.jobId}`);
      const status = await parseJobResponse(pollRes);
      if (status.status === "done") return status.result;
      if (status.status === "error")
        throw new Error(status.error || "Analysis failed");
    }
    throw new Error("Analysis timed out — please try again.");
  };

  const runAnalysis = async (dataUrl) => {
    const source = dataUrl || preview;
    const b64 = imageBase64 || (typeof source === "string" ? source.split(",")[1] : "");
    if (!b64) {
      setError("Please capture a photo first");
      return;
    }
    const mime = source?.split(";")[0]?.split(":")[1] || "image/jpeg";

    setLoading(true);
    setError(null);
    stopCamera();
    try {
      let result;
      try {
        result = await callServerAnalysis(b64, mime);
      } catch (serverErr) {
        console.warn("Server analysis failed, falling back to client Gemini:", serverErr);
        result = await callGeminiDirect(b64, mime);
      }
      setAnalysis(result);
      setFoodName(result.name || "Food");
      setBaseGrams(Number(result.estimatedGrams) || 100);
      setQty(1);
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

  const servingGrams = baseGrams * qty;
  const scaledMacros = useMemo(
    () => (per100g ? scaleMacros(per100g, servingGrams || 0) : null),
    [per100g, servingGrams],
  );

  const handleRetake = () => {
    setAnalysis(null);
    setPreview(null);
    setImageBase64(null);
    setError(null);
    setCameraReady(false);
    // restart the camera
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraReady(true);
        })
        .catch(() => setCameraReady(false));
    }
  };

  const handleLog = () => {
    if (!per100g) return;
    onAdd({
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
    });
    handleClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`${styles.scanner} ${visible ? styles.scannerVisible : ""}`}>
      {/* camera feed / backdrop */}
      <video
        ref={videoRef}
        className={`${styles.video} ${cameraReady && !detected ? styles.videoOn : ""}`}
        autoPlay
        playsInline
        muted
      />
      <div className={styles.cameraBg} />
      <div className={styles.vignette} />

      {/* top bar */}
      <div className={styles.topBar}>
        <button className={styles.roundBtn} onClick={handleClose} aria-label="Close scanner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className={styles.topTitle}>Scan</div>
        <div className={styles.roundBtn} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4.5 13H11l-1 9 8.5-11H12z" /></svg>
        </div>
      </div>

      {/* auto-detect badge */}
      <div className={styles.autoBadge}>
        <span className={styles.dot} />
        <span className={styles.autoLabel}>Auto-detect</span>
        <span className={styles.autoKind}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 11h1v2H3zM6 11h1v2H6zM9 10h1.4v4H9zM12.4 11h1v2h-1zM15.4 10h1.4v4h-1.4zM19 11h1v2h-1z" /></svg>
          Food &amp; barcode
        </span>
      </div>

      {/* reticle */}
      <div className={styles.reticle}>
        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />
        <div className={styles.barHint}>
          {[3, 2, 4, 2, 3, 5, 2, 3].map((w, i) => (
            <span key={i} style={{ width: w }} />
          ))}
        </div>
        {!detected && <div className={styles.scanline} />}
      </div>

      {/* scanning helper text + controls */}
      {!detected && !loading && (
        <>
          <div className={styles.hint}>
            Point at your meal or a barcode —<br />Calo figures out which automatically
          </div>
          <div className={styles.controls}>
            <button
              className={styles.sideBtn}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Choose from library"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="9" r="1.6" /><path d="M21 16l-5-5L5 21" /></svg>
            </button>
            <button className={styles.shutter} onClick={captureFrame} aria-label="Capture">
              <span className={styles.shutterInner} />
            </button>
            <button className={styles.sideBtn} aria-label="Options" type="button">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
            </button>
          </div>
        </>
      )}

      {loading && (
        <div className={styles.analyzing}>
          <span className={styles.dot} />
          Analyzing your meal…
        </div>
      )}

      {error && !detected && <div className={styles.errorToast}>{error}</div>}

      {/* detected result sheet */}
      {detected && (
        <div className={styles.sheet}>
          <div className={styles.grabber} />
          <div className={styles.detectedTag}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#16B26A"><path d="M12 2l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 15.6 6.3 18.5l1.1-6L3 8.4l6-.8z" /></svg>
            Detected via photo
          </div>
          <div className={styles.detRow}>
            <input
              className={styles.detName}
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              aria-label="Food name"
            />
            <div className={styles.stepper}>
              <button
                className={styles.stepMinus}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className={styles.stepVal}>{qty}</span>
              <button
                className={styles.stepPlus}
                onClick={() => setQty((q) => q + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          <div className={styles.macroGrid}>
            <div className={styles.macroCell}>
              <div className={styles.macroVal}>{scaledMacros?.calories ?? 0}</div>
              <div className={styles.macroKey}>KCAL</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal} style={{ color: "var(--accent-protein)" }}>{scaledMacros?.protein ?? 0}g</div>
              <div className={styles.macroKey}>PROTEIN</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal} style={{ color: "var(--accent-carbs)" }}>{scaledMacros?.carbs ?? 0}g</div>
              <div className={styles.macroKey}>CARBS</div>
            </div>
            <div className={styles.macroCell}>
              <div className={styles.macroVal} style={{ color: "var(--accent-fat)" }}>{scaledMacros?.fat ?? 0}g</div>
              <div className={styles.macroKey}>FAT</div>
            </div>
          </div>

          {error && <div className={styles.sheetError}>{error}</div>}

          <div className={styles.sheetActions}>
            <button className={styles.retake} onClick={handleRetake}>Retake</button>
            <button className={styles.confirm} onClick={handleLog}>
              Add to {mealLabelFor(meal)}
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        className={styles.fileInput}
        onChange={handleImageChange}
      />
    </div>,
    document.body,
  );
}
