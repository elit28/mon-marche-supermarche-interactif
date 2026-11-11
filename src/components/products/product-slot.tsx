"use client";

/**
 * Un emplacement de rayon : l'emballage posé sur l'étagère, son ombre de
 * contact, le bouton d'ajout et l'étiquette de prix clipsée sur le chant.
 * Pas de « carte produit » : le produit lui-même est l'interface.
 */
import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import { cn } from "@/lib/cn";
import { productHref, productLabel, unitPriceOf } from "@/lib/product";
import type { ProductSummary } from "@/types/catalog";
import { AddToCart } from "@/components/cart/add-to-cart";
import { FavoriteButton } from "./favorite-button";
import { ShelfLabelPrice } from "./price-tag";

interface ProductSlotProps {
  product: ProductSummary;
  /** Image prioritaire (premières étagères visibles). */
  priority?: boolean;
  /** Mise en page « grille » : la largeur suit la colonne. */
  fixedWidth?: boolean;
}

function ProductSlotComponent({ product, priority = false, fixedWidth = false }: ProductSlotProps) {
  const label = productLabel(product);
  const unit = unitPriceOf(product);
  return (
    <li
      data-slot
      data-product-id={product.id}
      className={cn("product-slot relative flex shrink-0 snap-start flex-col items-center", fixedWidth ? "w-full" : "w-[var(--slot-w)]")}
    >
      {/* Scène : l'emballage repose sur l'étagère. */}
      <div className="relative flex h-[var(--shelf-stage)] w-full items-end justify-center px-4">
        <Link
          href={productHref(product)}
          scroll={false}
          className="relative flex h-full w-full items-end justify-center rounded-lg focus-visible:outline-offset-4"
          aria-label={`Voir la fiche : ${label}`}
          prefetch={false}
        >
          <span className="product-figure relative flex h-[var(--shelf-image)] w-full items-end justify-center">
            <Image
              data-product-image
              src={product.image.src}
              alt={label}
              width={product.image.width}
              height={product.image.height}
              sizes="(min-width: 768px) 200px, 140px"
              quality={80}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              draggable={false}
              className={cn("h-auto max-h-full w-auto max-w-full select-none object-contain object-bottom", !product.image.cutout && "rounded-md mix-blend-multiply")}
            />
          </span>
          <span className="contact-shadow" aria-hidden="true" />
        </Link>

        {product.promotion ? (
          <span className="pointer-events-none absolute right-3 top-1 rounded-full bg-tomato-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            {product.promotion.label}
          </span>
        ) : null}

        <FavoriteButton
          product={product}
          className="absolute left-3 top-1 opacity-0 focus-visible:opacity-100 [[data-slot]:hover_&]:opacity-100 data-[favorite=true]:opacity-100 pointer-coarse:hidden pointer-coarse:data-[favorite=true]:grid"
        />

        <AddToCart product={product} className="absolute bottom-1 right-2 z-10 md:right-4" />
      </div>

      {/* Étiquette de prix sur le chant de l'étagère. */}
      <div className="flex h-[calc(var(--shelf-lip)+var(--shelf-front))] items-center pt-[var(--shelf-lip)]" title={unit ? `${label} — ${unit.label}` : label}>
        <ShelfLabelPrice product={product} />
        <span className="sr-only">
          {label}
          {unit ? `, soit ${unit.label}` : ""}
        </span>
      </div>
    </li>
  );
}

export const ProductSlot = memo(ProductSlotComponent);
