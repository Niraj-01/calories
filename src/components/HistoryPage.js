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
    // Static header text is rendered directly (no data needed → zero mismatch),
    // and the skeleton reserves the week chart card (otherwise it pops in and
    // pushes the day rows down) plus day rows, using the real .chartCard/.chart
    // and .dayGroup/.dayRow classes so heights match the loaded content.
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">Last 7 days</p>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.chart}>
            <div className="skeleton" style={{ width: "100%", height: "100%", borderRadius: 8 }} />
          </div>
          <div className="skeleton" style={{ width: 140, height: 14, marginTop: 14 }} />
        </div>
        <div className={styles.dayGroup}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.dayRow}>
              <div>
                <div className="skeleton" style={{ width: 90, height: 16, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 130, height: 12 }} />
              </div>
              <div className="skeleton" style={{ width: 54, height: 18 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const week = days.slice(0, 7).reverse();
  const weekMax = Math.max(goal, ...week.map((d) => d.calories), 1);
  const onTargetDays = week.filter((d) => d.entries > 0 && d.calories <= goal).length;
  const loggedDays = week.filter((d) => d.entries > 0);
  const weekAvg = loggedDays.length
    ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
    : 0;

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <h1 className="page-title">History</h1>
        <p className="page-subtitle">Last 7 days</p>
      </div>

      {week.length > 0 && (
        <div className={styles.chartCard}>
          <div className={styles.chart}>
            {week.map((d) => {
              const h = d.entries === 0 ? 6 : Math.max(Math.round((d.calories / weekMax) * 100), 8);
              const color =
                d.entries === 0
                  ? "var(--bg-highest)"
                  : d.calories > goal
                    ? "var(--accent-streak)"
                    : d.calories >= goal * 0.85
                      ? "var(--accent)"
                      : "#9DE0C0";
              const initial = new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "narrow",
              });
              return (
                <div key={d.date} className={styles.barCol}>
                  <div className={styles.bar} style={{ height: `${h}%`, background: color }} />
                  <span className={styles.barDay}>{initial}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.chartLegend}>
            <span className={styles.legendDot} />
            <span className={styles.legendText}>
              {weekAvg ? `Avg ${weekAvg.toLocaleString()} kcal · ` : ""}
              {onTargetDays} of {week.length} days on target
            </span>
          </div>
        </div>
      )}

      {(() => {
        const logged = days.filter((d) => d.entries > 0);
        if (logged.length === 0) {
          return (
            <div className="empty-state">
              <p className="empty-state-text">No history yet — start logging meals.</p>
            </div>
          );
        }
        return (
          <div className={styles.dayGroup}>
            {logged.map((day, i) => {
              const isOver = day.calories > goal;
              const onTarget = !isOver && day.calories >= goal * 0.9;
              const status = isOver ? "over" : onTarget ? "on target" : "under";
              const color = isOver
                ? "var(--accent-streak)"
                : onTarget
                  ? "var(--accent)"
                  : "var(--text-primary)";
              return (
                <div
                  key={day.date}
                  className={styles.dayRow}
                  style={{ borderBottom: i === logged.length - 1 ? "none" : "1px solid var(--border-divider)" }}
                >
                  <div>
                    <div className={styles.dayLabel}>{formatDate(day.date)}</div>
                    <div className={styles.dayMeals}>
                      {day.entries} {day.entries === 1 ? "item" : "items"} · {status}
                    </div>
                  </div>
                  <div className={styles.dayKcal} style={{ color }}>
                    {Math.round(day.calories).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
