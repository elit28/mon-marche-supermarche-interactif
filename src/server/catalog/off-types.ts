/**
 * Types minimaux des réponses Open Food Facts (et bases sœurs) utilisées
 * par le pipeline d'import. On ne type que les champs réellement lus.
 */

export type OffSite = "food" | "beauty" | "products" | "petfood";

export const OFF_SITE_HOSTS: Record<OffSite, string> = {
  food: "https://world.openfoodfacts.org",
  beauty: "https://world.openbeautyfacts.org",
  products: "https://world.openproductsfacts.org",
  petfood: "https://world.openpetfoodfacts.org",
};

export const OFF_SITE_LABELS: Record<OffSite, string> = {
  food: "Open Food Facts",
  beauty: "Open Beauty Facts",
  products: "Open Products Facts",
  petfood: "Open Pet Food Facts",
};

export interface OffNutriments {
  "energy-kcal_100g"?: number;
  "energy-kj_100g"?: number;
  fat_100g?: number;
  "saturated-fat_100g"?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
  [key: string]: number | string | undefined;
}

export interface OffImageSizes {
  sizes?: Record<string, { w: number; h: number }>;
  uploader?: string;
  uploaded_t?: number | string;
  imgid?: string | number;
  rev?: string | number;
}

export interface OffProduct {
  code: string;
  product_type?: string;
  product_name?: string;
  product_name_fr?: string;
  generic_name_fr?: string;
  generic_name?: string;
  brands?: string;
  brands_tags?: string[];
  quantity?: string;
  product_quantity?: number | string;
  product_quantity_unit?: string;
  categories_tags?: string[];
  labels_tags?: string[];
  countries_tags?: string[];
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  ingredients_text_fr?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  nutriments?: OffNutriments;
  nutrition_data_per?: string;
  serving_size?: string;
  image_front_url?: string;
  selected_images?: {
    front?: { display?: Record<string, string>; small?: Record<string, string> };
  };
  images?: Record<string, OffImageSizes>;
  last_modified_t?: number;
  unique_scans_n?: number;
  lang?: string;
  lc?: string;
}

export interface OffSearchResponse {
  count?: number;
  page?: number;
  page_size?: number;
  products?: OffProduct[];
}

export interface OffV3ProductResponse {
  code?: string;
  status?: string;
  result?: { id?: string };
  product?: OffProduct;
  errors?: unknown[];
}

/** Champs demandés à la recherche (API v2) — sélection des candidats. */
export const SEARCH_FIELDS = [
  "code",
  "product_type",
  "product_name",
  "product_name_fr",
  "brands",
  "brands_tags",
  "quantity",
  "categories_tags",
  "labels_tags",
  "countries_tags",
  "image_front_url",
  "unique_scans_n",
  "lang",
].join(",");

/** Champs demandés pour la fiche produit (API v3). */
export const PRODUCT_FIELDS = [
  "code",
  "product_type",
  "product_name",
  "product_name_fr",
  "generic_name_fr",
  "brands",
  "brands_tags",
  "quantity",
  "product_quantity",
  "product_quantity_unit",
  "categories_tags",
  "labels_tags",
  "countries_tags",
  "nutriscore_grade",
  "nova_group",
  "ecoscore_grade",
  "ingredients_text_fr",
  "ingredients_text",
  "allergens_tags",
  "traces_tags",
  "nutriments",
  "nutrition_data_per",
  "serving_size",
  "image_front_url",
  "selected_images",
  "images",
  "last_modified_t",
  "unique_scans_n",
  "lang",
].join(",");
