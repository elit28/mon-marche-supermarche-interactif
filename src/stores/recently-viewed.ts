"use client";

/** Derniers produits consultés — stockés uniquement sur cet appareil. */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductSummary } from "@/types/catalog";

const MAX_ITEMS = 20;

interface RecentState {
  items: ProductSummary[];
  hydrated: boolean;
  push: (product: ProductSummary) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      push: (product) =>
        set((state) => ({ items: [product, ...state.items.filter((p) => p.id !== product.id)].slice(0, MAX_ITEMS) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "mon-marche:vus-recemment",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
);

useRecentlyViewedStore.persist?.onFinishHydration(() => useRecentlyViewedStore.setState({ hydrated: true }));
