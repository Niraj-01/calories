"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import {
  getMyFoods,
  addMyFood,
  updateMyFood,
  deleteMyFood,
} from "@/src/services/firestoreService";
import styles from "./MyFoodsPage.module.css";

const emptyForm = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  defaultAmount: "100",
  defaultUnit: "g",
};

export default function MyFoodsPage() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await getMyFoods(user.uid);
        setFoods(data);
      } catch (err) {
        console.warn("Failed to load foods:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.calories) return;
    setSaving(true);
    try {
      const foodData = {
        name: form.name,
        calories: parseFloat(form.calories) || 0,
        protein: parseFloat(form.protein) || 0,
        carbs: parseFloat(form.carbs) || 0,
        fat: parseFloat(form.fat) || 0,
        defaultAmount: parseFloat(form.defaultAmount) || 100,
        defaultUnit: form.defaultUnit || "g",
      };

      if (editingId) {
        await updateMyFood(user.uid, editingId, foodData);
        setFoods((prev) =>
          prev.map((f) => (f.id === editingId ? { ...f, ...foodData } : f)),
        );
      } else {
        const id = await addMyFood(user.uid, foodData);
        setFoods((prev) => [...prev, { id, ...foodData }]);
      }
      resetForm();
    } catch (err) {
      console.warn("Failed to save food:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (food) => {
    setForm({
      name: food.name,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      defaultAmount: String(food.defaultAmount || 100),
      defaultUnit: food.defaultUnit || "g",
    });
    setEditingId(food.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteMyFood(user.uid, id);
      setFoods((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.warn("Failed to delete food:", err);
    }
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div className="skeleton" style={{ width: 120, height: 32 }} />
        </div>
        <div className={styles.list}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`card ${styles.foodCard}`}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton" style={{ width: 120, height: 18 }} />
                <div className="skeleton" style={{ width: 50, height: 18 }} />
              </div>
              <div
                className="skeleton"
                style={{ width: 200, height: 14, marginTop: 8 }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <div>
          <h1 className="page-title">My Foods</h1>
          <p className="page-subtitle">Saved &amp; frequent</p>
        </div>
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className={`card ${styles.formCard}`}>
          <h3 className={styles.formTitle}>
            {editingId ? "Edit Food" : "Add Food"}
          </h3>
          <div className={styles.formGrid}>
            <div className={styles.fieldFull}>
              <label className="label">Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Greek Yogurt"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Calories</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.calories}
                onChange={(e) => handleFormChange("calories", e.target.value)}
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Protein (g)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.protein}
                onChange={(e) => handleFormChange("protein", e.target.value)}
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Carbs (g)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.carbs}
                onChange={(e) => handleFormChange("carbs", e.target.value)}
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Fat (g)</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.fat}
                onChange={(e) => handleFormChange("fat", e.target.value)}
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Default Amount</label>
              <input
                className="input"
                type="number"
                placeholder="100"
                value={form.defaultAmount}
                onChange={(e) =>
                  handleFormChange("defaultAmount", e.target.value)
                }
              />
            </div>
            <div className={styles.fieldHalf}>
              <label className="label">Unit</label>
              <select
                className="input"
                value={form.defaultUnit}
                onChange={(e) =>
                  handleFormChange("defaultUnit", e.target.value)
                }
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
                <option value="serving">serving</option>
              </select>
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            disabled={!form.name || !form.calories || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : editingId ? "Update" : "Save"}
          </button>
        </div>
      )}

      {/* Search */}
      {foods.length > 0 && (
        <div className={styles.searchBar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search your foods"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {/* Foods list */}
      {foods.length === 0 && !showForm && (
        <div className="empty-state">
          <p className="empty-state-icon">★</p>
          <p className="empty-state-text">
            Create custom foods you eat often
            <br />
            for quick logging.
          </p>
        </div>
      )}

      {(() => {
        const TINTS = ["#EAF8F1", "#FBF1DA", "#FFF1E8", "#E4EEFB", "#F7E4E9"];
        const filtered = foods.filter((f) =>
          f.name.toLowerCase().includes(query.trim().toLowerCase()),
        );
        if (filtered.length === 0) return null;
        return (
          <div className={styles.foodGroup}>
            {filtered.map((food, i) => (
              <div
                key={food.id}
                className={styles.foodRow}
                style={{ borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border-divider)" }}
              >
                <div className={styles.foodTile} style={{ background: TINTS[i % TINTS.length] }}>
                  {food.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.foodInfo}>
                  <div className={styles.foodName}>{food.name}</div>
                  <div className={styles.foodMeta}>
                    {Math.round(food.defaultAmount || 100)} {food.defaultUnit || "g"} · P{Math.round(food.protein)} C{Math.round(food.carbs)} F{Math.round(food.fat)}
                  </div>
                </div>
                <div className={styles.foodCals}>{Math.round(food.calories)}</div>
                <button
                  className={styles.foodAction}
                  onClick={() => handleEdit(food)}
                  aria-label={`Edit ${food.name}`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                </button>
                <button
                  className={`${styles.foodAction} ${styles.foodDelete}`}
                  onClick={() => handleDelete(food.id)}
                  aria-label={`Delete ${food.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
