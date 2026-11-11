/** Utilitaires d'affichage d'un produit (sûrs côté navigateur). */
import { applyPromotion, computeUnitPrice, type UnitPrice } from "@/lib/pricing";
import type { ProductSummary } from "@/types/catalog";

export function finalPriceCents(p: Pick<ProductSummary, "priceCents" | "promotion">): number {
  return applyPromotion(p.priceCents, p.promotion);
}

export function unitPriceOf(p: Pick<ProductSummary, "priceCents" | "promotion" | "netAmount" | "netUnit">): UnitPrice | null {
  return computeUnitPrice(finalPriceCents(p), p.netAmount, p.netUnit);
}

/** Libellé complet pour les lecteurs d'écran : « Nutella, Ferrero, 400 g ». */
export function productLabel(p: Pick<ProductSummary, "name" | "brand" | "quantity">): string {
  return [p.name, p.brand, p.quantity].filter(Boolean).join(", ");
}

export function productHref(p: Pick<ProductSummary, "barcode">): string {
  return `/produit/${p.barcode}`;
}

/** Ratio largeur/hauteur borné, pour dimensionner l'emplacement en rayon. */
export function shelfAspect(p: Pick<ProductSummary, "image">): number {
  const ratio = p.image.width / Math.max(1, p.image.height);
  return Math.min(1.75, Math.max(0.42, ratio));
}
