/**
 * Hybrid nutrition resolution for chat-parsed meal items.
 * ----------------------------------------------------------------------------
 * Gemini gives us both the portion breakdown AND its own per-100g estimate for
 * each food. That estimate is a decent fallback but it is still a guess, so
 * before trusting it we try to ground each item in real data:
 *
 *   1. food_database.json      (bundled, ~75 foods, western-leaning)
 *   2. public/indian-foods.json (~20 staples — roti, dal, rice, idli…)
 *   3. Open Food Facts          (packaged goods, network, strictly bounded)
 *   4. Gemini's own estimate    (whatever is left — most home-cooked food)
 *
 * A match only wins if it scores high enough to plausibly BE the food the user
 * named; a loose match is worse than the model's estimate, not better. Every
 * item carries the `source` it ended up with so the UI can show the user which
 * numbers are grounded and which are guesses.
 *
 * All items resolve in parallel, so total latency is the slowest single lookup
 * rather than the sum.
 */

import { scaleMacros, searchLocalScored, scoreMatch } from "./foodDataService";
import { loadIndianFoodsDB } from "./nutritionService";

// Below this a name match is too loose to be considered the same food —
// "chai" vs "Chapati" should never resolve. Deliberately stricter than the 0.4
// used for search-as-you-type, where showing a weak guess costs nothing.
const MATCH_THRESHOLD = 0.75;

// Open Food Facts is slow and packaged-goods heavy. It gets one short shot and
// only for items the local databases missed.
const OFF_TIMEOUT_MS = 2500;
const OFF_THRESHOLD = 0.8;

export const SOURCE_DATABASE = "database";
export const SOURCE_AI = "ai-estimate";

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// indian-foods.json stores flat per-100g macros and carries no fiber field.
function indianFoodPer100g(food) {
  return {
    calories: num(food.calories),
    protein: num(food.protein),
    carbs: num(food.carbs),
    fat: num(food.fat),
    fiber: num(food.fiber),
  };
}

function bestLocalMatch(query) {
  const [top] = searchLocalScored(query);
  if (!top || top.score < MATCH_THRESHOLD) return null;
  return {
    per100g: top.food.per_100g,
    matchedName: top.food.name,
    score: top.score,
  };
}

async function bestIndianMatch(query) {
  let foods;
  try {
    foods = await loadIndianFoodsDB();
  } catch {
    return null; // the file failed to load — not fatal, other sources remain
  }

  let best = null;
  for (const food of foods) {
    const score = scoreMatch(food.name || "", query);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { per100g: indianFoodPer100g(food), matchedName: food.name, score };
    }
  }
  return best;
}

async function bestOffMatch(query) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    // Goes through our own proxy route, which already handles OFF's quirks.
    const res = await fetch(`/api/off?action=search&q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    let best = null;
    for (const product of data?.products || []) {
      const name = product?.product_name;
      const kcal =
        product?.nutriments?.["energy-kcal_100g"] ??
        product?.nutriments?.["energy-kcal"];
      if (!name || !kcal) continue;

      const score = scoreMatch(name, query);
      if (score >= OFF_THRESHOLD && (!best || score > best.score)) {
        best = {
          per100g: {
            calories: num(kcal),
            protein: num(product.nutriments.proteins_100g),
            carbs: num(product.nutriments.carbohydrates_100g),
            fat: num(product.nutriments.fat_100g),
            fiber: num(product.nutriments.fiber_100g),
          },
          matchedName: name,
          score,
        };
      }
    }
    return best;
  } catch {
    return null; // timeout, offline, or malformed — fall through to the estimate
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve one parsed item to final, portion-scaled nutrition.
 * Never throws — a failure anywhere degrades to the AI estimate.
 */
export async function resolveItem(item) {
  const query = (item.query || item.name || "").trim();
  let match = null;

  if (query) {
    // Local lookups are synchronous-ish and free, so try both and take the
    // stronger of the two rather than short-circuiting on the first hit.
    const [local, indian] = await Promise.all([
      Promise.resolve(bestLocalMatch(query)).catch(() => null),
      bestIndianMatch(query).catch(() => null),
    ]);

    match = [local, indian]
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)[0] || null;

    // Only reach for the network when nothing local came close.
    if (!match) {
      match = await bestOffMatch(query);
    }
  }

  // A database hit with no calories is not usable data — prefer the estimate.
  const usable = match && match.per100g.calories > 0;

  const per100g = usable ? match.per100g : item.per100g;
  // Indian DB rows carry no fiber; borrow the model's figure rather than
  // silently reporting zero.
  const merged = {
    ...per100g,
    fiber: per100g.fiber || item.per100g?.fiber || 0,
  };

  const grams = num(item.grams, 100) || 100;
  const scaled = scaleMacros(merged, grams);

  return {
    name: item.name,
    query,
    quantity: num(item.quantity, 1) || 1,
    unit: item.unit || "serving",
    grams,
    per100g: merged,
    ...scaled,
    confidence: item.confidence || "medium",
    source: usable ? SOURCE_DATABASE : SOURCE_AI,
    matchedName: usable ? match.matchedName : null,
  };
}

/** Resolve every parsed item in parallel. */
export async function resolveMealItems(items = []) {
  return Promise.all(items.map((item) => resolveItem(item)));
}

/** Sum the macros of a resolved item list — used for the card's total row. */
export function totalsFor(items = []) {
  return items.reduce(
    (acc, i) => ({
      calories: acc.calories + num(i.calories),
      protein: Math.round((acc.protein + num(i.protein)) * 10) / 10,
      carbs: Math.round((acc.carbs + num(i.carbs)) * 10) / 10,
      fat: Math.round((acc.fat + num(i.fat)) * 10) / 10,
      fiber: Math.round((acc.fiber + num(i.fiber)) * 10) / 10,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );
}

/**
 * Re-scale an already-resolved item to a new portion size. Used when the user
 * edits a quantity on the confirm card — the per-100g basis is unchanged, only
 * the portion moves, so this is instant and needs no network.
 */
export function rescaleItem(item, newGrams) {
  const grams = Math.max(1, num(newGrams, item.grams) || item.grams);
  return { ...item, grams, ...scaleMacros(item.per100g, grams) };
}
