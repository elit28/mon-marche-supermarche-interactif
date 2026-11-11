/**
 * Types échangés entre le serveur et le navigateur.
 * Volontairement compacts : une étagère transporte des dizaines de produits.
 */
import type { PromotionKind } from "@/lib/pricing";

export type NutriscoreGrade = "a" | "b" | "c" | "d" | "e";

export interface ProductImageInfo {
  src: string;
  width: number;
  height: number;
  /** Photo détourée (fond transparent). */
  cutout: boolean;
  /** Couleur dominante de l'emballage (effets de lumière). */
  color: string;
}

export interface PromotionInfo {
  kind: PromotionKind;
  value: number;
  label: string;
  isDemo: boolean;
}

/** Résumé d'un produit pour l'affichage en rayon, en panier, en liste. */
export interface ProductSummary {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  netAmount: number | null;
  netUnit: "g" | "ml" | null;
  category: string;
  subshelf: string;
  /** Prix de référence, en centimes. */
  priceCents: number;
  isDemoPrice: boolean;
  promotion: PromotionInfo | null;
  image: ProductImageInfo;
  nutriscore: NutriscoreGrade | null;
  organic: boolean;
}

export interface NutritionFacts {
  per: "100g" | "100ml";
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  proteins: number | null;
  salt: number | null;
}

export interface ProductDetail extends ProductSummary {
  genericName: string | null;
  categoryName: string;
  subshelfName: string;
  novaGroup: number | null;
  ingredientsText: string | null;
  allergens: string[];
  traces: string[];
  nutrition: NutritionFacts | null;
  servingSize: string | null;
  source: {
    name: string;
    url: string;
    license: string;
    lastModifiedAt: string | null;
  };
  imageAttribution: string;
  imageLicense: string;
}

export interface CategorySummary {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  productCount: number;
}

export interface ShelfPage {
  products: ProductSummary[];
  total: number;
  nextOffset: number | null;
}

export interface SearchFacetValue {
  value: string;
  label: string;
  count: number;
}

export type SearchSort = "pertinence" | "prix-asc" | "prix-desc" | "nom" | "nouveautes";

export interface SearchResultGroup {
  category: CategorySummary;
  products: ProductSummary[];
  /** Nombre de résultats dans ce rayon. */
  count: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  sort: SearchSort;
  groups: SearchResultGroup[];
  /** Résultats à plat (tri explicite ou filtres actifs). */
  products: ProductSummary[];
  nextOffset: number | null;
  facets: {
    brands: SearchFacetValue[];
    categories: SearchFacetValue[];
    nutriscore: SearchFacetValue[];
    priceRange: { min: number; max: number } | null;
  };
}
