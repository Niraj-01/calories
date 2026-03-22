const BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl";

export async function searchFoods(query) {
  if (!query || query.trim().length < 2) return [];

  const params = new URLSearchParams({
    search_terms: query.trim(),
    search_simple: 1,
    action: "process",
    json: 1,
    page_size: 20,
    fields: "product_name,brands,nutriments,image_small_url,serving_size",
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: {
      "User-Agent": "CaloriesTracker/1.0 (personal-use)",
    },
  });

  if (!res.ok) throw new Error("Failed to search foods");

  const data = await res.json();

  return (data.products || [])
    .filter((p) => p.product_name && p.nutriments)
    .map((p) => ({
      name: p.product_name,
      brand: p.brands || "",
      servingSize: p.serving_size || "100g",
      imageUrl: p.image_small_url || null,
      calories: Math.round(
        p.nutriments["energy-kcal_100g"] || p.nutriments["energy-kcal"] || 0,
      ),
      protein:
        Math.round(
          (p.nutriments.proteins_100g || p.nutriments.proteins || 0) * 10,
        ) / 10,
      carbs:
        Math.round(
          (p.nutriments.carbohydrates_100g || p.nutriments.carbohydrates || 0) *
            10,
        ) / 10,
      fat:
        Math.round((p.nutriments.fat_100g || p.nutriments.fat || 0) * 10) / 10,
    }))
    .filter((f) => f.calories > 0);
}

// Debounce helper
export function debounce(fn, delay = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    return new Promise((resolve) => {
      timer = setTimeout(async () => {
        const result = await fn(...args);
        resolve(result);
      }, delay);
    });
  };
}
