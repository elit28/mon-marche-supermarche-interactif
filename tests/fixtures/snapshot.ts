/**
 * Mini-instantané de test : structure identique à data/catalog/products.json.
 * Les valeurs reprennent de vraies fiches (codes-barres valides) pour rester
 * réalistes ; aucune requête réseau n'est effectuée par les tests.
 */
import type { SnapshotFile, SnapshotProduct } from "@/server/catalog/snapshot";

const base = (over: Partial<SnapshotProduct> & Pick<SnapshotProduct, "barcode" | "name" | "category" | "subshelf">): SnapshotProduct => ({
  source: "food",
  sourceUrl: `https://world.openfoodfacts.org/product/${over.barcode}`,
  rawName: over.name,
  genericName: null,
  brand: "Marque",
  brandSlug: "marque",
  rawBrands: "Marque",
  quantityLabel: "500 g",
  netAmount: 500,
  netUnit: "g",
  categoriesTags: [],
  labelsTags: [],
  organic: false,
  nutriscoreGrade: null,
  novaGroup: null,
  ingredientsText: null,
  allergens: [],
  traces: [],
  nutrition: null,
  servingSize: null,
  popularity: 10,
  lastModifiedAt: 1_700_000_000,
  shelfRank: 1,
  qualityScore: 80,
  qualityIssues: [],
  image: {
    path: `/catalog/images/${over.barcode}.webp`,
    originalUrl: `https://images.openfoodfacts.org/images/products/x/front_fr.1.400.jpg`,
    width: 300,
    height: 400,
    isCutout: true,
    backgroundScore: 1,
    dominantColor: "#aa3322",
    uploader: "contributeur",
    license: "CC-BY-SA-3.0",
    attribution: "Photo de contributeur — Open Food Facts, CC BY-SA 3.0",
  },
  ...over,
});

export const fixtureProducts: SnapshotProduct[] = [
  base({
    barcode: "3017620422003",
    name: "Nutella",
    brand: "Ferrero",
    brandSlug: "ferrero",
    quantityLabel: "400 g",
    netAmount: 400,
    category: "petit-dejeuner",
    subshelf: "tartiner",
    nutriscoreGrade: "e",
    ingredientsText: "Sucre, huile de palme, noisettes 13 %",
    allergens: ["en:milk", "en:nuts"],
    nutrition: { per: "100g", energyKcal: 539, fat: 30.9, saturatedFat: 10.6, carbohydrates: 57.5, sugars: 56.3, fiber: null, proteins: 6.3, salt: 0.107 },
    popularity: 800,
  }),
  base({ barcode: "8076800195057", name: "Spaghetti n°5", brand: "Barilla", brandSlug: "barilla", category: "pates-riz-feculents", subshelf: "pates", popularity: 237 }),
  base({ barcode: "8076802085738", name: "Penne Rigate n°73", brand: "Barilla", brandSlug: "barilla", category: "pates-riz-feculents", subshelf: "pates", shelfRank: 2, popularity: 224 }),
  base({ barcode: "3057640117008", name: "Eau minérale naturelle", brand: "Volvic", brandSlug: "volvic", quantityLabel: "1,5 L", netAmount: 1500, netUnit: "ml", category: "boissons-eaux", subshelf: "eaux" }),
];

export function fixtureSnapshot(products: SnapshotProduct[] = fixtureProducts): SnapshotFile {
  return {
    generatedAt: "2026-11-11T00:00:00.000Z",
    license: { data: "ODbL", images: "CC BY-SA", attribution: "test" },
    count: products.length,
    products,
  };
}
