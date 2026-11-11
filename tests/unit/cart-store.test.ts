// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductSummary } from "@/types/catalog";

const product = (id: number, priceCents: number, promotion: ProductSummary["promotion"] = null): ProductSummary => ({
  id,
  barcode: String(3000000000000 + id),
  name: `Produit ${id}`,
  brand: "Marque",
  quantity: "500 g",
  netAmount: 500,
  netUnit: "g",
  category: "pates-riz-feculents",
  subshelf: "pates",
  priceCents,
  isDemoPrice: true,
  promotion,
  image: { src: `/catalog/images/${id}.webp`, width: 300, height: 400, cutout: true, color: "#cc3333" },
  nutriscore: "a",
  organic: false,
});

async function freshStore() {
  vi.resetModules();
  const mod = await import("@/stores/cart");
  await mod.useCartStore.persist.rehydrate();
  return mod;
}

describe("panier", () => {
  beforeEach(() => localStorage.clear());

  it("n'est restauré qu'après le montage (pas d'écart avec le rendu serveur)", async () => {
    vi.resetModules();
    localStorage.setItem("mon-marche:panier", JSON.stringify({ version: 1, state: { lines: { 1: { product: product(1, 100), quantity: 2 } }, order: [1] } }));
    const { useCartStore } = await import("@/stores/cart");
    expect(useCartStore.getState().hydrated).toBe(false);
    expect(useCartStore.getState().lines).toEqual({});
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().hydrated).toBe(true);
    expect(useCartStore.getState().lines[1]!.quantity).toBe(2);
  });

  it("ajoute un produit puis incrémente sa quantité", async () => {
    const { useCartStore, selectTotals } = await freshStore();
    const s = useCartStore.getState();
    expect(s.add(product(1, 199))).toBe(1);
    expect(useCartStore.getState().add(product(1, 199))).toBe(2);
    expect(useCartStore.getState().increment(1)).toBe(3);
    const totals = selectTotals(useCartStore.getState());
    expect(totals).toMatchObject({ itemCount: 3, totalCents: 597 });
  });

  it("supprime la ligne quand la quantité atteint zéro, jamais de quantité négative", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.getState().add(product(2, 250));
    expect(useCartStore.getState().decrement(2)).toBe(0);
    expect(useCartStore.getState().lines[2]).toBeUndefined();
    expect(useCartStore.getState().decrement(2)).toBe(0);
    expect(useCartStore.getState().setQuantity(2, -5)).toBe(0);
    expect(Object.keys(useCartStore.getState().lines)).toHaveLength(0);
  });

  it("plafonne la quantité à 99", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.getState().add(product(3, 100), 150);
    expect(useCartStore.getState().lines[3]!.quantity).toBe(99);
    expect(useCartStore.getState().increment(3)).toBe(99);
  });

  it("tient compte des promotions dans le total", async () => {
    const { useCartStore, selectTotals } = await freshStore();
    useCartStore.getState().add(product(4, 300, { kind: "percent", value: 20, label: "-20 %", isDemo: true }), 2);
    useCartStore.getState().add(product(5, 150));
    expect(selectTotals(useCartStore.getState())).toMatchObject({ subtotalCents: 750, discountCents: 120, totalCents: 630, itemCount: 3 });
  });

  it("supprime une ligne et vide le panier", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.getState().add(product(6, 100));
    useCartStore.getState().add(product(7, 100));
    useCartStore.getState().remove(6);
    expect(useCartStore.getState().order).toEqual([7]);
    useCartStore.getState().clear();
    expect(useCartStore.getState().lines).toEqual({});
  });

  it("persiste le panier et le restaure après actualisation", async () => {
    const first = await freshStore();
    first.useCartStore.getState().add(product(8, 499), 2);
    first.useCartStore.getState().add(product(9, 120));
    const saved = JSON.parse(localStorage.getItem("mon-marche:panier")!);
    expect(saved.state.order).toEqual([8, 9]);

    const second = await freshStore();
    const state = second.useCartStore.getState();
    expect(state.hydrated).toBe(true);
    expect(state.lines[8]!.quantity).toBe(2);
    expect(second.selectTotals(state).totalCents).toBe(1118);
  });

  it("assainit un stockage corrompu ou falsifié", async () => {
    localStorage.setItem(
      "mon-marche:panier",
      JSON.stringify({ version: 1, state: { lines: { 1: { product: product(1, 100), quantity: -4 }, 2: { product: product(2, 100), quantity: 5000 }, 3: { quantity: 2 } }, order: [2, 99] } }),
    );
    const { useCartStore } = await freshStore();
    const state = useCartStore.getState();
    expect(Object.keys(state.lines)).toEqual(["2"]);
    expect(state.lines[2]!.quantity).toBe(99);
    expect(state.order).toEqual([2]);
  });

  it("rafraîchit les prix et retire les produits disparus du catalogue", async () => {
    const { useCartStore } = await freshStore();
    useCartStore.getState().add(product(10, 100));
    useCartStore.getState().add(product(11, 100));
    useCartStore.getState().refreshProducts([product(10, 180)], [11]);
    expect(useCartStore.getState().lines[10]!.product.priceCents).toBe(180);
    expect(useCartStore.getState().lines[11]).toBeUndefined();
  });
});
