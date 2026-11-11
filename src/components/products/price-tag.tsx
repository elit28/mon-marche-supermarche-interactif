import { formatPrice, splitPrice } from "@/lib/pricing";
import { finalPriceCents, unitPriceOf } from "@/lib/product";
import { cn } from "@/lib/cn";
import type { ProductSummary } from "@/types/catalog";

/** Prix « d'étiquette » : euros en grand, centimes en exposant. */
export function ShelfPrice({ cents, className, size = "md" }: { cents: number; className?: string; size?: "sm" | "md" | "lg" }) {
  const { euros, cents: c } = splitPrice(cents);
  return (
    <span className={cn("inline-flex items-start font-bold tabular-nums tracking-tight", className)} data-price={cents}>
      <span className="sr-only">{formatPrice(cents)}</span>
      <span aria-hidden="true" className={size === "lg" ? "text-4xl leading-none" : size === "sm" ? "text-[1.05rem] leading-none" : "text-[1.3rem] leading-none"}>
        {euros}
      </span>
      <span aria-hidden="true" className={cn("ml-px leading-none", size === "lg" ? "pt-1 text-lg" : size === "sm" ? "text-[0.68rem]" : "pt-px text-xs")}>
        ,{c}&nbsp;€
      </span>
    </span>
  );
}

/** Étiquette de rayon : prix, prix barré éventuel, prix au kilo/litre. */
export function PriceTag({ product, className }: { product: ProductSummary; className?: string }) {
  const final = finalPriceCents(product);
  const unit = unitPriceOf(product);
  const promo = product.promotion;
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="flex items-baseline justify-center gap-1.5">
        <ShelfPrice cents={final} size="sm" className={promo ? "text-tomato-600" : "text-ink"} />
        {promo ? (
          <span className="text-xs text-ink-muted line-through tabular-nums">
            <span className="sr-only">au lieu de </span>
            {formatPrice(product.priceCents)}
          </span>
        ) : null}
      </div>
      {unit ? <span className="text-xs leading-tight text-ink-muted tabular-nums">{unit.label}</span> : null}
    </div>
  );
}

/** Étiquette blanche clipsée sur l'étagère (prix final, prix barré si promotion). */
export function ShelfLabelPrice({ product }: { product: ProductSummary }) {
  const final = finalPriceCents(product);
  return (
    <span className="price-tag gap-1">
      <ShelfPrice cents={final} size="sm" className={product.promotion ? "text-tomato-600" : "text-ink"} />
      {product.promotion ? (
        <span className="text-xs text-ink-muted line-through tabular-nums">
          <span className="sr-only">au lieu de </span>
          {formatPrice(product.priceCents)}
        </span>
      ) : null}
    </span>
  );
}
