"use client";

/**
 * Panier (Zustand) — source de vérité côté navigateur pour une réactivité
 * immédiate. Persisté dans le stockage local (visiteur invité) et synchronisé
 * avec le serveur en arrière-plan. Le serveur recalcule toujours les prix lors
 * de la commande : rien de ce qui est stocké ici n'est considéré comme fiable.
 */
import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampQuantity, computeCartTotals, type CartTotals } from "@/lib/pricing";
import type { ProductSummary } from "@/types/catalog";

export interface CartLine {
  product: ProductSummary;
  quantity: number;
  addedAt: number;
}

interface CartState {
  lines: Record<number, CartLine>;
  /** Ordre d'ajout (le plus récent en dernier) — utile au panier visuel. */
  order: number[];
  hydrated: boolean;
  add: (product: ProductSummary, quantity?: number) => number;
  setQuantity: (productId: number, quantity: number) => number;
  increment: (productId: number) => number;
  decrement: (productId: number) => number;
  remove: (productId: number) => void;
  clear: () => void;
  /** Remplace les fiches produits (prix à jour) sans toucher aux quantités. */
  refreshProducts: (products: ProductSummary[], missingIds?: number[]) => void;
  /** Remplace entièrement le contenu (restauration depuis le serveur). */
  replaceAll: (lines: Array<{ product: ProductSummary; quantity: number }>) => void;
}

function withoutLine(state: Pick<CartState, "lines" | "order">, productId: number) {
  const { [productId]: _removed, ...lines } = state.lines;
  return { lines, order: state.order.filter((id) => id !== productId) };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: {},
      order: [],
      hydrated: false,
      add: (product, quantity = 1) => {
        const state = get();
        const existing = state.lines[product.id];
        const next = clampQuantity((existing?.quantity ?? 0) + quantity);
        if (next <= 0) {
          set(withoutLine(state, product.id));
          return 0;
        }
        set({
          lines: { ...state.lines, [product.id]: { product, quantity: next, addedAt: existing?.addedAt ?? Date.now() } },
          order: existing ? state.order : [...state.order, product.id],
        });
        return next;
      },
      setQuantity: (productId, quantity) => {
        const line = get().lines[productId];
        if (!line) return 0;
        const next = clampQuantity(quantity);
        if (next <= 0) {
          set((state) => withoutLine(state, productId));
          return 0;
        }
        set((state) => ({ lines: { ...state.lines, [productId]: { ...line, quantity: next } } }));
        return next;
      },
      increment: (productId) => get().setQuantity(productId, (get().lines[productId]?.quantity ?? 0) + 1),
      decrement: (productId) => get().setQuantity(productId, (get().lines[productId]?.quantity ?? 0) - 1),
      remove: (productId) => set((state) => withoutLine(state, productId)),
      clear: () => set({ lines: {}, order: [] }),
      refreshProducts: (products, missingIds = []) =>
        set((state) => {
          const lines = { ...state.lines };
          for (const p of products) if (lines[p.id]) lines[p.id] = { ...lines[p.id]!, product: p };
          for (const id of missingIds) delete lines[id];
          return { lines, order: state.order.filter((id) => lines[id]) };
        }),
      replaceAll: (entries) =>
        set(() => {
          const lines: Record<number, CartLine> = {};
          const order: number[] = [];
          const now = Date.now();
          entries.forEach(({ product, quantity }, i) => {
            const q = clampQuantity(quantity);
            if (q > 0) {
              lines[product.id] = { product, quantity: q, addedAt: now + i };
              order.push(product.id);
            }
          });
          return { lines, order };
        }),
    }),
    {
      name: "mon-marche:panier",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, order: state.order }),
      // Restauration différée (après le premier rendu) : évite tout écart avec le HTML serveur.
      skipHydration: true,
      merge: (persisted, current) => {
        const p = persisted as Partial<CartState> | undefined;
        const lines: Record<number, CartLine> = {};
        for (const [id, line] of Object.entries(p?.lines ?? {})) {
          const q = clampQuantity(line?.quantity ?? 0);
          if (line?.product && q > 0) lines[Number(id)] = { ...line, quantity: q };
        }
        const order = (p?.order ?? []).filter((id) => lines[id]);
        for (const id of Object.keys(lines).map(Number)) if (!order.includes(id)) order.push(id);
        return { ...current, lines, order };
      },
    },
  ),
);

// `persist` est absent côté serveur (pas de localStorage).
useCartStore.persist?.onFinishHydration(() => useCartStore.setState({ hydrated: true }));

/** Totaux calculés à partir des lignes (prix promotionnels inclus). */
export function selectTotals(state: Pick<CartState, "lines">): CartTotals {
  return computeCartTotals(
    Object.values(state.lines).map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      unitPriceCents: l.product.priceCents,
      promotion: l.product.promotion,
    })),
  );
}

export function useCartQuantity(productId: number): number {
  return useCartStore((s) => (s.hydrated ? (s.lines[productId]?.quantity ?? 0) : 0));
}

/** Totaux mémoïsés (le sélecteur renvoie une référence stable : `lines`). */
export function useCartTotals(): CartTotals {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  return useMemo(() => selectTotals({ lines: hydrated ? lines : {} }), [lines, hydrated]);
}

/** Les derniers produits ajoutés (pour le panier visuel). */
export function useLatestCartProducts(count: number): ProductSummary[] {
  const lines = useCartStore((s) => s.lines);
  const order = useCartStore((s) => s.order);
  const hydrated = useCartStore((s) => s.hydrated);
  return useMemo(
    () =>
      hydrated
        ? order
            .slice(-count)
            .map((id) => lines[id]?.product)
            .filter((p): p is ProductSummary => p !== undefined)
        : [],
    [lines, order, hydrated, count],
  );
}
