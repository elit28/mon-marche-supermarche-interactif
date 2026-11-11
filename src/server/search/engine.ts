/**
 * Moteur de filtrage, de facettes et de tri — logique pure, testée unitairement.
 *
 * La base de données sélectionne les candidats correspondant au texte (index
 * trigrammes, tolérance aux fautes et aux accents) ; ce module applique les
 * filtres, calcule les facettes (chaque facette ignore son propre filtre,
 * comme dans tout bon moteur de recherche) et trie.
 */
import type { SearchParams } from "@/lib/search-params";
import type { SearchFacetValue, SearchSort } from "@/types/catalog";

export interface SearchRow {
  id: number;
  name: string;
  categorySlug: string;
  categoryPosition: number;
  brandSlug: string | null;
  brandName: string | null;
  priceCents: number;
  finalPriceCents: number;
  nutriscore: string | null;
  organic: boolean;
  hasPromo: boolean;
  shelfRank: number;
  popularity: number;
  createdAt: number;
  /** Pertinence textuelle (0 si pas de requête). */
  textScore: number;
}

type Dimension = "categorie" | "marque" | "nutriscore" | "prix" | "bio" | "promo" | "favoris";

function matches(row: SearchRow, p: SearchParams, favorites: ReadonlySet<number>, skip?: Dimension): boolean {
  if (skip !== "categorie" && p.categorie.length > 0 && !p.categorie.includes(row.categorySlug)) return false;
  if (skip !== "marque" && p.marque.length > 0 && (!row.brandSlug || !p.marque.includes(row.brandSlug))) return false;
  if (skip !== "nutriscore" && p.nutriscore.length > 0 && (!row.nutriscore || !p.nutriscore.includes(row.nutriscore as "a"))) return false;
  if (skip !== "prix") {
    if (p.prixMin !== null && row.finalPriceCents < p.prixMin) return false;
    if (p.prixMax !== null && row.finalPriceCents > p.prixMax) return false;
  }
  if (skip !== "bio" && p.bio && !row.organic) return false;
  if (skip !== "promo" && p.promo && !row.hasPromo) return false;
  if (skip !== "favoris" && p.favoris && !favorites.has(row.id)) return false;
  return true;
}

export function filterRows(rows: readonly SearchRow[], p: SearchParams, favorites: ReadonlySet<number> = new Set()): SearchRow[] {
  return rows.filter((r) => matches(r, p, favorites));
}

function countBy(rows: readonly SearchRow[], key: (r: SearchRow) => string | null, label: (value: string, r: SearchRow) => string): SearchFacetValue[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const value = key(r);
    if (!value) continue;
    const entry = counts.get(value);
    if (entry) entry.count++;
    else counts.set(value, { label: label(value, r), count: 1 });
  }
  return [...counts.entries()].map(([value, { label, count }]) => ({ value, label, count }));
}

export interface Facets {
  brands: SearchFacetValue[];
  categories: SearchFacetValue[];
  nutriscore: SearchFacetValue[];
  priceRange: { min: number; max: number } | null;
}

export function computeFacets(
  rows: readonly SearchRow[],
  p: SearchParams,
  favorites: ReadonlySet<number>,
  categoryNames: ReadonlyMap<string, string>,
): Facets {
  const forBrands = rows.filter((r) => matches(r, p, favorites, "marque"));
  const forCategories = rows.filter((r) => matches(r, p, favorites, "categorie"));
  const forNutri = rows.filter((r) => matches(r, p, favorites, "nutriscore"));
  const forPrice = rows.filter((r) => matches(r, p, favorites, "prix"));

  const brands = countBy(forBrands, (r) => r.brandSlug, (_v, r) => r.brandName ?? _v)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, 40);
  const categories = countBy(forCategories, (r) => r.categorySlug, (v) => categoryNames.get(v) ?? v).sort((a, b) => b.count - a.count);
  const nutriscore = countBy(forNutri, (r) => r.nutriscore, (v) => v.toUpperCase()).sort((a, b) => a.value.localeCompare(b.value));
  const prices = forPrice.map((r) => r.finalPriceCents);
  return {
    brands,
    categories,
    nutriscore,
    priceRange: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
  };
}

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

export function sortRows(rows: readonly SearchRow[], sort: SearchSort, hasQuery: boolean): SearchRow[] {
  const sorted = [...rows];
  switch (sort) {
    case "prix-asc":
      return sorted.sort((a, b) => a.finalPriceCents - b.finalPriceCents || collator.compare(a.name, b.name));
    case "prix-desc":
      return sorted.sort((a, b) => b.finalPriceCents - a.finalPriceCents || collator.compare(a.name, b.name));
    case "nom":
      return sorted.sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id);
    case "nouveautes":
      return sorted.sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
    case "pertinence":
    default:
      if (hasQuery) {
        return sorted.sort((a, b) => b.textScore - a.textScore || b.popularity - a.popularity || a.id - b.id);
      }
      return sorted.sort((a, b) => a.categoryPosition - b.categoryPosition || a.shelfRank - b.shelfRank || a.id - b.id);
  }
}

export interface GroupedRows {
  categorySlug: string;
  rows: SearchRow[];
  total: number;
}

/** Regroupe les résultats par rayon, dans l'ordre du magasin (comme une allée filtrée). */
export function groupByCategory(rows: readonly SearchRow[], perGroup: number): GroupedRows[] {
  const groups = new Map<string, { position: number; rows: SearchRow[] }>();
  for (const r of rows) {
    const g = groups.get(r.categorySlug);
    if (g) g.rows.push(r);
    else groups.set(r.categorySlug, { position: r.categoryPosition, rows: [r] });
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].position - b[1].position)
    .map(([categorySlug, g]) => ({ categorySlug, rows: g.rows.slice(0, perGroup), total: g.rows.length }));
}
