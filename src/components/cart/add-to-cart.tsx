"use client";

/**
 * Bouton « + » qui se transforme en compteur « − n + ».
 * L'état du panier est mis à jour immédiatement ; l'animation suit.
 */
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { flyToCart } from "@/lib/fly-to-cart";
import { MAX_QUANTITY_PER_ITEM, formatPrice } from "@/lib/pricing";
import { finalPriceCents } from "@/lib/product";
import { selectTotals, useCartQuantity, useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

export function useCartActions() {
  const announce = useUiStore((s) => s.announce);
  const bump = useUiStore((s) => s.bumpBasket);

  function summary(): string {
    const totals = selectTotals(useCartStore.getState());
    return `${totals.itemCount} article${totals.itemCount > 1 ? "s" : ""}, total ${formatPrice(totals.totalCents)}.`;
  }

  return {
    add(product: ProductSummary, image?: HTMLImageElement | null) {
      const q = useCartStore.getState().add(product, 1);
      announce(`${product.name} ajouté au panier (quantité ${q}). ${summary()}`);
      if (image !== undefined) flyToCart(image, bump);
      else bump();
    },
    increment(product: ProductSummary) {
      const q = useCartStore.getState().add(product, 1);
      announce(`${product.name} : quantité ${q}. ${summary()}`);
    },
    decrement(product: ProductSummary) {
      const q = useCartStore.getState().decrement(product.id);
      announce(q > 0 ? `${product.name} : quantité ${q}. ${summary()}` : `${product.name} retiré du panier. ${summary()}`);
    },
    remove(product: ProductSummary) {
      useCartStore.getState().remove(product.id);
      announce(`${product.name} retiré du panier. ${summary()}`);
    },
  };
}

interface AddToCartProps {
  product: ProductSummary;
  /** `overlay` : sur l'emballage en rayon ; `inline` : fiche produit, listes. */
  variant?: "overlay" | "inline";
  className?: string;
}

export function AddToCart({ product, variant = "overlay", className }: AddToCartProps) {
  const quantity = useCartQuantity(product.id);
  const actions = useCartActions();
  const rootRef = useRef<HTMLDivElement>(null);
  const label = product.name + (product.quantity ? `, ${product.quantity}` : "");

  const findImage = () =>
    rootRef.current?.closest("[data-slot]")?.querySelector<HTMLImageElement>("img[data-product-image]") ?? null;

  if (quantity === 0) {
    return (
      <div ref={rootRef} className={className}>
        <button
          type="button"
          onClick={() => actions.add(product, findImage())}
          aria-label={`Ajouter ${label} au panier, ${formatPrice(finalPriceCents(product))}`}
          className={cn(
            "group/add grid place-items-center rounded-full transition-[transform,background-color,box-shadow] duration-200 active:scale-90",
            variant === "overlay"
              ? "size-10 bg-white text-forest-700 shadow-[0_2px_10px_-2px_rgb(15_61_34/0.35)] ring-1 ring-forest-900/10 hover:bg-forest-700 hover:text-white"
              : "h-12 w-full gap-2 bg-forest-700 px-5 text-base font-semibold text-white shadow-soft hover:bg-forest-800",
          )}
        >
          {variant === "overlay" ? (
            <PlusIcon size={20} />
          ) : (
            <span className="flex items-center gap-2">
              <PlusIcon size={18} /> Ajouter au panier
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex items-center justify-between rounded-full bg-forest-700 text-white shadow-[0_6px_16px_-6px_rgb(15_61_34/0.6)] animate-[pop_260ms_var(--ease-spring)]",
        variant === "overlay" ? "h-10 w-[7.25rem] p-0.5" : "h-12 w-full p-1",
        className,
      )}
      role="group"
      aria-label={`Quantité de ${label} dans le panier`}
    >
      <button
        type="button"
        onClick={() => actions.decrement(product)}
        aria-label={quantity === 1 ? `Retirer ${label} du panier` : `Retirer un ${label}`}
        className="grid size-9 place-items-center rounded-full transition-colors hover:bg-white/15 active:scale-90"
      >
        <MinusIcon size={18} />
      </button>
      <span key={quantity} className="min-w-6 text-center text-base font-bold tabular-nums animate-[pop_220ms_var(--ease-spring)]" aria-live="off">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => actions.increment(product)}
        disabled={quantity >= MAX_QUANTITY_PER_ITEM}
        aria-label={`Ajouter un ${label}`}
        className="grid size-9 place-items-center rounded-full transition-colors hover:bg-white/15 active:scale-90 disabled:opacity-40"
      >
        <PlusIcon size={18} />
      </button>
    </div>
  );
}
