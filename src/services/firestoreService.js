import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/firebase";

// Helper: date string in YYYY-MM-DD format
export function dateKey(date = new Date()) {
  return date.toISOString().split("T")[0];
}

// --- Entries ---

// Path: users/{uid}/logs/{date}/entries/{entryId}
function entriesRef(uid, date) {
  return collection(db, "users", uid, "logs", date, "entries");
}

export async function addFoodEntry(uid, date, entry) {
  const ref = entriesRef(uid, date);
  const docRef = await addDoc(ref, {
    ...entry,
    uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteFoodEntry(uid, date, entryId) {
  const ref = doc(db, "users", uid, "logs", date, "entries", entryId);
  await deleteDoc(ref);
}

export async function getDayEntries(uid, date) {
  const ref = entriesRef(uid, date);
  const q = query(ref, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Get entries for a range of dates (for history)
export async function getDayRange(uid, startDate, endDate) {
  const results = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  const promises = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    promises.push(
      (async () => {
        try {
          const entries = await getDayEntries(uid, key);
          results[key] = entries;
        } catch {
          results[key] = [];
        }
      })(),
    );
  }

  await Promise.all(promises);
  return results;
}

// --- Recent & Frequent Foods ---

export async function getRecentEntries(uid, maxItems = 10) {
  const q = query(
    collectionGroup(db, "entries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(maxItems),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getFrequentFoods(uid, maxItems = 8) {
  const q = query(
    collectionGroup(db, "entries"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(100),
  );
  const snap = await getDocs(q);
  const counts = new Map();

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const key = (data.name || "").toLowerCase();
    if (!key) return;
    const prev = counts.get(key) || { name: data.name, total: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: 0 };
    prev.count += 1;
    prev.calories += data.calories || 0;
    prev.protein += data.protein || 0;
    prev.carbs += data.carbs || 0;
    prev.fat += data.fat || 0;
    prev.fiber += data.fiber || 0;
    counts.set(key, prev);
  });

  const sorted = [...counts.values()]
    .map((v) => ({
      name: v.name,
      avgCalories: Math.round(v.calories / v.count) || 0,
      avgProtein: Math.round((v.protein / v.count) * 10) / 10 || 0,
      avgCarbs: Math.round((v.carbs / v.count) * 10) / 10 || 0,
      avgFat: Math.round((v.fat / v.count) * 10) / 10 || 0,
      avgFiber: Math.round((v.fiber / v.count) * 10) / 10 || 0,
      count: v.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxItems);

  return sorted;
}

// --- User Settings ---

function userDocRef(uid) {
  return doc(db, "users", uid);
}

export async function getUserSettings(uid) {
  const snap = await getDoc(userDocRef(uid));
  if (snap.exists()) {
    return snap.data();
  }
  // Default settings
  return { calorieGoal: 2000, displayName: "" };
}

export async function setUserSettings(uid, settings) {
  await setDoc(userDocRef(uid), settings, { merge: true });
}

// --- My Foods ---

// Path: users/{uid}/myFoods/{foodId}
function myFoodsRef(uid) {
  return collection(db, "users", uid, "myFoods");
}

export async function getMyFoods(uid) {
  const ref = myFoodsRef(uid);
  const q = query(ref, orderBy("name", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMyFood(uid, food) {
  const ref = myFoodsRef(uid);
  const docRef = await addDoc(ref, {
    ...food,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateMyFood(uid, foodId, food) {
  const ref = doc(db, "users", uid, "myFoods", foodId);
  await updateDoc(ref, food);
}

export async function deleteMyFood(uid, foodId) {
  const ref = doc(db, "users", uid, "myFoods", foodId);
  await deleteDoc(ref);
}

// --- Day-level Log Document ---
// Path: users/{uid}/logs/{date}  (the document itself, not sub-collections)

function dayDocRef(uid, date) {
  return doc(db, "users", uid, "logs", date);
}

export async function getDayLog(uid, date) {
  const snap = await getDoc(dayDocRef(uid, date));
  return snap.exists() ? snap.data() : {};
}

export async function setDayLog(uid, date, data) {
  await setDoc(dayDocRef(uid, date), data, { merge: true });
}

// --- Water Tracking ---

export async function getWaterIntake(uid, date) {
  const data = await getDayLog(uid, date);
  return data.waterIntake || 0;
}

export async function setWaterIntake(uid, date, ml) {
  await setDayLog(uid, date, { waterIntake: ml });
}

// --- Weight Logging ---

export async function getLoggedWeight(uid, date) {
  const data = await getDayLog(uid, date);
  return data.loggedWeight || null;
}

export async function setLoggedWeight(uid, date, kg) {
  await setDayLog(uid, date, { loggedWeight: kg });
}

// --- Streak Helpers ---

export async function updateStreak(uid) {
  const settings = await getUserSettings(uid);
  const today = dateKey();
  const lastLog = settings.lastLogDate || "";
  let streak = settings.currentStreak || 0;

  if (lastLog === today) {
    // Already logged today — no change
    return streak;
  }

  // Check if lastLog was yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = dateKey(yesterday);

  if (lastLog === yKey) {
    streak += 1;
  } else {
    streak = 1; // reset
  }

  await setUserSettings(uid, { currentStreak: streak, lastLogDate: today });
  return streak;
}

// --- Exercises ---

function exercisesRef(uid, date) {
  return collection(db, "users", uid, "logs", date, "exercises");
}

export async function addExerciseEntry(uid, date, data) {
  const ref = exercisesRef(uid, date);
  const docRef = await addDoc(ref, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteExerciseEntry(uid, date, entryId) {
  const ref = doc(db, "users", uid, "logs", date, "exercises", entryId);
  await deleteDoc(ref);
}

export async function getExerciseEntries(uid, date) {
  const ref = exercisesRef(uid, date);
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Progress Photos ---

function progressPhotosRef(uid) {
  return collection(db, "users", uid, "progressPhotos");
}

export async function addProgressPhoto(uid, dateKeyStr, data) {
  const ref = doc(progressPhotosRef(uid), dateKeyStr);
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), uid });
  return ref.id;
}

export async function getProgressPhotos(uid) {
  const q = query(progressPhotosRef(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
