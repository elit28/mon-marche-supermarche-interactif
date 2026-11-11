"use client";

/**
 * Filtres et tri : l'état vit dans l'URL (partageable, retour arrière fiable).
 * Raccourcis rapides en ligne, réglages détaillés dans un panneau.
 */
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import { SEARCH_SORTS, hasActiveFilters, toQueryString, type SearchParams } from "@/lib/search-params";
import type { SearchResponse } from "@/types/catalog";
import { Sheet } from "@/components/ui/sheet";
import { CheckIcon, CloseIcon, FilterIcon, HeartIcon, LeafIcon, TagIcon } from "@/components/ui/icons";

interface FilterBarProps {
  params: SearchParams;
  facets: SearchResponse["facets"];
  total: number;
  /** Masque le filtre par rayon (page d'un rayon). */
  hideCategories?: boolean;
}

function Chip({ active, onClick, children, label }: { active: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active ? "border-transparent bg-forest-700 text-white" : "border-forest-900/12 bg-white text-ink-soft hover:border-forest-700/40",
      )}
    >
      {children}
    </button>
  );
}

export function FilterBar({ params, facets, total, hideCategories = false }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [panelOpen, setPanelOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");

  const apply = (patch: Partial<SearchParams>) => {
    const next = { ...params, ...patch, offset: 0 };
    startTransition(() => router.replace(`${pathname}${toQueryString(next)}`, { scroll: false }));
  };
  const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const activeCount =
    params.marque.length + (hideCategories ? 0 : params.categorie.length) + params.nutriscore.length + (params.prixMin !== null || params.prixMax !== null ? 1 : 0);
  const filtersActive = hasActiveFilters(hideCategories ? { ...params, categorie: [] } : params);
  const brands = facets.brands.filter((b) => b.label.toLowerCase().includes(brandQuery.toLowerCase()));

  return (
    <div className={cn("transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div className="shelf-scroller -mx-4 flex items-center gap-2 px-4 py-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-forest-900"
        >
          <FilterIcon size={17} /> Filtres{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <label className="relative shrink-0">
          <span className="sr-only">Trier par</span>
          <select
            value={params.tri}
            onChange={(e) => apply({ tri: e.target.value as SearchParams["tri"] })}
            className="h-10 appearance-none rounded-full border border-forest-900/12 bg-white pl-3.5 pr-9 text-sm font-medium text-ink-soft outline-none focus:border-forest-700"
          >
            {SEARCH_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Tri : {s.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted" aria-hidden="true">
            ▼
          </span>
        </label>
        <Chip active={params.promo} onClick={() => apply({ promo: !params.promo })}>
          <TagIcon size={16} /> Promos
        </Chip>
        <Chip active={params.bio} onClick={() => apply({ bio: !params.bio })}>
          <LeafIcon size={16} /> Bio
        </Chip>
        <Chip active={params.favoris} onClick={() => apply({ favoris: !params.favoris })}>
          <HeartIcon size={16} /> Mes favoris
        </Chip>
        {(["a", "b"] as const).map((g) => (
          <Chip key={g} active={params.nutriscore.includes(g)} onClick={() => apply({ nutriscore: toggleIn(params.nutriscore, g) as SearchParams["nutriscore"] })} label={`Nutri-Score ${g.toUpperCase()}`}>
            Nutri-Score {g.toUpperCase()}
          </Chip>
        ))}
        {filtersActive || params.tri !== "pertinence" ? (
          <button
            type="button"
            onClick={() => apply({ marque: [], categorie: hideCategories ? params.categorie : [], nutriscore: [], prixMin: null, prixMax: null, bio: false, promo: false, favoris: false, tri: "pertinence" })}
            className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold text-tomato-700 hover:bg-tomato-50"
          >
            <CloseIcon size={15} /> Réinitialiser
          </button>
        ) : null}
      </div>

      <Sheet open={panelOpen} onClose={() => setPanelOpen(false)} labelledBy="filtres-titre" placement="responsive-right">
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 id="filtres-titre" className="font-display text-2xl font-semibold">
            Filtres
          </h2>
          <button type="button" onClick={() => setPanelOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-cream-100" aria-label="Fermer les filtres">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {!hideCategories && facets.categories.length > 0 ? (
            <fieldset>
              <legend className="mb-2 font-semibold">Rayons</legend>
              <div className="flex flex-wrap gap-2">
                {facets.categories.map((c) => (
                  <Chip key={c.value} active={params.categorie.includes(c.value)} onClick={() => apply({ categorie: toggleIn(params.categorie, c.value) })}>
                    {c.label} <span className="opacity-70">{c.count}</span>
                  </Chip>
                ))}
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <legend className="mb-2 font-semibold">Nutri-Score</legend>
            <div className="flex flex-wrap gap-2">
              {(["a", "b", "c", "d", "e"] as const).map((g) => {
                const count = facets.nutriscore.find((n) => n.value === g)?.count ?? 0;
                return (
                  <Chip key={g} active={params.nutriscore.includes(g)} onClick={() => apply({ nutriscore: toggleIn(params.nutriscore, g) as SearchParams["nutriscore"] })}>
                    {g.toUpperCase()} <span className="opacity-70">{count}</span>
                  </Chip>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-muted">Seuls les produits dont le Nutri-Score est renseigné dans Open Food Facts apparaissent.</p>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-semibold">Prix (après promotion)</legend>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const toCents = (v: FormDataEntryValue | null) => {
                  const n = Number.parseFloat(String(v ?? "").replace(",", "."));
                  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
                };
                apply({ prixMin: toCents(form.get("min")), prixMax: toCents(form.get("max")) });
              }}
            >
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-ink-muted">Minimum (€)</span>
                <input name="min" inputMode="decimal" defaultValue={params.prixMin !== null ? String(params.prixMin / 100).replace(".", ",") : ""} placeholder={facets.priceRange ? formatPrice(facets.priceRange.min) : "0"} className="h-11 w-full rounded-xl border border-forest-900/15 px-3 outline-none focus:border-forest-700" />
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-ink-muted">Maximum (€)</span>
                <input name="max" inputMode="decimal" defaultValue={params.prixMax !== null ? String(params.prixMax / 100).replace(".", ",") : ""} placeholder={facets.priceRange ? formatPrice(facets.priceRange.max) : ""} className="h-11 w-full rounded-xl border border-forest-900/15 px-3 outline-none focus:border-forest-700" />
              </label>
              <button type="submit" className="h-11 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white">
                OK
              </button>
            </form>
          </fieldset>

          {facets.brands.length > 0 ? (
            <fieldset>
              <legend className="mb-2 font-semibold">Marques</legend>
              <input
                type="search"
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Filtrer les marques…"
                aria-label="Filtrer la liste des marques"
                className="mb-2 h-11 w-full rounded-xl border border-forest-900/15 px-3 outline-none focus:border-forest-700"
              />
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {brands.map((b) => {
                  const checked = params.marque.includes(b.value);
                  return (
                    <li key={b.value}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => apply({ marque: toggleIn(params.marque, b.value) })}
                        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-cream-100"
                      >
                        <span className={cn("grid size-5 place-items-center rounded-md border", checked ? "border-forest-700 bg-forest-700 text-white" : "border-forest-900/25 bg-white")}>
                          {checked ? <CheckIcon size={14} /> : null}
                        </span>
                        <span className="flex-1 truncate">{b.label}</span>
                        <span className="text-sm text-ink-muted">{b.count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}
        </div>
        <div className="border-t border-cream-200 bg-white px-5 pb-[calc(1rem+var(--safe-bottom))] pt-4">
          <button type="button" onClick={() => setPanelOpen(false)} className="flex min-h-12 w-full items-center justify-center rounded-full bg-forest-700 font-semibold text-white">
            Voir {total} produit{total > 1 ? "s" : ""}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
