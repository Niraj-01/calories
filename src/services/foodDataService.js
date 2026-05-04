import localFoods from "@/food_database.json";

const OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product/";
const OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";

const LOCAL_FOODS = Array.isArray(localFoods?.foods)
  ? localFoods.foods
  : Array.isArray(localFoods)
    ? localFoods
    : [];

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `food-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function scoreMatch(name, query) {
  const a = name.toLowerCase();
  const b = query.toLowerCase();
  if (!a || !b) return 0;

  if (a.includes(b)) return Math.min(1, b.length / a.length);
  if (b.includes(a)) return Math.min(1, a.length / b.length);

  const aWords = new Set(a.split(/\s+/));
  const bWords = new Set(b.split(/\s+/));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = aWords.size + bWords.size - intersection || 1;
  return intersection / union;
}

export function scaleMacros(per100g, grams) {
  const ratio = grams / 100;
  return {
    calories: Math.round(per100g.calories * ratio),
    protein: Math.round(per100g.protein * ratio * 10) / 10,
    carbs: Math.round(per100g.carbs * ratio * 10) / 10,
    fat: Math.round(per100g.fat * ratio * 10) / 10,
    fiber: Math.round((per100g.fiber ?? 0) * ratio * 10) / 10,
  };
}

function normalizeLocalFood(item) {
  const per100g = {
    calories: toNumber(item.per_100g?.calories),
    protein: toNumber(item.per_100g?.protein),
    carbs: toNumber(item.per_100g?.carbs),
    fat: toNumber(item.per_100g?.fat),
    fiber: toNumber(item.per_100g?.fiber),
    sugar: toNumber(item.per_100g?.sugar),
    sodium_mg: toNumber(item.per_100g?.sodium_mg),
  };

  const common_servings =
    item.common_servings?.map((s) => ({
      label: s.label || `${s.grams}g`,
      grams: toNumber(s.grams),
      calories: toNumber(s.calories),
      protein: toNumber(s.protein),
      carbs: toNumber(s.carbs),
      fat: toNumber(s.fat),
      fiber: toNumber(s.fiber),
    })) || [];

  return {
    id: String(item.id ?? item.barcode ?? generateId()),
    name: item.name,
    brand: item.brand || null,
    source: "local",
    category: item.category || null,
    state: item.state || null,
    diet_goal: Array.isArray(item.diet_goal) ? item.diet_goal : [],
    per_100g: per100g,
    common_servings,
  };
}

function parseServingSize(str) {
  if (!str) return null;
  const match = String(str).match(/([0-9]+(?:\.[0-9]+)?)\s*(g|ml)?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value; // treat ml ~= g for our purposes
}

function buildDefaultServings(per100g) {
  const gramsList = [100, 50, 200, 250];
  return gramsList.map((g) => {
    const scaled = scaleMacros(per100g, g);
    return {
      label: `${g}g`,
      grams: g,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      fiber: scaled.fiber,
    };
  });
}

function normalizeOFFProduct(product, fallbackId) {
  const nutriments = product?.nutriments || {};
  const per100g = {
    calories: toNumber(
      nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? 0,
    ),
    protein: toNumber(nutriments.proteins_100g),
    carbs: toNumber(nutriments.carbohydrates_100g),
    fat: toNumber(nutriments.fat_100g),
    fiber: toNumber(nutriments.fiber_100g),
    sugar: toNumber(nutriments.sugars_100g),
    sodium_mg: toNumber(nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : 0),
  };

  const servingGrams = parseServingSize(product?.serving_size);
  const common_servings = [];
  if (servingGrams) {
    const scaled = scaleMacros(per100g, servingGrams);
    common_servings.push({
      label: product.serving_size,
      grams: servingGrams,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      fiber: scaled.fiber,
    });
  }
  common_servings.push(...buildDefaultServings(per100g));

  const brand = product?.brands
    ? product.brands.split(",")[0].trim() || null
    : null;

  return {
    id: String(product?.code || fallbackId || generateId()),
    name: product?.product_name || "Unknown product",
    brand,
    source: "open_food_facts",
    category: product?.categories_tags?.[0]?.replace("en:", "") || null,
    state: product?.states_tags?.[0]?.replace("en:", "") || null,
    diet_goal: [],
    per_100g: per100g,
    common_servings,
  };
}

async function fetchOpenFoodFactsByBarcode(barcode) {
  const res = await fetch(
    `${OFF_PRODUCT_URL}${encodeURIComponent(barcode)}.json?fields=product_name,brands,nutriments,serving_size,categories_tags,states_tags,code`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return normalizeOFFProduct(data.product, barcode);
}

async function fetchOpenFoodFactsSearch(query) {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "10",
      fields:
        "product_name,brands,nutriments,serving_size,image_url,code,categories_tags,states_tags",
    });
    const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`OFF search ${res.status}`);
    const data = await res.json();
    return (data.products || [])
      .filter((p) => p.product_name && p.nutriments)
      .map((p) => normalizeOFFProduct(p, p.code));
  } catch (err) {
    console.warn("OpenFoodFacts search failed:", err);
    return [];
  }
}

function searchLocal(query) {
  const scored = LOCAL_FOODS
    .map((item) => {
      const score = scoreMatch(item.name || "", query);
      return { item, score };
    })
    .filter((x) => x.score > 0.4)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ item }) => normalizeLocalFood(item));
}

function findLocalByBarcode(barcode) {
  const match = LOCAL_FOODS.find(
    (f) => f.barcode && String(f.barcode) === String(barcode),
  );
  return match ? normalizeLocalFood(match) : null;
}

export async function resolveFood(query, { type }) {
  const trimmed = query?.trim();
  if (!trimmed) return null;

  if (type === "barcode") {
    const localHit = findLocalByBarcode(trimmed);
    if (localHit) return [localHit];

    const off = await fetchOpenFoodFactsByBarcode(trimmed);
    return off ? [off] : null;
  }

  // search
  const localResults = searchLocal(trimmed);
  if (localResults.length > 0) return localResults;

  const offResults = await fetchOpenFoodFactsSearch(trimmed);
  return offResults.length > 0 ? offResults : null;
}
