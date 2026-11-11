"use client";

import { cn } from "@/lib/cn";
import { useFavoritesStore, useIsFavorite } from "@/stores/favorites";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { HeartIcon } from "@/components/ui/icons";

export function FavoriteButton({ product, className, size = "sm" }: { product: ProductSummary; className?: string; size?: "sm" | "md" }) {
  const isFavorite = useIsFavorite(product.id);
  const toggle = useFavoritesStore((s) => s.toggle);
  const announce = useUiStore((s) => s.announce);
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
      onClick={() => {
        const now = toggle(product);
        announce(now ? `${product.name} ajouté aux favoris.` : `${product.name} retiré des favoris.`);
      }}
      className={cn(
        "grid place-items-center rounded-full transition-[transform,color,background-color,opacity] duration-200 active:scale-90",
        size === "sm" ? "size-9 bg-white/90 shadow-sm ring-1 ring-forest-900/10 backdrop-blur" : "size-12 bg-white ring-1 ring-forest-900/15",
        isFavorite ? "text-tomato-600" : "text-ink-soft hover:text-tomato-600",
        className,
      )}
      data-favorite={isFavorite ? "true" : "false"}
    >
      <HeartIcon size={size === "sm" ? 17 : 22} filled={isFavorite} className={isFavorite ? "animate-[pop_260ms_var(--ease-spring)]" : undefined} />
    </button>
  );
}
