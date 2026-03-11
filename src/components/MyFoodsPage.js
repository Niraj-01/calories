"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { getMyFoods, addMyFood, updateMyFood, deleteMyFood } from "@/src/services/firestoreService";
import styles from "./MyFoodsPage.module.css";

const EMPTY_FOOD = { name: "", calories: "", protein: "", carbs: "", fat: "" };

export default function MyFoodsPage() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FOOD);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyFoods(user.uid);
        if (!cancelled) setFoods(data);
      } catch (err) {
        console.warn("Failed to load my foods:", err);
        // Show empty state instead of infinite spinner
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const openAdd = () => {
    setForm(EMPTY_FOOD);
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (food) => {
    setForm({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setEditingId(food.id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FOOD);
  };

  const handleSave = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    const foodData = {
      name: form.name.trim(),
      calories: parseFloat(form.calories) || 0,
      protein: parseFloat(form.protein) || 0,
      carbs: parseFloat(form.carbs) || 0,
      fat: parseFloat(form.fat) || 0,
    };
    try {
      if (editingId) {
        await updateMyFood(user.uid, editingId, foodData);
        setFoods((prev) =>
          prev.map((f) => (f.id === editingId ? { ...f, ...foodData } : f))
        );
      } else {
        const id = await addMyFood(user.uid, foodData);
        setFoods((prev) => [...prev, { id, ...foodData }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch (err) {
      console.warn("Failed to save food:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (foodId) => {
    if (!user) return;
    try {
      await deleteMyFood(user.uid, foodId);
      setFoods((prev) => prev.filter((f) => f.id !== foodId));
      setDeleteConfirm(null);
    } catch (err) {
      console.warn("Failed to delete food:", err);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="page container fade-in">
        <div className={styles.header}>
          <div className="skeleton" style={{ width: 140, height: 32 }} />
          <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8 }} />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={`card ${styles.foodCard}`}>
            <div className={styles.foodInfo}>
              <div className="skeleton" style={{ width: 120, height: 20, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: 180, height: 16 }} />
            </div>
            <div className={styles.foodActions}>
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
              <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="page container fade-in">
      <div className={styles.header}>
        <h1 className="page-title">My Foods</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          + Add Food
        </button>
      </div>

      {/* Add/Edit Form */}
      {formOpen && (
        <div className={`card ${styles.formCard}`}>
          <h3 className={styles.formTitle}>
            {editingId ? "Edit Food" : "New Food"}
          </h3>
          <p className={styles.formHint}>Values per 100g</p>

          <div className={styles.field}>
            <label className="label" htmlFor="foodName">Name</label>
            <input
              id="foodName"
              type="text"
              className="input"
              placeholder="e.g. Chicken Breast"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          <div className={styles.macroGrid}>
            <div className={styles.field}>
              <label className="label" htmlFor="foodCal">Calories</label>
              <input
                id="foodCal"
                type="number"
                className="input num"
                placeholder="0"
                value={form.calories}
                onChange={(e) => updateField("calories", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="label" htmlFor="foodProtein">Protein (g)</label>
              <input
                id="foodProtein"
                type="number"
                className="input num"
                placeholder="0"
                value={form.protein}
                onChange={(e) => updateField("protein", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="label" htmlFor="foodCarbs">Carbs (g)</label>
              <input
                id="foodCarbs"
                type="number"
                className="input num"
                placeholder="0"
                value={form.carbs}
                onChange={(e) => updateField("carbs", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="label" htmlFor="foodFat">Fat (g)</label>
              <input
                id="foodFat"
                type="number"
                className="input num"
                placeholder="0"
                value={form.fat}
                onChange={(e) => updateField("fat", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <button className="btn btn-secondary" onClick={closeForm}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
            >
              {saving ? "Saving..." : editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Food list */}
      {foods.length === 0 && !formOpen && (
        <div className="empty-state">
          <p className="empty-state-icon">★</p>
          <p className="empty-state-text">
            No custom foods yet.<br />
            Tap &ldquo;+ Add Food&rdquo; to create one.
          </p>
        </div>
      )}

      {foods.map((food) => (
        <div key={food.id} className={`card ${styles.foodCard}`}>
          <div className={styles.foodInfo}>
            <p className={styles.foodName}>{food.name}</p>
            <div className={styles.foodMacros}>
              <span className={styles.foodCal}>
                <span className="num">{food.calories}</span> kcal
              </span>
              <span className={styles.foodMacro} style={{ color: "var(--protein)" }}>
                P:{food.protein}g
              </span>
              <span className={styles.foodMacro} style={{ color: "var(--carbs)" }}>
                C:{food.carbs}g
              </span>
              <span className={styles.foodMacro} style={{ color: "var(--fat)" }}>
                F:{food.fat}g
              </span>
            </div>
          </div>
          <div className={styles.foodActions}>
            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(food)}>
              ✎
            </button>
            {deleteConfirm === food.id ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(food.id)}
              >
                Confirm
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDeleteConfirm(food.id)}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
