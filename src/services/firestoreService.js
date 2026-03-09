import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
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

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    try {
      const entries = await getDayEntries(uid, key);
      results[key] = entries;
    } catch {
      results[key] = [];
    }
  }
  return results;
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
