/**
 * Opérations d'administration (lecture et écriture). Chaque fonction est
 * appelée depuis une action serveur qui a déjà vérifié le rôle administrateur.
 */
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCategoryDefinition } from "@/lib/catalog/categories";
import { getSql, getDb } from "../db";
import { importSnapshot } from "../catalog/seed";
import type { SnapshotFile } from "../catalog/snapshot";
import { refreshFromOpenFoodFacts } from "../catalog/refresh";
import { invalidateMemo } from "./memo";

export async function getDashboardStats() {
  const sql = getSql();
  const [counts] = await sql<
    { active: number; inactive: number; featured: number; incomplete: number; not_cutout: number; flagged: number; promos: number; orders: number; lists: number }[]
  >`
    SELECT
      count(*) FILTER (WHERE p.is_active)::int AS active,
      count(*) FILTER (WHERE NOT p.is_active)::int AS inactive,
      count(*) FILTER (WHERE p.is_featured AND p.is_active)::int AS featured,
      count(*) FILTER (WHERE p.is_active AND cardinality(p.quality_issues) > 0)::int AS incomplete,
      count(*) FILTER (WHERE p.is_active AND NOT i.is_cutout)::int AS not_cutout,
      count(*) FILTER (WHERE i.quality_status <> 'ok')::int AS flagged,
      (SELECT count(*)::int FROM promotions WHERE is_active) AS promos,
      (SELECT count(*)::int FROM demo_orders) AS orders,
      (SELECT count(*)::int FROM shopping_lists) AS lists
    FROM products p JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
  `;
  const issues = await sql<{ issue: string; count: number }[]>`
    SELECT issue, count(*)::int AS count FROM products, unnest(quality_issues) AS issue
    WHERE is_active GROUP BY issue ORDER BY count DESC
  `;
  return { counts: counts!, issues };
}

export type AdminProductStatus = "tous" | "actifs" | "inactifs" | "incomplets" | "non-detoures" | "signales" | "en-avant";

export interface AdminProductRow {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  quantity_label: string | null;
  category: string;
  subshelf: string;
  category_locked: boolean;
  is_active: boolean;
  is_featured: boolean;
  amount_cents: number;
  is_demo: boolean;
  image_path: string;
  image_width: number;
  image_height: number;
  is_cutout: boolean;
  quality_status: string;
  quality_score: number;
  quality_issues: string[];
  source_url: string;
}

