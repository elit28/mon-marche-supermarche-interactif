/**
 * Format de l'instantané versionné du catalogue (`data/catalog/products.json`).
 * Cet instantané ne contient QUE des données ouvertes (ODbL) normalisées :
 * aucun prix, aucune donnée commerciale.
 */
import type { CategorySlug } from "../../lib/catalog/categories";
import type { NormalizedNutrition } from "./normalize";
import type { OffSite } from "./off-types";

export interface SnapshotImage {
  path: string;
  originalUrl: string;
  width: number;
  height: number;
  isCutout: boolean;
  /** Méthode de détourage : fond uni (géométrique) ou segmentation par IA. */
  cutoutMethod?: "fond-uni" | "ia";
  backgroundScore: number;
  dominantColor: string;
  uploader: string | null;
  license: string;
  attribution: string;
}

export interface SnapshotProduct {
  barcode: string;
  source: OffSite;
  sourceUrl: string;
  name: string;
  rawName: string;
  genericName: string | null;
  brand: string | null;
  brandSlug: string | null;
  rawBrands: string | null;
  quantityLabel: string | null;
  netAmount: number | null;
  netUnit: "g" | "ml" | null;
  category: CategorySlug;
  subshelf: string;
  categoriesTags: string[];
  labelsTags: string[];
  organic: boolean;
  nutriscoreGrade: "a" | "b" | "c" | "d" | "e" | null;
  novaGroup: number | null;
  ingredientsText: string | null;
  allergens: string[];
  traces: string[];
  nutrition: NormalizedNutrition | null;
  servingSize: string | null;
  popularity: number;
  lastModifiedAt: number | null;
  shelfRank: number;
  qualityScore: number;
  qualityIssues: string[];
  image: SnapshotImage;
}

export interface SnapshotFile {
  generatedAt: string;
  license: { data: string; images: string; attribution: string };
  count: number;
  products: SnapshotProduct[];
}
