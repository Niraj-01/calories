"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getDayRange, getUserSettings, dateKey } from "@/src/services/firestoreService";
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
        const settings = await getUserSettings(user.uid);
        setGoal(settings.calorieGoal || 2000);

        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 13);

        const rangeData = await getDayRange(user.uid, dateKey(start), dateKey(today));

        const daysList = Object.entries(rangeData)
          .map(([date, entries]) => {
            const totals = entries.reduce(
              (acc, e) => ({
                calories: acc.calories + (e.calories || 0),
                protein: acc.protein + (e.protein || 0),
                carbs: acc.carbs + (e.carbs || 0),
                fat: acc.fat + (e.fat || 0),
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
            return { date, entries: entries.length, ...totals };
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        setDays(daysList);
      } catch (err) {
        console.error("Failed to load history:", err);
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
      <div className="page container">
        <div className={styles.loadingWrap}>
          <div className="spinner spinner-lg" />
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
              className={`${styles.dayCard} ${isEmpty ? styles.empty : ""}`}
            >
              <div className={styles.dayTop}>
                <span className={styles.dayDate}>{formatDate(day.date)}</span>
                <span
                  className={`${styles.dayCals} num ${
                    isEmpty ? styles.muted : isOver ? styles.red : styles.green
                  }`}
                >
                  {isEmpty ? "—" : day.calories}
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
                      <span className={styles.metaDot} style={{ background: "var(--protein)" }} />
                      {day.protein.toFixed(0)}g
                    </span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaDot} style={{ background: "var(--carbs)" }} />
                      {day.carbs.toFixed(0)}g
                    </span>
                    <span className={styles.metaItem}>
                      <span className={styles.metaDot} style={{ background: "var(--fat)" }} />
                      {day.fat.toFixed(0)}g
                    </span>
                    <span className={styles.metaGoal}>
                      {isOver ? `+${day.calories - goal}` : `${goal - day.calories} left`}
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
