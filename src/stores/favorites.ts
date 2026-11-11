"use client";

/**
 * Favoris : persistés localement (affichage instantané) et synchronisés avec
 * le serveur (filtre « Produits favoris » de la recherche, autres onglets).
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductSummary } from "@/types/catalog";

interface FavoritesState {
  items: Record<number, ProductSummary>;
  hydrated: boolean;
  toggle: (product: ProductSummary) => boolean;
  remove: (productId: number) => void;
  merge: (products: ProductSummary[]) => void;
}

async function sync(method: "POST" | "DELETE", productId: number) {
  try {
    await fetch("/api/favorites", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
      keepalive: true,
    });
  } catch {
    // Hors ligne : la synchronisation reprendra au prochain chargement.
  }
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: {},
      hydrated: false,
      toggle: (product) => {
        const isFavorite = Boolean(get().items[product.id]);
        if (isFavorite) {
          get().remove(product.id);
          return false;
        }
        set((state) => ({ items: { ...state.items, [product.id]: product } }));
        void sync("POST", product.id);
        return true;
      },
      remove: (productId) => {
        set((state) => {
          const { [productId]: _removed, ...items } = state.items;
          return { items };
        });
        void sync("DELETE", productId);
      },
      merge: (products) =>
        set((state) => {
          const items = { ...state.items };
          for (const p of products) items[p.id] = p;
          return { items };
        }),
    }),
    {
      name: "mon-marche:favoris",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
);

useFavoritesStore.persist?.onFinishHydration(() => useFavoritesStore.setState({ hydrated: true }));

export function useIsFavorite(productId: number): boolean {
  return useFavoritesStore((s) => s.hydrated && Boolean(s.items[productId]));
}
