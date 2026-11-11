/**
 * Mise à jour incrémentale du catalogue depuis Open Food Facts (API v3).
 *
 * Les fiches déjà importées sont relues, des plus anciennement importées aux
 * plus récentes ; seules celles modifiées à la source (`last_modified_t`) sont
 * mises à jour. Les corrections de l'administration (rayon verrouillé,
 * désactivation, prix) ne sont jamais écrasées. Les photos ne sont pas
 * retéléchargées : si la photo de face a changé à la source, la fiche est
 * signalée pour contrôle (`pnpm catalog:import` régénère les images).
 */
import { sql as dsql } from "drizzle-orm";
import type { CategorySlug } from "../../lib/catalog/categories";
import type { Database } from "../db";
import { importJobs } from "../db/schema";
import { getSql } from "../db";
import { RateLimiter, USER_AGENT } from "./http";
import { normalizeOffProduct } from "./normalize";
import { OFF_SITE_HOSTS, PRODUCT_FIELDS, type OffSite, type OffV3ProductResponse } from "./off-types";
import { buildSearchText } from "./seed";

export interface RefreshOptions {
  triggeredBy: string;
  /** Nombre maximal de fiches relues par exécution (respect des limites d'API). */
  limit?: number;
  fetchImpl?: typeof fetch;
  intervalMs?: number;
}

export interface RefreshStats {
  checked: number;
  updated: number;
  unchanged: number;
  imageChanged: number;
  failed: number;
  notFound: number;
}

export async function refreshFromOpenFoodFacts(db: Database, options: RefreshOptions): Promise<RefreshStats> {
  const sql = getSql();
  const doFetch = options.fetchImpl ?? fetch;
  const limiter = new RateLimiter(options.intervalMs ?? 700);
  const [job] = await db
    .insert(importJobs)
    .values({ kind: "off-refresh", status: "running", triggeredBy: options.triggeredBy })
    .returning({ id: importJobs.id });
  const jobId = job!.id;
  const log: string[] = [];
  const stats: RefreshStats = { checked: 0, updated: 0, unchanged: 0, imageChanged: 0, failed: 0, notFound: 0 };

  const targets = await sql<
    { id: number; barcode: string; source: OffSite; category: CategorySlug; category_locked: boolean; last: Date | null; original_url: string }[]
  >`
    SELECT p.id, p.barcode, ps.source, c.slug AS category, p.category_locked, ps.source_last_modified_at AS last, i.original_url
    FROM products p
    JOIN product_sources ps ON ps.product_id = p.id
    JOIN categories c ON c.id = p.category_id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    ORDER BY ps.imported_at ASC, p.id
    LIMIT ${options.limit ?? 120}
  `;

  try {
    for (const t of targets) {
      stats.checked++;
      await limiter.wait();
      try {
        const url = `${OFF_SITE_HOSTS[t.source]}/api/v3/product/${t.barcode}?fields=${PRODUCT_FIELDS}`;
        const res = await doFetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
        if (res.status === 404) {
          stats.notFound++;
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as OffV3ProductResponse;
        if (!data.product) {
          stats.notFound++;
          continue;
        }
        const modified = data.product.last_modified_t ? new Date(data.product.last_modified_t * 1000) : null;
        if (modified && t.last && modified <= t.last) {
          stats.unchanged++;
          await sql`UPDATE product_sources SET imported_at = now() WHERE product_id = ${t.id}`;
          continue;
        }
        const normalized = normalizeOffProduct({ ...data.product, code: t.barcode }, t.source, t.category);
        if (!normalized.ok) {
          log.push(`${t.barcode} : fiche source devenue non conforme (${normalized.reason}), conservée telle quelle.`);
          await sql`UPDATE product_sources SET imported_at = now() WHERE product_id = ${t.id}`;
          continue;
        }
        const p = normalized.product;
        const category = t.category_locked ? t.category : p.category;
        await sql.begin(async (tx) => {
          await tx`
            UPDATE products SET name = ${p.name}, generic_name = ${p.genericName}, quantity_label = ${p.quantityLabel},
              net_amount = ${p.netAmount}, net_unit = ${p.netUnit}, is_organic = ${p.organic}, nutriscore_grade = ${p.nutriscoreGrade},
              nova_group = ${p.novaGroup}, popularity = ${p.popularity},
              search_text = ${buildSearchText({ ...p, category, subshelf: p.subshelf })}, updated_at = now()
            WHERE id = ${t.id}
          `;
          await tx`
            UPDATE product_sources SET raw_name = ${p.rawName}, raw_brands = ${p.rawBrands}, categories_tags = ${p.categoriesTags},
              labels_tags = ${p.labelsTags}, source_last_modified_at = ${modified}, imported_at = now(), import_job_id = ${jobId}
            WHERE product_id = ${t.id}
          `;
          if (p.nutrition || p.ingredientsText) {
            await tx`
              INSERT INTO product_nutrition (product_id, per, energy_kcal, fat, saturated_fat, carbohydrates, sugars, fiber, proteins, salt, serving_size, ingredients_text, allergens, traces)
              VALUES (${t.id}, ${p.nutrition?.per ?? "100g"}, ${p.nutrition?.energyKcal ?? null}, ${p.nutrition?.fat ?? null}, ${p.nutrition?.saturatedFat ?? null},
                      ${p.nutrition?.carbohydrates ?? null}, ${p.nutrition?.sugars ?? null}, ${p.nutrition?.fiber ?? null}, ${p.nutrition?.proteins ?? null},
                      ${p.nutrition?.salt ?? null}, ${p.servingSize}, ${p.ingredientsText}, ${p.allergens}, ${p.traces})
              ON CONFLICT (product_id) DO UPDATE SET per = EXCLUDED.per, energy_kcal = EXCLUDED.energy_kcal, fat = EXCLUDED.fat,
                saturated_fat = EXCLUDED.saturated_fat, carbohydrates = EXCLUDED.carbohydrates, sugars = EXCLUDED.sugars, fiber = EXCLUDED.fiber,
                proteins = EXCLUDED.proteins, salt = EXCLUDED.salt, serving_size = EXCLUDED.serving_size,
                ingredients_text = EXCLUDED.ingredients_text, allergens = EXCLUDED.allergens, traces = EXCLUDED.traces
            `;
          }
          if (p.imageUrl !== t.original_url) {
            await tx`UPDATE product_images SET quality_status = 'flagged' WHERE product_id = ${t.id} AND kind = 'front' AND quality_status = 'ok'`;
          }
        });
        if (p.imageUrl !== t.original_url) stats.imageChanged++;
        stats.updated++;
        log.push(`${t.barcode} : mis à jour (${p.name}).`);
      } catch (error) {
        stats.failed++;
        log.push(`${t.barcode} : échec (${(error as Error).message}).`);
      }
    }
    await db
      .update(importJobs)
      .set({
        status: stats.failed > 0 && stats.updated + stats.unchanged === 0 ? "failed" : stats.failed > 0 ? "partial" : "succeeded",
        finishedAt: new Date(),
        stats: stats as unknown as Record<string, unknown>,
        log: log.slice(-400).join("\n"),
      })
      .where(dsql`${importJobs.id} = ${jobId}`);
  } catch (error) {
    await db
      .update(importJobs)
      .set({ status: "failed", finishedAt: new Date(), error: (error as Error).message, log: log.join("\n") })
      .where(dsql`${importJobs.id} = ${jobId}`);
    throw error;
  }
  return stats;
}
