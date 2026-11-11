"use client";

/**
 * Allées du magasin : raccourcis vers chaque rayon de la page d'accueil,
 * avec mise en évidence du rayon parcouru (défilement suivi).
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { CategorySummary } from "@/types/catalog";
import { CategoryIcon } from "./category-icon";

export function AisleNav({ categories }: { categories: CategorySummary[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const sections = categories.map((c) => document.getElementById(`rayon-${c.slug}`)).filter((el): el is HTMLElement => el !== null);
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        const best = [...visible.entries()].filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1])[0];
        setCurrent(best ? best[0].replace("rayon-", "") : null);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [categories]);

  useEffect(() => {
    if (!current) return;
    const chip = listRef.current?.querySelector<HTMLElement>(`[data-aisle="${current}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [current]);

  return (
    <nav aria-label="Allées du magasin" className="z-20 border-b border-forest-900/6 bg-cream-50/85 backdrop-blur md:sticky md:top-[var(--header-h)]">
      <ul ref={listRef} className="shelf-scroller mx-auto flex max-w-[110rem] gap-2 px-4 py-2.5 sm:px-6 lg:px-10">
        {categories.map((c) => (
          <li key={c.slug} className="shrink-0">
            <a
              href={`#rayon-${c.slug}`}
              data-aisle={c.slug}
              aria-current={current === c.slug ? "location" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
                current === c.slug ? "border-transparent bg-forest-700 text-white" : "border-forest-900/10 bg-white text-ink-soft hover:border-forest-700/40 hover:text-forest-800",
              )}
            >
              <CategoryIcon slug={c.slug} size={17} />
              {c.shortName}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
