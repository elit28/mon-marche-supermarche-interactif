/**
 * Paramètres de recherche et de filtrage, validés par Zod.
 * Partagé entre la page (lecture de l'URL), l'API et les composants de filtres.
 */
import { z } from "zod";
import type { SearchSort } from "@/types/catalog";

export const SEARCH_SORTS: { value: SearchSort; label: string }[] = [
  { value: "pertinence", label: "Pertinence" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
  { value: "nom", label: "Nom (A → Z)" },
  { value: "nouveautes", label: "Nouveautés du catalogue" },
];

const list = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const values = (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);
    return [...new Set(values)].slice(0, 30);
  });

const bool = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "1" || v === "true" || v === "oui");

const euros = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) && n >= 0 && n < 10_000 ? Math.round(n * 100) : null;
  });

export const searchParamsSchema = z.object({
  q: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, 80)),
  categorie: list.transform((values) => values.filter((v) => /^[a-z0-9-]{2,64}$/.test(v))),
  marque: list.transform((values) => values.filter((v) => /^[a-z0-9-]{1,120}$/.test(v))),
  nutriscore: list.transform((values) => values.filter((v): v is "a" | "b" | "c" | "d" | "e" => /^[a-e]$/.test(v))),
  prixMin: euros,
  prixMax: euros,
  bio: bool,
  promo: bool,
  favoris: bool,
  tri: z
    .string()
    .optional()
    .transform((v): SearchSort => (SEARCH_SORTS.some((s) => s.value === v) ? (v as SearchSort) : "pertinence")),
  offset: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      const n = Number.parseInt(String(v ?? "0"), 10);
      return Number.isFinite(n) && n >= 0 && n <= 10_000 ? n : 0;
    }),
});

export type SearchParams = z.output<typeof searchParamsSchema>;

/** Lit les paramètres depuis un objet `searchParams` Next.js ou `URLSearchParams`. */
export function parseSearchParams(input: URLSearchParams | Record<string, string | string[] | undefined>): SearchParams {
  const record: Record<string, string | string[] | undefined> =
    input instanceof URLSearchParams ? Object.fromEntries([...input.keys()].map((k) => [k, input.getAll(k).join(",")])) : input;
  return searchParamsSchema.parse(record);
}

/** Vrai si au moins un filtre (hors texte et tri) est actif. */
export function hasActiveFilters(p: SearchParams): boolean {
  return (
    p.categorie.length > 0 ||
    p.marque.length > 0 ||
    p.nutriscore.length > 0 ||
    p.prixMin !== null ||
    p.prixMax !== null ||
    p.bio ||
    p.promo ||
    p.favoris
  );
}

/** Sérialise les paramètres en query string canonique (pour l'URL). */
export function toQueryString(p: Partial<SearchParams>): string {
  const params = new URLSearchParams();
  if (p.q) params.set("q", p.q);
  if (p.categorie?.length) params.set("categorie", p.categorie.join(","));
  if (p.marque?.length) params.set("marque", p.marque.join(","));
  if (p.nutriscore?.length) params.set("nutriscore", p.nutriscore.join(","));
  if (p.prixMin != null) params.set("prixMin", (p.prixMin / 100).toString());
  if (p.prixMax != null) params.set("prixMax", (p.prixMax / 100).toString());
  if (p.bio) params.set("bio", "1");
  if (p.promo) params.set("promo", "1");
  if (p.favoris) params.set("favoris", "1");
  if (p.tri && p.tri !== "pertinence") params.set("tri", p.tri);
  const s = params.toString();
  return s ? `?${s}` : "";
}
