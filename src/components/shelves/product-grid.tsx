"use client";

/** Gondole à plusieurs rangées pour les résultats triés ou filtrés. */
import { useState } from "react";
import type { ProductSummary, SearchResponse } from "@/types/catalog";
import { ProductSlot } from "@/components/products/product-slot";

export function ProductGrid({
  products: initial,
  nextOffset: initialNext,
  apiQuery,
  label,
}: {
  products: ProductSummary[];
  nextOffset: number | null;
  /** Query string de l'API de recherche (sans offset), pour « Charger plus ». */
  apiQuery?: string;
  label: string;
}) {
  const [products, setProducts] = useState(initial);
  const [nextOffset, setNextOffset] = useState(initialNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Nouvelles données serveur (filtres modifiés) : on repart de la première page.
  const [source, setSource] = useState(initial);
  if (initial !== source) {
    setSource(initial);
    setProducts(initial);
    setNextOffset(initialNext);
  }

  async function loadMore() {
    if (nextOffset === null || !apiQuery) return;
    setLoading(true);
    setError(false);
    try {
      const sep = apiQuery.includes("?") ? "&" : "?";
      const res = await fetch(`/api/search${apiQuery}${sep}offset=${nextOffset}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as SearchResponse;
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setNextOffset(data.nextOffset);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ul className="grid-shelves grid grid-cols-[repeat(auto-fill,minmax(9.25rem,1fr))] gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]" aria-label={label}>
        {products.map((p, i) => (
          <ProductSlot key={p.id} product={p} fixedWidth priority={i < 8} />
        ))}
      </ul>
      {nextOffset !== null && apiQuery ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex min-h-12 items-center rounded-full bg-white px-6 font-semibold text-forest-700 shadow-soft ring-1 ring-forest-900/10 hover:bg-forest-700 hover:text-white disabled:opacity-60"
          >
            {loading ? "Chargement…" : "Afficher plus de produits"}
          </button>
          {error ? <p className="text-sm text-tomato-700">Le chargement a échoué. Vérifiez votre connexion et réessayez.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
