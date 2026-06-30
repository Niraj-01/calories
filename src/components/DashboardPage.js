"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  getDayRange,
  getUserSettings,
  dateKey,
  getDayLog,
  setLoggedWeight,
  getProgressPhotos,
} from "@/src/services/firestoreService";
import ProgressPhotos from "@/src/components/ProgressPhotos";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import styles from "./DashboardPage.module.css";

function getLastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
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
  const [photos, setPhotos] = useState([]);

  const [activeFilter, setActiveFilter] = useState("1W");

  const numDays =
    activeFilter === "1W"
      ? 7
      : activeFilter === "1M"
        ? 30
        : activeFilter === "6M"
          ? 180
          : 365;
  const days = useMemo(() => getLastNDays(numDays), [numDays]);
  const today = dateKey();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const [range, settings, photosList, ...logs] = await Promise.all([
          getDayRange(user.uid, days[0], days[days.length - 1]),
          getUserSettings(user.uid),
          getProgressPhotos(user.uid),
          ...days.map((d) => getDayLog(user.uid, d)),
        ]);
        setRangeData(range);
        setGoal(settings.calorieGoal || 2000);
        setPhotos(photosList || []);

        const logMap = {};
        days.forEach((d, i) => {
          logMap[d] = logs[i] || {};
        });
        setDayLogs(logMap);

        const todayLog = logMap[today] || {};
        if (todayLog.loggedWeight)
          setWeightInput(String(todayLog.loggedWeight));
      } catch (err) {
        console.warn("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, days, today]);

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

  const calorieData = days.map((d) => {
    const entries = rangeData[d] || [];
    const total = entries.reduce((s, e) => s + (e.calories || 0), 0);
    return { day: shortDay(d), calories: total, goal };
  });

  const totalCals = calorieData.reduce((s, x) => s + x.calories, 0);
  const avgCals = Math.round(totalCals / (calorieData.length || 1));

  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  days.forEach((d) => {
    const entries = rangeData[d] || [];
    totalProtein += entries.reduce((s, e) => s + (e.protein || 0), 0);
    totalCarbs += entries.reduce((s, e) => s + (e.carbs || 0), 0);
    totalFat += entries.reduce((s, e) => s + (e.fat || 0), 0);
  });

  const macroPieData = [
    { name: "Protein", value: totalProtein, color: "#4A90D9" },
    { name: "Carbs", value: totalCarbs, color: "#F5A623" },
    { name: "Fat", value: totalFat, color: "#D0021B" },
  ].filter((m) => m.value > 0);

  if (macroPieData.length === 0) {
    macroPieData.push({
      name: "Empty",
      value: 1,
      color: "rgba(255,255,255,0.1)",
    });
  }

  const weightData = days
    .map((d) => ({
      day: shortDay(d),
      weight: dayLogs[d]?.loggedWeight || null,
    }))
    .filter((d) => d.weight !== null);

  const latestWeight =
    weightData.length > 0 ? weightData[weightData.length - 1].weight : null;

  const waterData = days.map((d) => ({
    day: shortDay(d),
    water: (dayLogs[d]?.waterIntake || 0) / 1000,
  }));

  const chartTheme = {
    tooltipBg: "rgba(28, 28, 30, 0.9)",
    tooltipBorder: "rgba(255, 255, 255, 0.1)",
    textTertiary: "rgba(255, 255, 255, 0.4)",
    grid: "rgba(255, 255, 255, 0.05)",
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: chartTheme.tooltipBg,
            border: `1px solid ${chartTheme.tooltipBorder}`,
            borderRadius: 12,
            padding: "8px 12px",
            backdropFilter: "blur(10px)",
            fontSize: "0.85rem",
          }}
        >
          <p style={{ margin: "0 0 4px", color: "#fff", fontWeight: 600 }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    // Mirror the real structure so nothing shifts when data loads: the
    // dateFilters pill row (otherwise it pops in and pushes the cards down) and
    // cards built from the same .card/.chartWrapper classes, so their heights
    // match the live charts exactly.
    return (
      <div className={`${styles.container} fade-in`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Nutrition</h1>
        </div>
        <div className={styles.dateFilters}>
          {["1W", "1M", "6M", "1Y"].map((f) => (
            <div
              key={f}
              className={styles.skeleton}
              style={{ flex: 1, height: 32, borderRadius: "var(--radius-pill)" }}
            />
          ))}
        </div>
        <div className={styles.card}>
          <div className={styles.skeleton} style={{ width: 140, height: 18, marginBottom: 6 }} />
          <div className={styles.skeleton} style={{ width: 90, height: 13 }} />
          <div className={styles.chartWrapper}>
            <div className={styles.skeleton} style={{ width: "100%", height: "100%", borderRadius: 8 }} />
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.skeleton} style={{ width: 120, height: 18, marginBottom: 12 }} />
          <div className={styles.skeleton} style={{ width: "100%", height: 120, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} fade-in`}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nutrition</h1>
      </div>

      <div className={styles.dateFilters}>
        {["1W", "1M", "6M", "1Y"].map((f) => (
          <button
            key={f}
            className={`${styles.filterBtn} ${activeFilter === f ? styles.active : ""}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Calories in vs out */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Calories in vs out</div>
            <div className={styles.cardSub}>Avg {avgCals} kcal/day</div>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={calorieData}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartTheme.grid}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
                dy={10}
                minTickGap={20}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar
                dataKey="calories"
                name="Calories"
                fill="#00B84D"
                radius={[4, 4, 4, 4]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macros Breakdown */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Macros Breakdown</div>
        </div>
        <div className={styles.macrosRow}>
          <div className={styles.macrosChart}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  stroke="none"
                  dataKey="value"
                  paddingAngle={5}
                >
                  {macroPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.macrosList}>
            <div className={styles.macroItem}>
              <div className={styles.macroLabelGroup}>
                <div
                  className={styles.macroDot}
                  style={{ background: "#4A90D9" }}
                />
                <span className={styles.macroLabel}>Protein</span>
              </div>
              <span className={styles.macroValue}>
                {Math.round(totalProtein)}g
              </span>
            </div>
            <div className={styles.macroItem}>
              <div className={styles.macroLabelGroup}>
                <div
                  className={styles.macroDot}
                  style={{ background: "#F5A623" }}
                />
                <span className={styles.macroLabel}>Carbs</span>
              </div>
              <span className={styles.macroValue}>
                {Math.round(totalCarbs)}g
              </span>
            </div>
            <div className={styles.macroItem}>
              <div className={styles.macroLabelGroup}>
                <div
                  className={styles.macroDot}
                  style={{ background: "#D0021B" }}
                />
                <span className={styles.macroLabel}>Fat</span>
              </div>
              <span className={styles.macroValue}>{Math.round(totalFat)}g</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Trend */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Weight Trend</div>
            <div className={styles.cardSub}>
              {latestWeight ? `${latestWeight} kg` : "No data"}
            </div>
          </div>
        </div>

        <div className={styles.weightRow}>
          <input
            className={styles.weightInput}
            type="number"
            placeholder="Log today's weight"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
          />
          <button className={styles.weightBtn} onClick={handleSaveWeight}>
            {weightSaved ? "✓" : "Log"}
          </button>
        </div>

        {weightData.length > 1 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={weightData}
                margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B84D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00B84D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.grid}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
                  dy={10}
                  minTickGap={20}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="weight"
                  name="Weight"
                  stroke="#00B84D"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorWeight)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.hint}>
            Log your weight for at least 2 days to see the trend.
          </p>
        )}
      </div>

      {/* Progress Photos */}
      <div className={styles.card}>
        <ProgressPhotos user={user} />
      </div>

      {/* Water Intake */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Water Intake</div>
            <div className={styles.cardSub}>Hydration (Liters)</div>
          </div>
        </div>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={waterData}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartTheme.grid}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
                dy={10}
                minTickGap={20}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: chartTheme.textTertiary, fontSize: 12 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar
                dataKey="water"
                name="Water (L)"
                fill="#4A90D9"
                radius={[4, 4, 4, 4]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
