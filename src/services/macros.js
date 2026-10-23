// Scale per-100g macros to a serving. Lives on its own (re-exported from
// foodDataService) so screens that only need the math — Today, chiefly — don't
// pull the bundled food database into their initial JavaScript.
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
