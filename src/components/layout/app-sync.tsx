"use client";

/**
 * Synchronisation discrète navigateur ↔ serveur :
 * - panier : restauré depuis le serveur si l'appareil n'en a pas, puis
 *   sauvegardé après chaque modification (anti-rebond) ;
 * - prix : les fiches du panier sont rafraîchies (prix et promotions à jour,
 *   produits retirés du catalogue supprimés) ;
 * - favoris : union des favoris locaux et serveur.
 */
import { useEffect } from "react";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";
import type { ProductSummary } from "@/types/catalog";

interface ServerCart {
  items: Array<{ product: ProductSummary; quantity: number }>;
}

function waitForHydration(store: { getState: () => { hydrated: boolean }; subscribe: (fn: () => void) => () => void }): Promise<void> {
  if (store.getState().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe(() => {
      if (store.getState().hydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
}

export function AppSync() {
  useEffect(() => {
    // Restauration des données de l'appareil, après le premier rendu.
    void useCartStore.persist.rehydrate();
    void useFavoritesStore.persist.rehydrate();
    void useRecentlyViewedStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let unsubscribe: (() => void) | undefined;

    const pushCart = () => {
      const { lines } = useCartStore.getState();
      const items = Object.values(lines).map((l) => ({ productId: l.product.id, quantity: l.quantity }));
      void fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
        keepalive: true,
      }).catch(() => {});
    };

    (async () => {
      await waitForHydration(useCartStore);
      if (cancelled) return;
      try {
        const local = useCartStore.getState();
        const localIds = Object.keys(local.lines).map(Number);
        if (localIds.length === 0) {
          const res = await fetch("/api/cart");
          if (res.ok) {
            const server = (await res.json()) as ServerCart;
            if (!cancelled && server.items.length > 0 && Object.keys(useCartStore.getState().lines).length === 0) {
              useCartStore.getState().replaceAll(server.items);
            }
          }
        } else {
          const res = await fetch(`/api/products?ids=${localIds.join(",")}`);
          if (res.ok) {
            const { products } = (await res.json()) as { products: ProductSummary[] };
            const found = new Set(products.map((p) => p.id));
            if (!cancelled) useCartStore.getState().refreshProducts(products, localIds.filter((id) => !found.has(id)));
          }
          pushCart();
        }
      } catch {
        // Hors ligne : le panier local reste pleinement fonctionnel.
      }
      unsubscribe = useCartStore.subscribe((state, prev) => {
        if (state.lines === prev.lines) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(pushCart, 700);
      });
    })();

    (async () => {
      await waitForHydration(useFavoritesStore);
      try {
        const res = await fetch("/api/favorites");
        if (!res.ok || cancelled) return;
        const { products } = (await res.json()) as { products: ProductSummary[] };
        const local = useFavoritesStore.getState().items;
        useFavoritesStore.getState().merge(products);
        const serverIds = new Set(products.map((p) => p.id));
        const missing = Object.keys(local).map(Number).filter((id) => !serverIds.has(id));
        if (missing.length > 0) {
          await fetch("/api/favorites", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [...serverIds, ...missing] }),
          });
        }
      } catch {
        // Ignoré : nouvelle tentative au prochain chargement.
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  return null;
}
