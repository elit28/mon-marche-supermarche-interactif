/**
 * Score qualité d'une fiche (0–100) et anomalies détectées.
 * Sert à choisir les fiches les plus présentables pour les étagères et à
 * signaler les fiches incomplètes dans l'administration.
 */
import type { NormalizedProduct } from "./normalize";

export interface ImageQualityInput {
  isCutout: boolean;
  backgroundScore: number;
  sourceWidth: number;
  sourceHeight: number;
}

export type QualityIssue =
  | "image_not_cutout"
  | "image_busy_background"
  | "image_low_resolution"
  | "missing_quantity"
  | "missing_nutrition"
  | "missing_ingredients"
  | "missing_nutriscore"
  | "missing_brand";

export const QUALITY_ISSUE_LABELS: Record<QualityIssue, string> = {
  image_not_cutout: "Photo non détourée",
  image_busy_background: "Photo prise en situation (fond chargé)",
  image_low_resolution: "Photo de faible résolution",
  missing_quantity: "Format / quantité absent",
  missing_nutrition: "Valeurs nutritionnelles absentes",
  missing_ingredients: "Ingrédients absents",
  missing_nutriscore: "Nutri-Score absent",
  missing_brand: "Marque absente",
};

/** Un fond « chargé » : photo prise en main, en rayon, sur une table… */
export function isBusyBackground(image: Pick<ImageQualityInput, "isCutout" | "backgroundScore">): boolean {
  return !image.isCutout && image.backgroundScore < 0.45;
}

export function computeQuality(
  product: Pick<NormalizedProduct, "site" | "quantityLabel" | "nutrition" | "ingredientsText" | "nutriscoreGrade" | "brand" | "popularity">,
  image: ImageQualityInput,
): { score: number; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  let score = 0;

  if (image.isCutout) score += 45;
  else {
    issues.push("image_not_cutout");
    if (isBusyBackground(image)) issues.push("image_busy_background");
    else score += 25;
  }
  score += Math.round(image.backgroundScore * 12);
  if (Math.max(image.sourceWidth, image.sourceHeight) < 400) {
    issues.push("image_low_resolution");
    score -= 12;
  }

  score += Math.min(18, Math.round(Math.log10(1 + product.popularity) * 6));

  if (product.quantityLabel) score += 6;
  else issues.push("missing_quantity");
  if (!product.brand) issues.push("missing_brand");

  if (product.site === "food") {
    if (product.nutrition) score += 5;
    else issues.push("missing_nutrition");
    if (product.ingredientsText) score += 3;
    else issues.push("missing_ingredients");
    if (product.nutriscoreGrade) score += 3;
    else issues.push("missing_nutriscore");
  } else {
    score += 8;
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}
