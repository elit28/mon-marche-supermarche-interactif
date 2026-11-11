/** Libellés français des tags Open Food Facts affichés dans les fiches. */

const ALLERGENS: Record<string, string> = {
  "en:gluten": "Gluten",
  "en:milk": "Lait",
  "en:eggs": "Œufs",
  "en:nuts": "Fruits à coque",
  "en:peanuts": "Arachides",
  "en:soybeans": "Soja",
  "en:fish": "Poisson",
  "en:crustaceans": "Crustacés",
  "en:molluscs": "Mollusques",
  "en:celery": "Céleri",
  "en:mustard": "Moutarde",
  "en:sesame-seeds": "Graines de sésame",
  "en:sulphur-dioxide-and-sulphites": "Sulfites",
  "en:lupin": "Lupin",
};

/** Traduit un tag allergène ; à défaut, rend le tag lisible sans l'inventer. */
export function allergenLabel(tag: string): string {
  if (ALLERGENS[tag]) return ALLERGENS[tag]!;
  const value = tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const NOVA_LABELS: Record<number, string> = {
  1: "Aliments non transformés ou transformés minimalement",
  2: "Ingrédients culinaires transformés",
  3: "Aliments transformés",
  4: "Produits alimentaires et boissons ultra-transformés",
};

export const NUTRIENT_ROWS: Array<{ key: "energyKcal" | "fat" | "saturatedFat" | "carbohydrates" | "sugars" | "fiber" | "proteins" | "salt"; label: string; unit: string; indent?: boolean }> = [
  { key: "energyKcal", label: "Énergie", unit: "kcal" },
  { key: "fat", label: "Matières grasses", unit: "g" },
  { key: "saturatedFat", label: "dont acides gras saturés", unit: "g", indent: true },
  { key: "carbohydrates", label: "Glucides", unit: "g" },
  { key: "sugars", label: "dont sucres", unit: "g", indent: true },
  { key: "fiber", label: "Fibres alimentaires", unit: "g" },
  { key: "proteins", label: "Protéines", unit: "g" },
  { key: "salt", label: "Sel", unit: "g" },
];

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatNutrient(value: number | null, unit: string): string {
  return value === null ? "—" : `${numberFormatter.format(value)} ${unit}`;
}
