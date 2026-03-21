"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  getDayRange,
  getUserSettings,
  dateKey,
  getDayLog,
  setLoggedWeight,
} from "@/src/services/firestoreService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import styles from "./DashboardPage.module.css";

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateKey(d));
  }
  return days;
}

function shortDay(key) {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rangeData, setRangeData] = useState({});
  const [dayLogs, setDayLogs] = useState({});
  const [goal, setGoal] = useState(2000);
  const [weightInput, setWeightInput] = useState("");
  const [weightSaved, setWeightSaved] = useState(false);
  const days = useMemo(() => getLast7Days(), []);
  const today = dateKey();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const [range, settings, ...logs] = await Promise.all([
          getDayRange(user.uid, days[0], days[days.length - 1]),
          getUserSettings(user.uid),
          ...days.map((d) => getDayLog(user.uid, d)),
        ]);
        setRangeData(range);
        setGoal(settings.calorieGoal || 2000);

        const logMap = {};
        days.forEach((d, i) => {
          logMap[d] = logs[i] || {};
        });
        setDayLogs(logMap);

        // Prefill weight input with today's logged weight
        const todayLog = logMap[today] || {};
        if (todayLog.loggedWeight) setWeightInput(String(todayLog.loggedWeight));
      } catch (err) {
        console.warn("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, days, today]);

  // Build calorie chart data
  const calorieData = days.map((d) => {
    const entries = rangeData[d] || [];
    const total = entries.reduce((s, e) => s + (e.calories || 0), 0);
    return { day: shortDay(d), calories: total, goal };
  });

  // Build macro chart data
  const macroData = days.map((d) => {
    const entries = rangeData[d] || [];
    return {
      day: shortDay(d),
      protein: Math.round(entries.reduce((s, e) => s + (e.protein || 0), 0)),
      carbs: Math.round(entries.reduce((s, e) => s + (e.carbs || 0), 0)),
      fat: Math.round(entries.reduce((s, e) => s + (e.fat || 0), 0)),
    };
  });

  // Build weight chart data
  const weightData = days
    .map((d) => ({
      day: shortDay(d),
      weight: dayLogs[d]?.loggedWeight || null,
    }))
    .filter((d) => d.weight !== null);

  // Build water chart data
  const waterData = days.map((d) => ({
    day: shortDay(d),
    water: ((dayLogs[d]?.waterIntake || 0) / 1000),
  }));

  const handleSaveWeight = async () => {
    if (!user || !weightInput) return;
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) return;
    try {
      await setLoggedWeight(user.uid, today, kg);
      setWeightSaved(true);
      setDayLogs((prev) => ({
        ...prev,
        [today]: { ...prev[today], loggedWeight: kg },
      }));
      setTimeout(() => setWeightSaved(false), 2000);
    } catch (err) {
      console.warn("Failed to save weight:", err);
    }
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <h1 className="page-title">Dashboard</h1>
        <div className="card" style={{ height: 200 }}>
          <div className="skeleton" style={{ width: "100%", height: "100%", borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <h1 className="page-title" style={{ marginBottom: 20 }}>📊 Dashboard</h1>

      {/* Calorie Chart */}
      <div className={`card ${styles.chartCard}`}>
        <h3 className={styles.chartTitle}>Calories — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={calorieData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <Tooltip
              contentStyle={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 13,
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="calories" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="goal" stroke="var(--text-tertiary)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Macro Chart */}
      <div className={`card ${styles.chartCard}`}>
        <h3 className={styles.chartTitle}>Macros — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={macroData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <Tooltip
              contentStyle={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 13,
              }}
            />
            <Legend />
            <Bar dataKey="protein" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="carbs" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Water Chart */}
      <div className={`card ${styles.chartCard}`}>
        <h3 className={styles.chartTitle}>💧 Water (L) — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={waterData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
            <Tooltip
              contentStyle={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 13,
              }}
            />
            <Bar dataKey="water" fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weight Log + Chart */}
      <div className={`card ${styles.chartCard}`}>
        <h3 className={styles.chartTitle}>⚖️ Weight</h3>

        <div className={styles.weightRow}>
          <input
            className={styles.weightInput}
            type="number"
            placeholder="Today's weight (kg)"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button className={styles.weightBtn} onClick={handleSaveWeight}>
            {weightSaved ? "✓ Saved" : "Log"}
          </button>
        </div>

        {weightData.length > 1 && (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 12 }} stroke="var(--text-tertiary)" />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              />
              <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {weightData.length <= 1 && (
          <p className={styles.hint}>Log your weight for at least 2 days to see the trend chart.</p>
        )}
      </div>
    </div>
  );
}
