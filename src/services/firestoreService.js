import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  getDocsFromCache,
  getDocFromCache,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/src/firebase";

// Helper: date string in YYYY-MM-DD format (Local Timezone)
export function dateKey(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

// --- Cache-first reads ---
//
// The Firestore SDK keeps an on-device copy of everything it has synced
// (persistentLocalCache in firebase.js). Reads below take { cache: true } to
// answer from that copy alone — IndexedDB, no network, a few milliseconds —
// so screens can paint a returning user's data instantly and then revalidate
// with a normal (server) read. A cache read never throws: it resolves to null
// when the device has nothing for it.

async function readQuery(q, cache) {
  if (!cache) return getDocs(q);
  try {
    return await getDocsFromCache(q);
  } catch {
    return null;
  }
}

const listOf = (snap) => snap && snap.docs.map((d) => ({ id: d.id, ...d.data() }));

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

export async function getDayEntries(uid, date, { cache = false } = {}) {
  const ref = entriesRef(uid, date);
  const q = query(ref, orderBy("createdAt", "asc"));
  return listOf(await readQuery(q, cache));
}

// Local YYYY-MM-DD for a Date (matches the log-document id format).
function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Get entries for a range of dates (for history), keyed by "YYYY-MM-DD".
//
// One round trip: instead of firing a getDocs() per day (N round trips — e.g.
// ~900 for the 30-month export), we issue a single collectionGroup query over
// all of the user's "entries", bounded by a createdAt timestamp range, then
// group the results by their log-day in memory. The createdAt bounds are padded
// by a day on each side so entries written near midnight (createdAt is UTC
// server time, the log-day is local) are never missed; the precise day filter
// happens during grouping. Reuses the existing (uid, createdAt) collection-group
// index — no schema change.
export async function getDayRange(uid, startDate, endDate, { cache = false } = {}) {
  const startKey = String(startDate).slice(0, 10);
  const endKey = String(endDate).slice(0, 10);

  // Pre-seed every day in the range so empty days are still present as [] —
  // callers (e.g. HistoryPage) iterate the full range, not just logged days.
  const results = {};
  for (
    let d = new Date(`${startKey}T12:00:00`);
    localDateKey(d) <= endKey;
    d.setDate(d.getDate() + 1)
  ) {
    results[localDateKey(d)] = [];
  }

  // createdAt window, padded ±1 day to absorb local-day vs UTC skew.
  const lower = new Date(`${startKey}T00:00:00`);
  lower.setDate(lower.getDate() - 1);
  const upper = new Date(`${endKey}T23:59:59`);
  upper.setDate(upper.getDate() + 1);

  const q = query(
    collectionGroup(db, "entries"),
    where("uid", "==", uid),
    where("createdAt", ">=", Timestamp.fromDate(lower)),
    where("createdAt", "<=", Timestamp.fromDate(upper)),
  );

  const snap = await readQuery(q, cache);
  if (!snap) return null;
  // Inequality on createdAt means results arrive in createdAt-ascending order,
  // so each day's entries land sorted the same way getDayEntries returned them.
  snap.docs.forEach((docSnap) => {
    // path: users/{uid}/logs/{date}/entries/{entryId}
    const date = docSnap.ref.path.split("/")[3];
    if (date >= startKey && date <= endKey) {
      (results[date] ||= []).push({ id: docSnap.id, ...docSnap.data() });
    }
  });

  return results;
}

// --- User Settings ---

function userDocRef(uid) {
  return doc(db, "users", uid);
}

// Several screens ask for settings at once on start-up (the onboarding check,
// then Today). A server read is shared for a few seconds so they cost one
// round trip, not two.
const SETTINGS_SHARE_MS = 5000;
let settingsRead = null; // { uid, at, promise }

export async function getUserSettings(uid, { cache = false } = {}) {
  if (cache) {
    try {
      const snap = await getDocFromCache(userDocRef(uid));
      return snap.exists() ? snap.data() : null;
    } catch {
      return null;
    }
  }

  if (settingsRead?.uid === uid && Date.now() - settingsRead.at < SETTINGS_SHARE_MS) {
    return settingsRead.promise;
  }
  const promise = getDoc(userDocRef(uid)).then((snap) =>
    // Default settings
    snap.exists() ? snap.data() : { calorieGoal: 2000, displayName: "" },
  );
  settingsRead = { uid, at: Date.now(), promise };
  promise.catch(() => {
    if (settingsRead?.promise === promise) settingsRead = null;
  });
  return promise;
}

export async function setUserSettings(uid, settings) {
  settingsRead = null;
  await setDoc(userDocRef(uid), settings, { merge: true });
}

// --- My Foods ---

// Path: users/{uid}/myFoods/{foodId}
function myFoodsRef(uid) {
  return collection(db, "users", uid, "myFoods");
}

export async function getMyFoods(uid, { cache = false } = {}) {
  const ref = myFoodsRef(uid);
  const q = query(ref, orderBy("name", "asc"));
  return listOf(await readQuery(q, cache));
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

// --- Chat Messages ---
// Path: users/{uid}/chatMessages/{msgId}
// Covered by the existing `users/{uid}/{document=**}` rule — no rules change.

function chatMessagesRef(uid) {
  return collection(db, "users", uid, "chatMessages");
}

// Newest-first from Firestore (that's the only direction an index can give us
// cheaply with a limit), then reversed so callers get chronological order for
// rendering a transcript.
export async function getChatMessages(uid, maxItems = 50) {
  const q = query(
    chatMessagesRef(uid),
    orderBy("createdAt", "desc"),
    limit(maxItems),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
}

export async function addChatMessage(uid, message) {
  const docRef = await addDoc(chatMessagesRef(uid), {
    ...message,
    uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateChatMessage(uid, msgId, data) {
  await updateDoc(doc(db, "users", uid, "chatMessages", msgId), data);
}

export async function clearChatMessages(uid) {
  const snap = await getDocs(chatMessagesRef(uid));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// --- Bulk Food Logging (chat confirm card) ---

// Write a whole confirmed meal at once. Items arrive already portion-scaled by
// mealResolver, so this only maps them onto the entry shape the rest of the app
// reads (same fields HomePage.handleAddFood writes) and fans out the writes.
export async function logFoodItems(uid, date, items, meal) {
  const entries = items.map((item) => ({
    name: item.name,
    brand: item.matchedName && item.matchedName !== item.name ? item.matchedName : "",
    calories: Math.round(item.calories || 0),
    protein: item.protein || 0,
    carbs: item.carbs || 0,
    fat: item.fat || 0,
    fiber: item.fiber || 0,
    meal,
    servingAmount: item.grams || 100,
    servingUnit: "g",
    source: item.source === "database" ? "chat-db" : "chat-ai",
  }));

  const ids = await Promise.all(
    entries.map((entry) => addFoodEntry(uid, date, entry)),
  );
  return entries.map((entry, i) => ({ id: ids[i], ...entry }));
}
