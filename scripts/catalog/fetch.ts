/**
 * Étape 1 du pipeline : collecte des données Open Food Facts.
 *
 *   pnpm catalog:fetch [--refresh] [--only=fromages,boissons-eaux]
 *
 * 1. Découverte : recherche v2 (produits vendus en France, triés par popularité),
 *    plusieurs pages pour les catégories.
 * 2. Pré-sélection : contrôle qualité sur les champs de recherche, cartographie des rayons.
 * 3. Tri des photos : chaque photo de face (400 px, CDN statique) est analysée ;
 *    les « packshots » sur fond uni (détourage parfait) passent en priorité, les
 *    photos sur fond non uni deviennent des candidats au détourage par IA.
 * 4. Fiches : lecture des candidats retenus via l'API v3 (recommandée pour les fiches).
 *
 * Toutes les réponses sont mises en cache dans `.cache/catalog/` : relancer la
 * commande reprend là où elle s'était arrêtée (imports incrémentaux, reprise sur erreur).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIES, type CategorySlug } from "../../src/lib/catalog/categories";
import { isAllowedImageUrl, normalizeOffProduct, type RejectionReason } from "../../src/server/catalog/normalize";
import {
  OFF_SITE_HOSTS,
  PRODUCT_FIELDS,
  SEARCH_FIELDS,
  type OffSearchResponse,
  type OffSite,
  type OffV3ProductResponse,
} from "../../src/server/catalog/off-types";
import { RateLimiter, cacheKey, downloadCached, fetchJsonCached, limiters } from "../../src/server/catalog/http";
import { analyzeBackground } from "./lib/image-process";
import { CATEGORY_TARGETS, DISCOVERY_QUERIES, type DiscoveryQuery } from "./sources";

export const CACHE_DIR = path.resolve(process.cwd(), ".cache/catalog");
export const CANDIDATES_FILE = path.join(CACHE_DIR, "candidates.json");

const args = new Set(process.argv.slice(2));
const refresh = args.has("--refresh");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

/** Nombre de candidats « packshot » conservés par rayon (multiple de l'objectif). */
const PACKSHOT_FACTOR = 1.6;
/** Réserve de candidats au détourage par IA quand les packshots manquent. */
const ML_RESERVE_FACTOR = 1.2;
const POOL_BRAND_CAP = 8;

const searchLimiters: Record<OffSite, RateLimiter> = {
  food: limiters.search,
  beauty: new RateLimiter(6_500),
  products: new RateLimiter(6_500),
  petfood: new RateLimiter(6_500),
};

function searchUrl(query: DiscoveryQuery, page: number): string {
  const params = new URLSearchParams({
    countries_tags_en: "france",
    sort_by: "unique_scans_n",
    page_size: String(query.pageSize ?? 100),
    page: String(page),
    fields: SEARCH_FIELDS,
  });
  if (query.tag) params.set("categories_tags", query.tag);
  if (query.brand) params.set("brands_tags", query.brand);
  if (query.label) params.set("labels_tags", query.label);
  return `${OFF_SITE_HOSTS[query.site]}/api/v2/search?${params.toString()}`;
}

export type ImageClass = "packshot" | "ml" | "busy";

export interface Candidate {
  code: string;
  site: OffSite;
  hint: CategorySlug;
  category: CategorySlug;
  popularity: number;
  brandSlug: string | null;
  queries: string[];
  previewUrl: string;
  imageClass?: ImageClass;
  backgroundScore?: number;
  productFile?: string;
  imageFile?: string;
  imageUrl?: string;
  error?: string;
}

export interface FetchReport {
  startedAt: string;
  finishedAt?: string;
  queries: Array<{ label: string; site: OffSite; category: CategorySlug; returned: number; accepted: number; error?: string }>;
  screeningRejections: Partial<Record<RejectionReason, number>>;
  imageClasses: Record<ImageClass | "error", number>;
  candidatesByCategory: Partial<Record<CategorySlug, { packshot: number; ml: number }>>;
  productErrors: number;
}

