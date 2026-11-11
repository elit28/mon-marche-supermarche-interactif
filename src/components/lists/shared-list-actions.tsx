"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { BasketIcon, ListIcon } from "@/components/ui/icons";

export function SharedListActions({ token, products }: { token: string; products: Array<{ product: ProductSummary; quantity: number }> }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const openCart = useUiStore((s) => s.openCart);
  const announce = useUiStore((s) => s.announce);
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        disabled={products.length === 0}
        onClick={() => {
          const store = useCartStore.getState();
          products.forEach(({ product, quantity }) => store.add(product, quantity));
          announce("Les produits de la liste ont été ajoutés au panier.");
          openCart();
        }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest-700 px-5 font-semibold text-white disabled:opacity-40"
      >
        <BasketIcon size={19} /> Tout mettre au panier
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const res = await fetch("/api/lists/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
          const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
          setBusy(false);
          if (res.ok && data.id) router.push(`/listes/${data.id}`);
          else setError(data.error ?? "La copie a échoué.");
        }}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-forest-700 ring-1 ring-forest-900/12"
      >
        <ListIcon size={19} /> Copier dans mes listes
      </button>
      {error ? (
        <p role="alert" className="text-sm text-tomato-700 sm:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}
