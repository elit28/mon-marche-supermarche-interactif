"use client";

/**
 * Étagère horizontale : défilement au doigt (mobile), à la molette/au pavé et
 * par flèches (ordinateur), chargement progressif des produits suivants.
 * Le défilement horizontal est contenu (`overscroll-behavior-x: contain`) :
 * il ne déplace jamais la page ni ne déclenche le « retour arrière » du navigateur.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ProductSummary, ShelfPage } from "@/types/catalog";
import { ProductSlot } from "@/components/products/product-slot";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { RayonSign } from "./rayon-sign";

export interface ShelfProps {
  id?: string;
  title: string;
  /** Sur-titre (ex. « Rayon », « Sélection »). */
  eyebrow?: string;
  accent?: string;
  icon?: React.ReactNode;
  /** Libellé de comptage, ex. « 42 produits » ou « 3 sur 42 ». */
  countLabel?: string;
  href?: string;
  hrefLabel?: string;
  products: ProductSummary[];
  /** URL de l'API pour charger la suite (`offset` ajouté automatiquement). */
  moreUrl?: string;
  nextOffset?: number | null;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
  emptyMessage?: string;
}

export function Shelf({
  id,
  title,
  eyebrow,
  accent,
  icon,
  countLabel,
  href,
  hrefLabel = "Tout le rayon",
  products: initialProducts,
  moreUrl,
  nextOffset: initialNext = null,
  priority = false,
  headingLevel = "h2",
  emptyMessage = "Aucun produit sur cette étagère pour le moment.",
}: ShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const [products, setProducts] = useState(initialProducts);
  const [nextOffset, setNextOffset] = useState(initialNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });
  const headingId = `${id ?? title.replace(/\W+/g, "-").toLowerCase()}-titre`;

  // Nouvelles données serveur (ex. recherche modifiée) : l'étagère repart du début.
  const [source, setSource] = useState(initialProducts);
  if (initialProducts !== source) {
    setSource(initialProducts);
    setProducts(initialProducts);
    setNextOffset(initialNext);
  }
  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [source]);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    updateEdges();
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateEdges);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [updateEdges, products.length]);

  const loadMore = useCallback(async () => {
    if (!moreUrl || nextOffset === null || loading) return;
    setLoading(true);
    setError(false);
    try {
      const url = `${moreUrl}${moreUrl.includes("?") ? "&" : "?"}offset=${nextOffset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as ShelfPage;
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.products.filter((p) => !seen.has(p.id))];
      });
      setNextOffset(page.nextOffset);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [moreUrl, nextOffset, loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollerRef.current;
    if (!sentinel || !root || nextOffset === null || error) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && void loadMore(), {
      root,
      rootMargin: "0px 900px 0px 0px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore, nextOffset, error]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section id={id} aria-labelledby={headingId} className="relative scroll-mt-[calc(var(--header-h)+4rem)]">
      <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <RayonSign id={headingId} title={title} eyebrow={eyebrow} accent={accent} icon={icon} countLabel={countLabel} as={headingLevel} />
        <div className="flex shrink-0 items-center gap-1">
          {href ? (
            <Link
              href={href}
              className="group/link inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-[0.8rem] font-semibold text-forest-700 hover:bg-forest-700/8 sm:px-3"
              aria-label={`${hrefLabel} : ${title}`}
            >
              <span className="hidden sm:inline">{hrefLabel}</span>
              <ArrowRightIcon size={16} className="transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          ) : null}
          <div className="hidden gap-1.5 pointer-fine:flex">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={edges.start}
              aria-label={`Faire défiler « ${title} » vers la gauche`}
              className="grid size-9 place-items-center rounded-full bg-white/80 text-ink ring-1 ring-forest-900/10 transition hover:bg-forest-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={edges.end && nextOffset === null}
              aria-label={`Faire défiler « ${title} » vers la droite`}
              className="grid size-9 place-items-center rounded-full bg-white/80 text-ink ring-1 ring-forest-900/10 transition hover:bg-forest-700 hover:text-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className={cn("shelf-scroller", !edges.end && "shelf-fade-right")} tabIndex={-1}>
        {products.length === 0 ? (
          <p className="mx-auto max-w-[110rem] px-4 py-10 text-ink-muted sm:px-6 lg:px-10">{emptyMessage}</p>
        ) : (
          <ul className="shelf-track flex w-max min-w-full gap-0 px-2 pb-1 sm:px-4 lg:px-8" aria-label={`Produits : ${title}`}>
            {products.map((product, index) => (
              <ProductSlot key={product.id} product={product} priority={priority && index < 6} />
            ))}
            {nextOffset !== null ? (
              <li ref={sentinelRef} className="flex w-28 shrink-0 items-center justify-center" aria-hidden={!error}>
                {error ? (
                  <button type="button" onClick={() => void loadMore()} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-forest-700 shadow-soft">
                    Réessayer
                  </button>
                ) : (
                  <span className="skeleton mb-24 h-28 w-20 rounded-xl" />
                )}
              </li>
            ) : href ? (
              <li className="flex shrink-0 items-start px-3 pt-6">
                <Link
                  href={href}
                  className="flex h-[calc(var(--shelf-stage)-1.5rem)] w-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-forest-700/30 bg-white/60 p-3 text-center text-sm font-semibold text-forest-700 transition hover:border-forest-700 hover:bg-white"
                >
                  <ArrowRightIcon size={22} />
                  {hrefLabel}
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </section>
  );
}