function queryLabel(query: DiscoveryQuery, page: number): string {
  return [query.site, query.tag && `cat=${query.tag}`, query.brand && `marque=${query.brand}`, query.label && `label=${query.label}`, page > 1 && `p${page}`]
    .filter(Boolean)
    .join(" ");
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]!);
    }),
  );
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });
  const report: FetchReport = {
    startedAt: new Date().toISOString(),
    queries: [],
    screeningRejections: {},
    imageClasses: { packshot: 0, ml: 0, busy: 0, error: 0 },
    candidatesByCategory: {},
    productErrors: 0,
  };

  // Analyses de photos déjà effectuées (reprise rapide).
  const analysisFile = path.join(CACHE_DIR, "image-analysis.json");
  const analysis: Record<string, { cls: ImageClass; score: number }> = JSON.parse(await readFile(analysisFile, "utf8").catch(() => "{}"));

  const queries = DISCOVERY_QUERIES.filter((query) => !only || only.has(query.category));
  console.log(`🔎 Découverte : ${queries.length} requêtes de recherche (API v2)…`);

  const byCode = new Map<string, Candidate>();
  const bySite = new Map<OffSite, DiscoveryQuery[]>();
  for (const query of queries) bySite.set(query.site, [...(bySite.get(query.site) ?? []), query]);

  await Promise.all(
    [...bySite.entries()].map(async ([site, siteQueries]) => {
      for (const query of siteQueries) {
        const pages = query.pages ?? 1;
        for (let page = 1; page <= pages; page++) {
          const url = searchUrl(query, page);
          const label = queryLabel(query, page);
          try {
            const { data, fromCache } = await fetchJsonCached<OffSearchResponse>(url, {
              limiter: searchLimiters[site],
              cacheFile: path.join(CACHE_DIR, "search", `${cacheKey(url)}.json`),
              refresh,
            });
            const products = data.products ?? [];
            let accepted = 0;
            for (const raw of products) {
              const result = normalizeOffProduct(raw, query.site, query.category);
              if (!result.ok) {
                report.screeningRejections[result.reason] = (report.screeningRejections[result.reason] ?? 0) + 1;
                continue;
              }
              if (accepted >= query.take) continue;
              accepted++;
              const p = result.product;
              const existing = byCode.get(p.barcode);
              if (existing) {
                existing.queries.push(label);
                if (query.category === "produits-bio" && p.category === "produits-bio") existing.category = "produits-bio";
                continue;
              }
              const previewUrl = raw.image_front_url && isAllowedImageUrl(raw.image_front_url) ? raw.image_front_url : p.imageUrl;
              byCode.set(p.barcode, {
                code: p.barcode,
                site: query.site,
                hint: query.category,
                category: p.category,
                popularity: p.popularity,
                brandSlug: p.brandSlug,
                queries: [label],
                previewUrl,
              });
            }
            report.queries.push({ label, site, category: query.category, returned: products.length, accepted });
            console.log(`  ${fromCache ? "·" : "✓"} ${label} → ${products.length} résultats, ${accepted} retenus`);
            if (products.length < (query.pageSize ?? 100)) break;
          } catch (error) {
            report.queries.push({ label, site, category: query.category, returned: 0, accepted: 0, error: (error as Error).message });
            console.error(`  ✗ ${label} : ${(error as Error).message}`);
            break;
          }
        }
      }
    }),
  );

  // Tri des photos rayon par rayon, par popularité décroissante : on s'arrête dès
  // que le rayon dispose d'assez de packshots (inutile d'analyser des milliers de photos).
  const all = [...byCode.values()].filter((c) => !only || only.has(c.category));
  console.log(`\n🖼️  Tri des photos (${all.length} candidats au total)…`);
  const screen = async (c: Candidate) => {
    const previewFile = path.join(CACHE_DIR, "previews", `${c.code}.jpg`);
    try {
      const cached = analysis[c.code];
      if (cached) {
        c.imageClass = cached.cls;
        c.backgroundScore = cached.score;
      } else {
        await downloadCached(c.previewUrl, { limiter: limiters.image, cacheFile: previewFile });
        const result = await analyzeBackground(previewFile);
        c.imageClass = result.packshot ? "packshot" : result.backgroundScore >= 0.25 ? "ml" : "busy";
        c.backgroundScore = result.backgroundScore;
        analysis[c.code] = { cls: c.imageClass, score: result.backgroundScore };
      }
      report.imageClasses[c.imageClass]++;
    } catch {
      report.imageClasses.error++;
      c.error = "aperçu indisponible";
    }
  };

  const pool: Candidate[] = [];
  for (const category of CATEGORIES) {
    if (only && !only.has(category.slug)) continue;
    const target = CATEGORY_TARGETS[category.slug];
    const wantedPackshots = Math.ceil(target * PACKSHOT_FACTOR);
    const inCategory = all.filter((c) => c.category === category.slug).sort((a, b) => b.popularity - a.popularity);
    const perBrand = new Map<string, number>();
    const packshots: Candidate[] = [];
    const reserve: Candidate[] = [];
    for (let i = 0; i < inCategory.length && packshots.length < wantedPackshots; i += 8) {
      const batch = inCategory.slice(i, i + 8).filter((c) => (perBrand.get(c.brandSlug ?? `_${c.code}`) ?? 0) < POOL_BRAND_CAP);
      await mapLimit(batch, 4, screen);
      for (const c of batch) {
        if (c.error || c.imageClass === "busy") continue;
        const key = c.brandSlug ?? `_${c.code}`;
        if ((perBrand.get(key) ?? 0) >= POOL_BRAND_CAP) continue;
        if (c.imageClass === "packshot" && packshots.length < wantedPackshots) {
          packshots.push(c);
          perBrand.set(key, (perBrand.get(key) ?? 0) + 1);
        } else if (c.imageClass === "ml") {
          reserve.push(c);
        }
      }
      await writeFile(analysisFile, JSON.stringify(analysis));
    }
    const missing = Math.max(0, Math.ceil(target * 1.15) - packshots.length);
    const ml = reserve.sort((a, b) => (b.backgroundScore ?? 0) - (a.backgroundScore ?? 0) || b.popularity - a.popularity).slice(0, missing > 0 ? Math.ceil(missing * ML_RESERVE_FACTOR) + 4 : 0);
    report.candidatesByCategory[category.slug] = { packshot: packshots.length, ml: ml.length };
    pool.push(...packshots, ...ml);
    console.log(`📦 ${category.name.padEnd(34)} packshots ${String(packshots.length).padStart(3)} · IA ${String(ml.length).padStart(3)} (objectif ${target}, ${inCategory.length} candidats)`);
  }
  console.log(`  photos analysées — packshots : ${report.imageClasses.packshot} · fond non uni : ${report.imageClasses.ml} · en situation (écartées) : ${report.imageClasses.busy}`);

  console.log(`\n📄 Fiches produits : ${pool.length} lectures API v3 (avec cache)…`);
  let done = 0;
  for (const candidate of pool) {
    const url = `${OFF_SITE_HOSTS[candidate.site]}/api/v3/product/${candidate.code}?fields=${PRODUCT_FIELDS}`;
    const productFile = path.join(CACHE_DIR, "products", `${candidate.site}-${candidate.code}.json`);
    try {
      const { data } = await fetchJsonCached<OffV3ProductResponse>(url, { limiter: limiters.product, cacheFile: productFile, refresh });
      if (!data.product) throw new Error(`fiche introuvable (${data.result?.id ?? data.status})`);
      candidate.productFile = path.relative(process.cwd(), productFile);
      const normalized = normalizeOffProduct({ ...data.product, code: candidate.code }, candidate.site, candidate.hint);
      if (normalized.ok) candidate.imageUrl = normalized.product.imageUrl;
      else candidate.error = `rejet après lecture de la fiche : ${normalized.reason}`;
    } catch (error) {
      candidate.error = (error as Error).message;
      report.productErrors++;
    }
    if (++done % 50 === 0) console.log(`  … ${done}/${pool.length}`);
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(CANDIDATES_FILE, JSON.stringify({ report, candidates: pool }, null, 2));
  const ok = pool.filter((c) => c.productFile && !c.error).length;
  console.log(`\n✅ Collecte terminée : ${ok} candidats exploitables sur ${pool.length}.`);
  console.log(`   Étape suivante : pnpm catalog:build`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
