"use client";

/** Plan du magasin : tous les rayons, accessibles en un geste. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CategorySummary } from "@/types/catalog";
import { Sheet } from "@/components/ui/sheet";
import { AisleIcon, CloseIcon, TagIcon } from "@/components/ui/icons";
import { CategoryIcon } from "./category-icon";

export function CategoryMenu({ categories, compact = false }: { categories: CategorySummary[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Referme le plan du magasin après une navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-forest-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-forest-800 active:scale-[0.97]"
      >
        <AisleIcon size={18} />
        <span className={compact ? "sr-only sm:not-sr-only" : undefined}>Rayons</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="plan-magasin-titre" placement="responsive-center">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-700">Plan du magasin</p>
            <h2 id="plan-magasin-titre" className="font-display text-2xl font-semibold">
              Tous les rayons
            </h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-cream-100" aria-label="Fermer le plan du magasin">
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Rayons" className="overflow-y-auto px-3 py-4 pb-[calc(1rem+var(--safe-bottom))] sm:px-5">
          <ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link href="/promotions" className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-tomato-50">
                <span className="grid size-11 place-items-center rounded-xl bg-tomato-600 text-white">
                  <TagIcon />
                </span>
                <span>
                  <span className="block font-semibold">Promotions</span>
                  <span className="block text-sm text-ink-muted">Offres de démonstration</span>
                </span>
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/rayon/${c.slug}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white hover:shadow-soft">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundColor: c.accent }}>
                    <CategoryIcon slug={c.slug} size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-sm text-ink-muted">{c.productCount} produits</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </>
  );
}
