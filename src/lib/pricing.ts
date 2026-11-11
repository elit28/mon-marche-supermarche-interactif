/**
 * Calculs de prix — module pur, partagé entre le navigateur (affichage
 * instantané) et le serveur (validation des commandes de démonstration).
 *
 * Tous les montants sont des ENTIERS en centimes d'euro : aucune erreur
 * d'arrondi flottant ne peut s'accumuler dans un panier.
 */

export type PromotionKind = "percent" | "amount";

export interface PromotionInput {
  kind: PromotionKind;
  /** Pourcentage (1–90) ou remise unitaire en centimes. */
  value: number;
}

/** Livraison offerte à partir de ce montant (prix de démonstration). */
export const FREE_DELIVERY_THRESHOLD_CENTS = 5_000;
/** Frais de livraison fictifs sous le seuil. */
export const DELIVERY_FEE_CENTS = 490;
/** Quantité maximale par article (cohérente avec la contrainte en base). */
export const MAX_QUANTITY_PER_ITEM = 99;

const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function assertCents(cents: number): void {
  if (!Number.isInteger(cents)) throw new TypeError(`Montant non entier en centimes : ${cents}`);
}

/** « 1 234,50 € » (espaces insécables du format français). */
export function formatPrice(cents: number): string {
  assertCents(cents);
  return euroFormatter.format(cents / 100);
}

/** Découpe un prix pour l'affichage d'étiquette : « 2 » et « 49 ». */
export function splitPrice(cents: number): { euros: string; cents: string } {
  assertCents(cents);
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  return {
    euros: `${cents < 0 ? "-" : ""}${new Intl.NumberFormat("fr-FR").format(euros)}`,
    cents: String(abs % 100).padStart(2, "0"),
  };
}

/** Prix unitaire après promotion (jamais inférieur à 1 centime). */
export function applyPromotion(priceCents: number, promotion: PromotionInput | null | undefined): number {
  assertCents(priceCents);
  if (!promotion) return priceCents;
  let discounted = priceCents;
  if (promotion.kind === "percent") {
    const pct = Math.min(90, Math.max(0, promotion.value));
    discounted = priceCents - Math.round((priceCents * pct) / 100);
  } else {
    discounted = priceCents - Math.max(0, Math.round(promotion.value));
  }
  return Math.max(1, discounted);
}

/** Libellé court d'une promotion : « -20 % » ou « -0,50 € ». */
export function formatPromotion(promotion: PromotionInput): string {
  if (promotion.kind === "percent") return `-${promotion.value} %`;
  return `-${formatPrice(promotion.value)}`;
}

export interface UnitPrice {
  /** Prix ramené au kilo ou au litre, en centimes. */
  cents: number;
  unit: "kg" | "L";
  label: string;
}

/**
 * Prix au kilo / au litre (mention obligatoire en magasin en France).
 * `netAmount` est exprimé en grammes ou millilitres.
 */
export function computeUnitPrice(priceCents: number, netAmount: number | null | undefined, netUnit: "g" | "ml" | null | undefined): UnitPrice | null {
  if (!netAmount || !netUnit || netAmount <= 0) return null;
  const cents = Math.round((priceCents * 1000) / netAmount);
  if (!Number.isFinite(cents) || cents <= 0) return null;
  const unit = netUnit === "g" ? "kg" : "L";
  return { cents, unit, label: `${formatPrice(cents)}/${unit}` };
}

export interface PricedLine {
  productId: number;
  quantity: number;
  /** Prix de référence (avant promotion), en centimes. */
  unitPriceCents: number;
  promotion?: PromotionInput | null;
}

export interface LineTotals {
  productId: number;
  quantity: number;
  unitPriceCents: number;
  finalUnitPriceCents: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface CartTotals {
  itemCount: number;
  lineCount: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  lines: LineTotals[];
}

/** Normalise une quantité saisie : entier entre 0 et MAX_QUANTITY_PER_ITEM. */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(MAX_QUANTITY_PER_ITEM, Math.max(0, Math.trunc(quantity)));
}

export function computeLine(line: PricedLine): LineTotals {
  const quantity = clampQuantity(line.quantity);
  const finalUnit = applyPromotion(line.unitPriceCents, line.promotion);
  const subtotal = line.unitPriceCents * quantity;
  const total = finalUnit * quantity;
  return {
    productId: line.productId,
    quantity,
    unitPriceCents: line.unitPriceCents,
    finalUnitPriceCents: finalUnit,
    subtotalCents: subtotal,
    discountCents: subtotal - total,
    totalCents: total,
  };
}

export function computeCartTotals(lines: readonly PricedLine[]): CartTotals {
  const computed = lines.map(computeLine).filter((l) => l.quantity > 0);
  return {
    itemCount: computed.reduce((s, l) => s + l.quantity, 0),
    lineCount: computed.length,
    subtotalCents: computed.reduce((s, l) => s + l.subtotalCents, 0),
    discountCents: computed.reduce((s, l) => s + l.discountCents, 0),
    totalCents: computed.reduce((s, l) => s + l.totalCents, 0),
    lines: computed,
  };
}

export type Fulfillment = "delivery" | "pickup";

/** Frais fictifs : retrait gratuit, livraison offerte au-delà du seuil. */
export function computeFee(totalCents: number, fulfillment: Fulfillment): number {
  if (fulfillment === "pickup" || totalCents === 0) return 0;
  return totalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;
}
