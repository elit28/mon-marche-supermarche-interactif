import { describe, expect, it } from "vitest";
import {
  applyPromotion,
  clampQuantity,
  computeCartTotals,
  computeFee,
  computeLine,
  computeUnitPrice,
  DELIVERY_FEE_CENTS,
  formatPrice,
  formatPromotion,
  FREE_DELIVERY_THRESHOLD_CENTS,
  MAX_QUANTITY_PER_ITEM,
  splitPrice,
} from "@/lib/pricing";

/** Normalise les espaces insécables du format français pour comparer. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("formate en euros avec virgule et symbole €", () => {
    expect(plain(formatPrice(199))).toBe("1,99 €");
    expect(plain(formatPrice(5))).toBe("0,05 €");
    expect(plain(formatPrice(123456))).toBe("1 234,56 €");
  });

  it("refuse les montants non entiers (centimes)", () => {
    expect(() => formatPrice(1.5)).toThrow(TypeError);
  });
});

describe("splitPrice", () => {
  it("sépare euros et centimes pour l'étiquette", () => {
    expect(splitPrice(249)).toEqual({ euros: "2", cents: "49" });
    expect(splitPrice(1005)).toEqual({ euros: "10", cents: "05" });
    expect(splitPrice(0)).toEqual({ euros: "0", cents: "00" });
  });
});

describe("applyPromotion", () => {
  it("applique un pourcentage arrondi au centime", () => {
    expect(applyPromotion(199, { kind: "percent", value: 20 })).toBe(159);
    expect(applyPromotion(333, { kind: "percent", value: 15 })).toBe(283);
  });

  it("applique une remise en montant sans descendre sous 1 centime", () => {
    expect(applyPromotion(250, { kind: "amount", value: 50 })).toBe(200);
    expect(applyPromotion(40, { kind: "amount", value: 100 })).toBe(1);
  });

  it("plafonne le pourcentage à 90 %", () => {
    expect(applyPromotion(1000, { kind: "percent", value: 150 })).toBe(100);
  });

  it("ne change rien sans promotion", () => {
    expect(applyPromotion(199, null)).toBe(199);
  });

  it("formate le libellé", () => {
    expect(formatPromotion({ kind: "percent", value: 30 })).toBe("-30 %");
    expect(plain(formatPromotion({ kind: "amount", value: 50 }))).toBe("-0,50 €");
  });
});

describe("computeUnitPrice", () => {
  it("calcule le prix au kilo", () => {
    expect(computeUnitPrice(399, 400, "g")).toMatchObject({ cents: 998, unit: "kg" });
  });

  it("calcule le prix au litre", () => {
    expect(computeUnitPrice(150, 1500, "ml")).toMatchObject({ cents: 100, unit: "L" });
  });

  it("renvoie null si le format est inconnu", () => {
    expect(computeUnitPrice(199, null, null)).toBeNull();
    expect(computeUnitPrice(199, 0, "g")).toBeNull();
  });
});

describe("clampQuantity", () => {
  it("borne les quantités entre 0 et le maximum", () => {
    expect(clampQuantity(-3)).toBe(0);
    expect(clampQuantity(2.7)).toBe(2);
    expect(clampQuantity(500)).toBe(MAX_QUANTITY_PER_ITEM);
    expect(clampQuantity(Number.NaN)).toBe(0);
  });
});

describe("computeCartTotals", () => {
  it("additionne sous-total, remises et total en centimes exacts", () => {
    const totals = computeCartTotals([
      { productId: 1, quantity: 3, unitPriceCents: 199 },
      { productId: 2, quantity: 2, unitPriceCents: 250, promotion: { kind: "percent", value: 20 } },
      { productId: 3, quantity: 1, unitPriceCents: 1 },
    ]);
    expect(totals.itemCount).toBe(6);
    expect(totals.lineCount).toBe(3);
    expect(totals.subtotalCents).toBe(597 + 500 + 1);
    expect(totals.discountCents).toBe(100);
    expect(totals.totalCents).toBe(998);
  });

  it("n'accumule aucune erreur d'arrondi sur de grands paniers", () => {
    const lines = Array.from({ length: 100 }, (_, i) => ({ productId: i + 1, quantity: 3, unitPriceCents: 10 }));
    expect(computeCartTotals(lines).totalCents).toBe(3000);
  });

  it("ignore les lignes à quantité nulle ou négative", () => {
    const totals = computeCartTotals([
      { productId: 1, quantity: 0, unitPriceCents: 199 },
      { productId: 2, quantity: -2, unitPriceCents: 199 },
    ]);
    expect(totals).toMatchObject({ itemCount: 0, lineCount: 0, totalCents: 0 });
  });

  it("calcule une ligne", () => {
    expect(computeLine({ productId: 1, quantity: 2, unitPriceCents: 300, promotion: { kind: "amount", value: 50 } })).toMatchObject({
      finalUnitPriceCents: 250,
      subtotalCents: 600,
      discountCents: 100,
      totalCents: 500,
    });
  });
});

describe("computeFee", () => {
  it("livraison offerte au-delà du seuil, payante en dessous, retrait gratuit", () => {
    expect(computeFee(FREE_DELIVERY_THRESHOLD_CENTS, "delivery")).toBe(0);
    expect(computeFee(FREE_DELIVERY_THRESHOLD_CENTS - 1, "delivery")).toBe(DELIVERY_FEE_CENTS);
    expect(computeFee(100, "pickup")).toBe(0);
    expect(computeFee(0, "delivery")).toBe(0);
  });
});
