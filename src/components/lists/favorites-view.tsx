"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFavoritesStore } from "@/stores/favorites";
import { useCartActions } from "@/components/cart/add-to-cart";
import { ProductGrid } from "@/components/shelves/product-grid";
import { BasketIcon, HeartIcon } from "@/components/ui/icons";

export function FavoritesView() {
  const items = useFavoritesStore((s) => s.items);
  const hydrated = useFavoritesStore((s) => s.hydrated);
  const products = useMemo(() => Object.values(items).sort((a, b) => a.name.localeCompare(b.name, "fr")), [items]);
  const actions = useCartActions();

  if (!hydrated) return <div className="skeleton mt-8 h-64 rounded-3xl" />;
  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-tomato-50 text-tomato-600">
          <HeartIcon size={34} />
        </span>
        <p className="mt-4 font-display text-2xl font-semibold">Aucun favori pour l’instant</p>
        <p className="mt-2 text-ink-soft">Touchez le cœur d’un produit (au survol en rayon, ou dans sa fiche) pour le retrouver ici.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
          Parcourir les rayons
        </Link>
      </div>
    );
  }
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-ink-soft">{products.length} produit{products.length > 1 ? "s" : ""}</p>
        <button
          type="button"
          onClick={() => products.forEach((p) => actions.increment(p))}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest-700 px-5 text-sm font-semibold text-white hover:bg-forest-800"
        >
          <BasketIcon size={18} /> Tout ajouter au panier
        </button>
      </div>
      <div className="-mx-2 mt-6 sm:mx-0">
        <ProductGrid products={products} nextOffset={null} label="Mes favoris" />
      </div>
    </>
  );
}