export async function listAdminProducts(options: { q?: string; category?: string; status?: AdminProductStatus; page?: number }) {
  const sql = getSql();
  const pageSize = 40;
  const page = Math.max(1, options.page ?? 1);
  const q = (options.q ?? "").trim().toLowerCase();
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const category = options.category && /^[a-z0-9-]+$/.test(options.category) ? options.category : null;
  const status = options.status ?? "tous";
  const statusFilter = {
    tous: sql`true`,
    actifs: sql`p.is_active`,
    inactifs: sql`NOT p.is_active`,
    incomplets: sql`cardinality(p.quality_issues) > 0`,
    "non-detoures": sql`NOT i.is_cutout`,
    signales: sql`i.quality_status <> 'ok'`,
    "en-avant": sql`p.is_featured`,
  }[status];

  const where = sql`
    (${q} = '' OR p.search_text LIKE ${like} OR p.barcode LIKE ${like})
    AND (${category}::text IS NULL OR c.slug = ${category})
    AND ${statusFilter}
  `;
  const rows = await sql<AdminProductRow[]>`
    SELECT p.id, p.barcode, p.name, b.name AS brand, p.quantity_label, c.slug AS category, p.subshelf, p.category_locked,
           p.is_active, p.is_featured, pr.amount_cents, pr.is_demo, i.path AS image_path, i.width AS image_width, i.height AS image_height,
           i.is_cutout, i.quality_status, p.quality_score, p.quality_issues, ps.source_url
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN prices pr ON pr.product_id = p.id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    JOIN product_sources ps ON ps.product_id = p.id
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE ${where}
    ORDER BY c.position, p.shelf_rank, p.id
    LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
  `;
  const [{ total }] = (await sql<{ total: number }[]>`
    SELECT count(*)::int AS total FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    WHERE ${where}
  `) as unknown as [{ total: number }];
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function setProductCategory(productId: number, categorySlug: string, subshelf: string): Promise<boolean> {
  const def = getCategoryDefinition(categorySlug);
  if (!def || !def.subshelves.some((s) => s.slug === subshelf)) return false;
  const rows = await getSql()`
    UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = ${categorySlug}), subshelf = ${subshelf},
      category_locked = true, updated_at = now()
    WHERE id = ${productId} RETURNING id
  `;
  invalidateMemo();
  return rows.length > 0;
}

export async function setProductFlag(productId: number, flag: "is_active" | "is_featured", value: boolean): Promise<void> {
  const sql = getSql();
  if (flag === "is_active") await sql`UPDATE products SET is_active = ${value}, updated_at = now() WHERE id = ${productId}`;
  else await sql`UPDATE products SET is_featured = ${value}, updated_at = now() WHERE id = ${productId}`;
  invalidateMemo();
}

export async function setImageQuality(productId: number, status: "ok" | "flagged" | "rejected"): Promise<void> {
  await getSql()`UPDATE product_images SET quality_status = ${status} WHERE product_id = ${productId} AND kind = 'front'`;
  invalidateMemo();
}

/** Met à jour un prix de démonstration et l'historise. */
export async function updatePrice(productId: number, amountCents: number, changedBy: string, reason: string): Promise<boolean> {
  const sql = getSql();
  return sql.begin(async (tx) => {
    const [current] = await tx<{ amount_cents: number }[]>`SELECT amount_cents FROM prices WHERE product_id = ${productId} FOR UPDATE`;
    if (!current) return false;
    if (current.amount_cents === amountCents) return true;
    await tx`UPDATE prices SET amount_cents = ${amountCents}, source = 'demo-admin', is_demo = true, updated_at = now() WHERE product_id = ${productId}`;
    await tx`
      INSERT INTO price_history (product_id, previous_cents, amount_cents, source, reason, changed_by)
      VALUES (${productId}, ${current.amount_cents}, ${amountCents}, 'demo-admin', ${reason}, ${changedBy})
    `;
    return true;
  });
}

export async function getPriceHistory(productId: number) {
  return getSql()<{ previous_cents: number | null; amount_cents: number; source: string; reason: string | null; changed_by: string | null; changed_at: Date }[]>`
    SELECT previous_cents, amount_cents, source, reason, changed_by, changed_at FROM price_history
    WHERE product_id = ${productId} ORDER BY changed_at DESC LIMIT 20
  `;
}

export async function listPromotions() {
  return getSql()<
    { id: number; product_id: number; barcode: string; name: string; brand: string | null; image_path: string; amount_cents: number; kind: "percent" | "amount"; value: number; label: string; is_active: boolean; starts_at: Date; ends_at: Date | null }[]
  >`
    SELECT pm.id, p.id AS product_id, p.barcode, p.name, b.name AS brand, i.path AS image_path, pr.amount_cents,
           pm.kind, pm.value, pm.label, pm.is_active, pm.starts_at, pm.ends_at
    FROM promotions pm
    JOIN products p ON p.id = pm.product_id
    JOIN prices pr ON pr.product_id = p.id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    LEFT JOIN brands b ON b.id = p.brand_id
    ORDER BY pm.is_active DESC, pm.created_at DESC
    LIMIT 300
  `;
}

export async function createPromotion(input: { barcode: string; kind: "percent" | "amount"; value: number; endsAt: Date | null }): Promise<string | null> {
  const sql = getSql();
  const [product] = await sql<{ id: number }[]>`SELECT id FROM products WHERE barcode = ${input.barcode}`;
  if (!product) return "Aucun produit ne porte ce code-barres.";
  const label = input.kind === "percent" ? `-${input.value} %` : `-${(input.value / 100).toFixed(2).replace(".", ",")} €`;
  await sql.begin(async (tx) => {
    await tx`UPDATE promotions SET is_active = false WHERE product_id = ${product.id} AND is_active`;
    await tx`
      INSERT INTO promotions (product_id, kind, value, label, is_demo, is_active, ends_at)
      VALUES (${product.id}, ${input.kind}, ${input.value}, ${label}, true, true, ${input.endsAt})
    `;
  });
  invalidateMemo();
  return null;
}

export async function setPromotionActive(promotionId: number, active: boolean): Promise<void> {
  await getSql()`UPDATE promotions SET is_active = ${active} WHERE id = ${promotionId}`;
  invalidateMemo();
}

export async function deletePromotion(promotionId: number): Promise<void> {
  await getSql()`DELETE FROM promotions WHERE id = ${promotionId}`;
  invalidateMemo();
}

export async function listImportJobs() {
  return getSql()<{ id: number; kind: string; status: string; triggered_by: string; started_at: Date; finished_at: Date | null; stats: Record<string, unknown>; log: string; error: string | null }[]>`
    SELECT id, kind, status, triggered_by, started_at, finished_at, stats, log, error FROM import_jobs ORDER BY started_at DESC LIMIT 30
  `;
}

async function hasRunningJob(): Promise<boolean> {
  const rows = await getSql()`SELECT 1 FROM import_jobs WHERE status = 'running' AND started_at > now() - interval '2 hours'`;
  return rows.length > 0;
}

/** Réimporte l'instantané versionné (rapide, hors ligne). */
export async function runSnapshotImport(triggeredBy: string): Promise<string | null> {
  if (await hasRunningJob()) return "Un import est déjà en cours.";
  const file = path.join(process.cwd(), "data/catalog/products.json");
  const snapshot = JSON.parse(await readFile(file, "utf8")) as SnapshotFile;
  await importSnapshot(getDb(), snapshot, { triggeredBy });
  invalidateMemo();
  return null;
}

/** Lance en arrière-plan la mise à jour incrémentale depuis Open Food Facts (API v3). */
export async function startOffRefresh(triggeredBy: string): Promise<string | null> {
  if (process.env.ADMIN_IMPORT_ENABLED === "false") return "Les imports en ligne sont désactivés sur cette instance (ADMIN_IMPORT_ENABLED=false).";
  if (await hasRunningJob()) return "Un import est déjà en cours.";
  void refreshFromOpenFoodFacts(getDb(), { triggeredBy, limit: 120 })
    .catch((error) => console.error("Rafraîchissement OFF :", error))
    .finally(() => invalidateMemo());
  return null;
}
