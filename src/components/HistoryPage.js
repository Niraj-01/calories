"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  getDayRange,
  getUserSettings,
  dateKey,
} from "@/src/services/firestoreService";
import styles from "./HistoryPage.module.css";

export default function HistoryPage() {
  const { user } = useAuth();
  const [days, setDays] = useState([]);
  const [goal, setGoal] = useState(2000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 13);

        const [settings, rangeData] = await Promise.all([
          getUserSettings(user.uid),
          getDayRange(user.uid, dateKey(start), dateKey(today)),
        ]);

        setGoal(settings.calorieGoal || 2000);

        const daysList = Object.entries(rangeData)
          .map(([date, entries]) => {
            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + (e.calories || 0),
                protein: acc.protein + (e.protein || 0),
                carbs: acc.carbs + (e.carbs || 0),
                fat: acc.fat + (e.fat || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 },
            );
            return { date, entries: entries.length, ...totals };
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        setDays(daysList);
      } catch (err) {
        console.warn("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    const today = dateKey();
    const yesterday = dateKey(new Date(Date.now() - 86400000));

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";

    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div
            className="skeleton"
            style={{ width: 100, height: 32, marginBottom: 8 }}
          />
          <div className="skeleton" style={{ width: 120, height: 20 }} />
        </div>
        <div className={styles.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`card ${styles.dayCard}`}>
              <div className={styles.dayTop}>
                <div className="skeleton" style={{ width: 80, height: 20 }} />
                <div className="skeleton" style={{ width: 50, height: 20 }} />
              </div>
              <div className={styles.barTrack}>
                <div
                  className="skeleton"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
              <div className={styles.dayMeta} style={{ marginTop: 12 }}>
                <div className="skeleton" style={{ width: 180, height: 16 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">Last 14 days</p>
      </div>

      <div className={styles.list}>
        {days.map((day) => {
          const isOver = day.calories > goal;
          const isEmpty = day.entries === 0;
          const pct = Math.min(Math.round((day.calories / goal) * 100), 150);

          return (
            <div
              key={day.date}
              className={`card ${styles.dayCard} ${isEmpty ? styles.empty : ""}`}
            >
              <div className={styles.dayTop}>
                <span className={styles.dayDate}>{formatDate(day.date)}</span>
                <span
                  className={`${styles.dayCals} ${
                    isEmpty ? styles.muted : isOver ? styles.red : styles.green
                  }`}
                >
                  {isEmpty ? "—" : day.calories}
                  {!isEmpty && <span className={styles.kcalSuffix}>kcal</span>}
                </span>
              </div>

              {!isEmpty && (
                <>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isOver ? "var(--danger)" : "var(--accent)",
                      }}
                    />
                  </div>
                  <div className={styles.dayMeta}>
                    <span className={styles.metaItem}>
                      <span className={styles.metaDot} data-type="protein" />
                      {day.protein.toFixed(0)}g
                    </span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaDot} data-type="carbs" />
                      {day.carbs.toFixed(0)}g
                    </span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaDot} data-type="fat" />
                      {day.fat.toFixed(0)}g
                    </span>
                    <span className={styles.metaGoal}>
                      {isOver
                        ? `+${day.calories - goal}`
                        : `${goal - day.calories} left`}
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
