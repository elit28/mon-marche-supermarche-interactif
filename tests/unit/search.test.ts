import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseSearchParams, toQueryString } from "@/lib/search-params";
import { normalizeSearchText, stemFr, tokenizeQuery } from "@/lib/search-text";
import { computeFacets, filterRows, groupByCategory, sortRows, type SearchRow } from "@/server/search/engine";

describe("normalisation du texte", () => {
  it("ignore accents, casse et ligatures", () => {
    expect(normalizeSearchText("Pâtes À LA Crème Brûlée")).toBe("pates a la creme brulee");
    expect(normalizeSearchText("Œufs frais")).toBe("oeufs frais");
    expect(normalizeSearchText("L'Oréal   Paris")).toBe("l oreal paris");
  });

  it("racinise simplement les pluriels", () => {
    expect(stemFr("pommes")).toBe("pomme");
    expect(stemFr("gateaux")).toBe("gateau");
    expect(stemFr("jus")).toBe("jus");
    expect(stemFr("riz")).toBe("riz");
  });

  it("découpe une requête en jetons utiles", () => {
    expect(tokenizeQuery("Les pâtes de Barilla")).toEqual(["pate", "barilla"]);
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});

describe("paramètres de recherche", () => {
  it("valide et nettoie les paramètres de l'URL", () => {
    const p = parseSearchParams(new URLSearchParams("q=  nutella &marque=ferrero,lu&nutriscore=a,z&prixMax=3,5&bio=1&tri=prix-asc&offset=-4"));
    expect(p).toMatchObject({ q: "nutella", marque: ["ferrero", "lu"], nutriscore: ["a"], prixMax: 350, bio: true, tri: "prix-asc", offset: 0 });
  });

  it("rejette les valeurs inattendues", () => {
    const p = parseSearchParams({ tri: "DROP TABLE", categorie: "<script>", prixMin: "abc" });
    expect(p.tri).toBe("pertinence");
    expect(p.categorie).toEqual([]);
    expect(p.prixMin).toBeNull();
  });

  it("sérialise de façon canonique", () => {
    const p = parseSearchParams({ q: "eau", promo: "1", tri: "nom" });
    expect(toQueryString(p)).toBe("?q=eau&promo=1&tri=nom");
    expect(hasActiveFilters(p)).toBe(true);
    expect(hasActiveFilters(parseSearchParams({ q: "eau" }))).toBe(false);
  });
});

const row = (over: Partial<SearchRow>): SearchRow => ({
  id: 1,
  name: "Produit",
  categorySlug: "petit-dejeuner",
  categoryPosition: 10,
  brandSlug: "marque",
  brandName: "Marque",
  priceCents: 200,
  finalPriceCents: 200,
  nutriscore: "c",
  organic: false,
  hasPromo: false,
  shelfRank: 1,
  popularity: 10,
  createdAt: 1,
  textScore: 0,
  ...over,
});

const rows: SearchRow[] = [
  row({ id: 1, name: "Nutella", brandSlug: "ferrero", brandName: "Ferrero", finalPriceCents: 399, nutriscore: "e", textScore: 5, createdAt: 3 }),
  row({ id: 2, name: "Confiture fraises", brandSlug: "bonne-maman", brandName: "Bonne Maman", finalPriceCents: 289, nutriscore: "d", hasPromo: true, textScore: 2 }),
  row({ id: 3, name: "Muesli bio", brandSlug: "bjorg", brandName: "Bjorg", finalPriceCents: 349, nutriscore: "a", organic: true, textScore: 1, createdAt: 9 }),
  row({ id: 4, name: "Eau minérale", categorySlug: "boissons-eaux", categoryPosition: 11, brandSlug: "evian", brandName: "Evian", finalPriceCents: 99, nutriscore: "a", textScore: 3 }),
];

describe("moteur de filtres", () => {
  const params = (q: Record<string, string>) => parseSearchParams(q);

  it("filtre par marque, Nutri-Score, bio, promo, prix et favoris", () => {
    expect(filterRows(rows, params({ marque: "ferrero" })).map((r) => r.id)).toEqual([1]);
    expect(filterRows(rows, params({ nutriscore: "a" })).map((r) => r.id)).toEqual([3, 4]);
    expect(filterRows(rows, params({ bio: "1" })).map((r) => r.id)).toEqual([3]);
    expect(filterRows(rows, params({ promo: "1" })).map((r) => r.id)).toEqual([2]);
    expect(filterRows(rows, params({ prixMin: "2,50", prixMax: "3,60" })).map((r) => r.id)).toEqual([2, 3]);
    expect(filterRows(rows, params({ favoris: "1" }), new Set([4])).map((r) => r.id)).toEqual([4]);
    expect(filterRows(rows, params({ categorie: "boissons-eaux" })).map((r) => r.id)).toEqual([4]);
  });

  it("calcule des facettes qui ignorent leur propre filtre", () => {
    const facets = computeFacets(rows, params({ marque: "ferrero", nutriscore: "e" }), new Set(), new Map([["petit-dejeuner", "Petit-déjeuner"]]));
    // La facette « marques » ignore le filtre marque mais respecte le Nutri-Score E.
    expect(facets.brands.map((b) => b.value)).toEqual(["ferrero"]);
    // La facette Nutri-Score ignore son filtre mais respecte la marque Ferrero.
    expect(facets.nutriscore).toEqual([{ value: "e", label: "E", count: 1 }]);
    expect(facets.priceRange).toEqual({ min: 399, max: 399 });
  });

  it("trie par pertinence, prix, nom et nouveautés", () => {
    expect(sortRows(rows, "pertinence", true).map((r) => r.id)).toEqual([1, 4, 2, 3]);
    expect(sortRows(rows, "prix-asc", false).map((r) => r.id)).toEqual([4, 2, 3, 1]);
    expect(sortRows(rows, "prix-desc", false).map((r) => r.id)).toEqual([1, 3, 2, 4]);
    expect(sortRows(rows, "nom", false).map((r) => r.name)).toEqual(["Confiture fraises", "Eau minérale", "Muesli bio", "Nutella"]);
    expect(sortRows(rows, "nouveautes", false)[0]!.id).toBe(3);
  });

  it("regroupe par rayon dans l'ordre du magasin, avec le total par rayon", () => {
    const groups = groupByCategory(sortRows(rows, "pertinence", true), 2);
    expect(groups.map((g) => g.categorySlug)).toEqual(["petit-dejeuner", "boissons-eaux"]);
    expect(groups[0]!.rows).toHaveLength(2);
    expect(groups[0]!.total).toBe(3);
  });
});
