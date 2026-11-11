"use client";

import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { useCartTotals } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import { BasketIcon } from "@/components/ui/icons";

/** Pastille « Total » de l'en-tête : montant et nombre d'articles en temps réel. */
export function CartPill({ className }: { className?: string }) {
  const totals = useCartTotals();
  const bump = useUiStore((s) => s.basketBump);
  const openCart = useUiStore((s) => s.openCart);
  const count = totals.itemCount;
  const total = totals.totalCents;
  const filled = count > 0;
  return (
    <button
      type="button"
      onClick={openCart}
      data-cart-target="secondary"
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full pl-3 pr-1.5 text-sm font-semibold transition-colors duration-300",
        className,
        filled ? "bg-forest-700 text-white shadow-[0_8px_20px_-10px_rgb(15_61_34/0.8)]" : "bg-white text-ink ring-1 ring-forest-900/12",
      )}
    >
      <span className="sr-only">Ouvrir le panier : </span>
      <BasketIcon size={19} />
      <span className="hidden text-xs font-medium opacity-80 sm:inline">Total</span>
      <span key={bump} className="hidden tabular-nums animate-[pop_300ms_var(--ease-spring)] min-[440px]:inline">
        {formatPrice(total)}
      </span>
      <span className={cn("grid h-8 min-w-8 place-items-center rounded-full px-1.5 text-xs tabular-nums", filled ? "bg-white text-forest-800" : "bg-cream-100 text-ink-soft")}>
        {count}
      </span>
      <span className="sr-only">{count > 1 ? " articles" : " article"}</span>
    </button>
  );
}
