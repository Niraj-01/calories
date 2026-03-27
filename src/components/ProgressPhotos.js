"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addProgressPhoto, getProgressPhotos, dateKey } from "@/src/services/firestoreService";
import styles from "./ProgressPhotos.module.css";

function compressToBase64(file, maxSizeKB = 200, maxWidth = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let quality = 0.92;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length / 1024 > maxSizeKB && quality > 0.4) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProgressPhotos({ user }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const list = await getProgressPhotos(user.uid);
        setPhotos(list);
      } catch (err) {
        console.warn("Load photos failed", err);
      }
    })();
  }, [user]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const compressed = await compressToBase64(file);
      const today = dateKey();
      await addProgressPhoto(user.uid, today, {
        imageBase64: compressed,
        note: "",
        weight: null,
      });
      setPhotos((prev) => [{ id: today, imageBase64: compressed, createdAt: new Date() }, ...prev]);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const ordered = useMemo(
    () => photos.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [photos],
  );

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Progress Photos</h3>
          <p className={styles.subtitle}>Track visual changes over time</p>
        </div>
        <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleUpload} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {ordered.length === 0 && <div className={styles.empty}>No photos yet</div>}
        {ordered.map((p) => (
          <button key={p.id} className={styles.photo} onClick={() => setLightbox(p)}>
            <img src={`data:image/jpeg;base64,${p.imageBase64}`} alt="Progress" />
            <span className={styles.dateOverlay}>{p.id || ""}</span>
          </button>
        ))}
      </div>

      {lightbox && (
        <div className={styles.lightbox} onClick={() => setLightbox(null)}>
          <img src={`data:image/jpeg;base64,${lightbox.imageBase64}`} alt="Progress full" />
        </div>
      )}
    </div>
  );
}
