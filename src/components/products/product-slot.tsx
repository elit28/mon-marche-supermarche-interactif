"use client";

/**
 * Un emplacement de rayon : l'emballage posé sur la planche, son ombre de
 * contact, le bouton d'ajout et l'étiquette de prix accrochée au chant.
 * Pas de « carte produit » : le produit lui-même est l'interface.
 */
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { cn } from "@/lib/cn";
import { productHref, productLabel, shelfAspect } from "@/lib/product";
import type { ProductSummary } from "@/types/catalog";
import { AddToCart } from "@/components/cart/add-to-cart";
import { FavoriteButton } from "./favorite-button";
import { PriceTag } from "./price-tag";

interface ProductSlotProps {
  product: ProductSummary;
  /** Image prioritaire (premières étagères visibles). */
  priority?: boolean;
  /** Mise en page « grille » : largeur fixe, utilisée dans les étagères à plusieurs rangées. */
  fixedWidth?: boolean;
}

function ProductSlotComponent({ product, priority = false, fixedWidth = false }: ProductSlotProps) {
  const aspect = shelfAspect(product);
  const label = productLabel(product);
  return (
    <li
      data-slot
      data-product-id={product.id}
      className={cn("product-slot relative flex shrink-0 snap-start flex-col", fixedWidth ? "w-full" : "w-[var(--slot-w)]")}
      style={{ "--slot-w": `clamp(7.75rem, calc(var(--shelf-image) * ${aspect.toFixed(3)} + 2rem), 13.5rem)` } as React.CSSProperties}
    >
      {/* Scène : l'emballage repose sur la planche. */}
      <div className="relative flex h-[var(--shelf-stage)] items-end justify-center px-3">
        <Link
          href={productHref(product)}
          scroll={false}
          className="relative flex h-full w-full items-end justify-center rounded-lg focus-visible:outline-offset-4"
          aria-label={`Voir la fiche : ${label}`}
          prefetch={false}
        >
          <span className="product-figure relative flex h-[var(--shelf-image)] max-w-full items-end justify-center">
            <Image
              data-product-image
              src={product.image.src}
              alt={label}
              width={product.image.width}
              height={product.image.height}
              sizes="(min-width: 768px) 200px, 160px"
              quality={80}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              draggable={false}
              className={cn(
                "h-auto max-h-full w-auto max-w-full select-none object-contain object-bottom",
                !product.image.cutout && "rounded-md mix-blend-multiply",
              )}
            />
          </span>
          <span className="contact-shadow" aria-hidden="true" />
        </Link>

        {product.promotion ? (
          <span className="pointer-events-none absolute right-1.5 top-1 rounded-full bg-tomato-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            {product.promotion.label}
          </span>
        ) : null}

        <FavoriteButton
          product={product}
          className="absolute left-1 top-1 opacity-0 focus-visible:opacity-100 [[data-slot]:hover_&]:opacity-100 data-[favorite=true]:opacity-100 pointer-coarse:hidden pointer-coarse:data-[favorite=true]:grid"
        />

        <AddToCart product={product} className="absolute bottom-1 right-1 z-10" />
      </div>

      {/* Prix et nom, sous l'étagère. */}
      <div className="price-tag relative mx-1 mt-[0.95rem] px-1 pb-2">
        <PriceTag product={product} />
        <p className="mx-auto mt-0.5 line-clamp-1 max-w-full text-[0.8rem] leading-snug text-ink-muted" title={label}>
          {product.name}
          {product.quantity ? <span> · {product.quantity}</span> : null}
        </p>
      </div>
    </li>
  );
}

export const ProductSlot = memo(ProductSlotComponent);
