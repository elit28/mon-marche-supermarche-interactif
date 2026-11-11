/**
 * Recherche : candidats SQL (texte) + filtres, facettes, tri (moteur pur).
 */
import { hasActiveFilters, type SearchParams } from "@/lib/search-params";
import type { SearchResponse, SearchResultGroup } from "@/types/catalog";
import { computeFacets, filterRows, groupByCategory, sortRows } from "../search/engine";
import { categoryNameMap, findSearchRows, getProductsByIds, listCategories } from "./catalog";

export const SEARCH_PAGE_SIZE = 48;
const PER_GROUP = 24;

export async function searchCatalog(params: SearchParams, favoriteIds: ReadonlySet<number>): Promise<SearchResponse> {
  const [rows, categories] = await Promise.all([findSearchRows(params.q), listCategories()]);
  const filtered = filterRows(rows, params, favoriteIds);
  const facets = computeFacets(rows, params, favoriteIds, categoryNameMap());
  const sorted = sortRows(filtered, params.tri, params.q.length > 0);

  // Vue « allée filtrée » (par rayon) tant que l'utilisateur n'a pas choisi de tri
  // ni restreint à un seul rayon ; sinon, une liste unique paginée.
  const grouped = params.tri === "pertinence" && params.categorie.length !== 1 && params.offset === 0;
  if (grouped) {
    const groups = groupByCategory(sorted, PER_GROUP);
    const ids = groups.flatMap((g) => g.rows.map((r) => r.id));
    const summaries = new Map((await getProductsByIds(ids)).map((p) => [p.id, p]));
    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
    const resultGroups: SearchResultGroup[] = groups
      .map((g) => ({
        category: categoryBySlug.get(g.categorySlug)!,
        products: g.rows.map((r) => summaries.get(r.id)).filter((p) => p !== undefined),
        count: g.total,
      }))
      .filter((g) => g.category && g.products.length > 0);
    return { query: params.q, total: filtered.length, sort: params.tri, groups: resultGroups, products: [], nextOffset: null, facets };
  }

  const page = sorted.slice(params.offset, params.offset + SEARCH_PAGE_SIZE);
  const products = await getProductsByIds(page.map((r) => r.id));
  const next = params.offset + page.length;
  return {
    query: params.q,
    total: filtered.length,
    sort: params.tri,
    groups: [],
    products,
    nextOffset: next < filtered.length ? next : null,
    facets,
  };
}

export { hasActiveFilters };
