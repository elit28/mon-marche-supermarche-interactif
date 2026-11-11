/**
 * Accès au catalogue (lecture) — requêtes SQL paramétrées via postgres.js.
 * Toutes les entrées utilisateur passent par des paramètres liés : aucune
 * concaténation de chaîne dans le SQL.
 */
import { CATEGORIES, getCategoryDefinition } from "@/lib/catalog/categories";
import { applyPromotion } from "@/lib/pricing";
import { tokenizeQuery } from "@/lib/search-text";
import type { CategorySummary, NutriscoreGrade, ProductDetail, ProductSummary, ShelfPage } from "@/types/catalog";
import { getSql } from "../db";
import { OFF_SITE_LABELS, type OffSite } from "../catalog/off-types";
import type { SearchRow } from "../search/engine";
import { memo } from "./memo";

interface SummaryRow {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  quantity_label: string | null;
  net_amount: string | number | null;
  net_unit: "g" | "ml" | null;
  category: string;
  subshelf: string;
  amount_cents: number;
  is_demo: boolean;
  promo_kind: "percent" | "amount" | null;
  promo_value: number | null;
  promo_label: string | null;
  promo_is_demo: boolean | null;
  image_path: string;
  image_width: number;
  image_height: number;
  is_cutout: boolean;
  dominant_color: string | null;
  nutriscore_grade: NutriscoreGrade | null;
  is_organic: boolean;
}

/** Fragment SQL commun : produit + rayon + prix + image + promotion en cours. */
function summarySelect() {
  const sql = getSql();
  return sql`
    SELECT p.id, p.barcode, p.name, b.name AS brand, p.quantity_label, p.net_amount, p.net_unit,
           c.slug AS category, p.subshelf, pr.amount_cents, pr.is_demo,
           promo.kind AS promo_kind, promo.value AS promo_value, promo.label AS promo_label, promo.is_demo AS promo_is_demo,
           i.path AS image_path, i.width AS image_width, i.height AS image_height, i.is_cutout, i.dominant_color,
           p.nutriscore_grade, p.is_organic
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN prices pr ON pr.product_id = p.id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN LATERAL (
      SELECT kind, value, label, is_demo FROM promotions pm
      WHERE pm.product_id = p.id AND pm.is_active AND pm.starts_at <= now() AND (pm.ends_at IS NULL OR pm.ends_at > now())
      ORDER BY pm.created_at DESC
      LIMIT 1
    ) promo ON true
  `;
}

const ACTIVE = () => getSql()`p.is_active AND c.is_active AND i.quality_status <> 'rejected'`;

export function toSummary(r: SummaryRow): ProductSummary {
  return {
    id: r.id,
    barcode: r.barcode,
    name: r.name,
    brand: r.brand,
    quantity: r.quantity_label,
    netAmount: r.net_amount === null ? null : Number(r.net_amount),
    netUnit: r.net_unit,
    category: r.category,
    subshelf: r.subshelf,
    priceCents: r.amount_cents,
    isDemoPrice: r.is_demo,
    promotion:
      r.promo_kind && r.promo_value !== null
        ? { kind: r.promo_kind, value: r.promo_value, label: r.promo_label ?? "", isDemo: r.promo_is_demo ?? true }
        : null,
    image: {
      src: r.image_path,
      width: r.image_width,
      height: r.image_height,
      cutout: r.is_cutout,
      color: r.dominant_color ?? "#d6d3c4",
    },
    nutriscore: r.nutriscore_grade,
    organic: r.is_organic,
  };
}

export function finalPrice(p: Pick<ProductSummary, "priceCents" | "promotion">): number {
  return applyPromotion(p.priceCents, p.promotion);
}

/* ------------------------------------------------------------------------ */
/* Rayons                                                                   */
/* ------------------------------------------------------------------------ */

export async function listCategories(): Promise<CategorySummary[]> {
  return memo("categories", 30_000, async () => {
    const sql = getSql();
    const rows = await sql<{ slug: string; name: string; short_name: string; description: string; accent: string; count: number }[]>`
      SELECT c.slug, c.name, c.short_name, c.description, c.accent, count(p.id)::int AS count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active
      WHERE c.is_active
      GROUP BY c.id
      ORDER BY c.position
    `;
    return rows
      .filter((r) => r.count > 0)
      .map((r) => ({ slug: r.slug, name: r.name, shortName: r.short_name, description: r.description, accent: r.accent, productCount: r.count }));
  });
}

export async function getShelf(slug: string, options: { offset?: number; limit?: number; subshelf?: string } = {}): Promise<ShelfPage> {
  const sql = getSql();
  const limit = Math.min(Math.max(options.limit ?? 18, 1), 60);
  const offset = Math.max(options.offset ?? 0, 0);
  const subshelf = options.subshelf ?? null;
  const rows = await sql<SummaryRow[]>`
    ${summarySelect()}
    WHERE ${ACTIVE()} AND c.slug = ${slug} AND (${subshelf}::text IS NULL OR p.subshelf = ${subshelf})
    ORDER BY p.shelf_rank, p.id
    LIMIT ${limit} OFFSET ${offset}
  `;
  const totalRows = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total FROM products p JOIN categories c ON c.id = p.category_id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    WHERE ${ACTIVE()} AND c.slug = ${slug} AND (${subshelf}::text IS NULL OR p.subshelf = ${subshelf})
  `;
  const total = totalRows[0]?.total ?? 0;
  const products = rows.map(toSummary);
  return { products, total, nextOffset: offset + products.length < total ? offset + products.length : null };
}

/** Étagères d'un rayon (sous-rayons) avec leur nombre de produits. */
export async function getSubshelves(slug: string): Promise<Array<{ slug: string; name: string; count: number }>> {
  const def = getCategoryDefinition(slug);
  if (!def) return [];
  const sql = getSql();
  const rows = await sql<{ subshelf: string; count: number }[]>`
    SELECT p.subshelf, count(*)::int AS count
    FROM products p JOIN categories c ON c.id = p.category_id
    WHERE p.is_active AND c.slug = ${slug}
    GROUP BY p.subshelf
  `;
  const counts = new Map(rows.map((r) => [r.subshelf, r.count]));
  return def.subshelves.map((s) => ({ slug: s.slug, name: s.name, count: counts.get(s.slug) ?? 0 })).filter((s) => s.count > 0);
}

export async function getProductsByIds(ids: readonly number[]): Promise<ProductSummary[]> {
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 200);
  if (unique.length === 0) return [];
  const sql = getSql();
  const rows = await sql<SummaryRow[]>`${summarySelect()} WHERE ${ACTIVE()} AND p.id = ANY(${unique}::int[])`;
  const byId = new Map(rows.map((r) => [r.id, toSummary(r)]));
  return unique.map((id) => byId.get(id)).filter((p): p is ProductSummary => Boolean(p));
}

export async function getPromotedProducts(limit = 24, offset = 0): Promise<ShelfPage> {
  const sql = getSql();
  const rows = await sql<SummaryRow[]>`
    ${summarySelect()}
    WHERE ${ACTIVE()} AND promo.kind IS NOT NULL
    ORDER BY p.is_featured DESC, p.popularity DESC, p.id
    LIMIT ${limit} OFFSET ${offset}
  `;
  const totalRows = await sql<{ total: number }[]>`
    SELECT count(DISTINCT p.id)::int AS total FROM products p
    JOIN promotions pm ON pm.product_id = p.id AND pm.is_active AND pm.starts_at <= now() AND (pm.ends_at IS NULL OR pm.ends_at > now())
    WHERE p.is_active
  `;
  const total = totalRows[0]?.total ?? 0;
  const products = rows.map(toSummary);
  return { products, total, nextOffset: offset + products.length < total ? offset + products.length : null };
}

export async function getFeaturedProducts(limit = 24): Promise<ProductSummary[]> {
  return memo(`featured:${limit}`, 30_000, async () => {
    const sql = getSql();
    const rows = await sql<SummaryRow[]>`
      ${summarySelect()}
      WHERE ${ACTIVE()} AND p.is_featured
      ORDER BY c.position, p.shelf_rank
    `;
    // Une sélection variée : on alterne les rayons.
    const byCategory = new Map<string, ProductSummary[]>();
    for (const r of rows) {
      const list = byCategory.get(r.category) ?? [];
      list.push(toSummary(r));
      byCategory.set(r.category, list);
    }
    const result: ProductSummary[] = [];
    for (let round = 0; result.length < limit && round < 6; round++) {
      for (const list of byCategory.values()) {
        if (list[round]) result.push(list[round]!);
        if (result.length >= limit) break;
      }
    }
    return result;
  });
}

/* ------------------------------------------------------------------------ */
/* Fiche produit                                                            */
/* ------------------------------------------------------------------------ */

export async function getProductDetail(barcode: string): Promise<ProductDetail | null> {
  if (!/^\d{8,14}$/.test(barcode)) return null;
  const sql = getSql();
  const rows = await sql<
    (SummaryRow & {
      generic_name: string | null;
      nova_group: number | null;
      source: OffSite;
      source_url: string;
      license: string;
      source_last_modified_at: Date | null;
      attribution: string;
      image_license: string;
      per: string | null;
      energy_kcal: number | null;
      fat: number | null;
      saturated_fat: number | null;
      carbohydrates: number | null;
      sugars: number | null;
      fiber: number | null;
      proteins: number | null;
      salt: number | null;
      serving_size: string | null;
      ingredients_text: string | null;
      allergens: string[] | null;
      traces: string[] | null;
      has_nutrition: boolean;
    })[]
  >`
    SELECT s.*, p.generic_name, p.nova_group, ps.source, ps.source_url, ps.license, ps.source_last_modified_at,
           i.attribution, i.license AS image_license,
           n.per, n.energy_kcal, n.fat, n.saturated_fat, n.carbohydrates, n.sugars, n.fiber, n.proteins, n.salt,
           n.serving_size, n.ingredients_text, n.allergens, n.traces,
           (n.energy_kcal IS NOT NULL OR n.fat IS NOT NULL OR n.sugars IS NOT NULL OR n.proteins IS NOT NULL OR n.salt IS NOT NULL) AS has_nutrition
    FROM (${summarySelect()} WHERE ${ACTIVE()} AND p.barcode = ${barcode}) s
    JOIN products p ON p.id = s.id
    JOIN product_sources ps ON ps.product_id = p.id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    LEFT JOIN product_nutrition n ON n.product_id = p.id
  `;
  const r = rows[0];
  if (!r) return null;
  const summary = toSummary(r);
  const category = getCategoryDefinition(summary.category);
  return {
    ...summary,
    genericName: r.generic_name,
    categoryName: category?.name ?? summary.category,
    subshelfName: category?.subshelves.find((s) => s.slug === summary.subshelf)?.name ?? "",
    novaGroup: r.nova_group,
    ingredientsText: r.ingredients_text,
    allergens: r.allergens ?? [],
    traces: r.traces ?? [],
    nutrition: r.has_nutrition
      ? {
          per: r.per === "100ml" ? "100ml" : "100g",
          energyKcal: r.energy_kcal,
          fat: r.fat,
          saturatedFat: r.saturated_fat,
          carbohydrates: r.carbohydrates,
          sugars: r.sugars,
          fiber: r.fiber,
          proteins: r.proteins,
          salt: r.salt,
        }
      : null,
    servingSize: r.serving_size,
    source: {
      name: OFF_SITE_LABELS[r.source] ?? "Open Food Facts",
      url: r.source_url,
      license: r.license,
      lastModifiedAt: r.source_last_modified_at ? r.source_last_modified_at.toISOString() : null,
    },
    imageAttribution: r.attribution,
    imageLicense: r.image_license,
  };
}

/** Produits similaires : même étagère, puis même marque, puis même rayon. */
export async function getSimilarProducts(product: Pick<ProductSummary, "id" | "category" | "subshelf" | "brand">, limit = 12): Promise<ProductSummary[]> {
  const sql = getSql();
  const rows = await sql<(SummaryRow & { rank: number })[]>`
    ${summarySelect()}
    WHERE ${ACTIVE()} AND p.id <> ${product.id}
      AND (c.slug = ${product.category} OR (${product.brand}::text IS NOT NULL AND b.name = ${product.brand}))
    ORDER BY (p.subshelf = ${product.subshelf} AND c.slug = ${product.category}) DESC,
             (${product.brand}::text IS NOT NULL AND b.name = ${product.brand}) DESC,
             p.shelf_rank, p.id
    LIMIT ${limit}
  `;
  return rows.map(toSummary);
}

/* ------------------------------------------------------------------------ */
/* Recherche : sélection des candidats en base                              */
/* ------------------------------------------------------------------------ */

function escapeLike(token: string): string {
  return token.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Retourne les lignes candidates pour une requête texte (ou tout le catalogue
 * si la requête est vide). Tolérance : accents (texte normalisé à l'import),
 * pluriels (racinisation simple), fautes de frappe (similarité trigrammes).
 */
export async function findSearchRows(query: string, limit = 2000): Promise<SearchRow[]> {
  const sql = getSql();
  const tokens = tokenizeQuery(query);
  const digits = query.replace(/\s/g, "");
  const isBarcode = /^\d{6,14}$/.test(digits);

  const textConditions = tokens.map((t) => sql`(p.search_text LIKE ${`%${escapeLike(t)}%`} OR ${t} <% p.search_text)`);
  const where = isBarcode
    ? sql`p.barcode LIKE ${`${digits}%`}`
    : tokens.length > 0
      ? textConditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
      : sql`true`;

  const scoreParts = tokens.map(
    (t) => sql`(
      CASE WHEN position(${` ${t}`} in ' ' || unaccent(lower(p.name))) > 0 THEN 3 ELSE 0 END
      + CASE WHEN unaccent(lower(coalesce(b.name, ''))) LIKE ${`${escapeLike(t)}%`} THEN 2 ELSE 0 END
      + word_similarity(${t}, p.search_text)
    )`,
  );
  const score = isBarcode ? sql`10` : scoreParts.length > 0 ? scoreParts.reduce((acc, part) => sql`${acc} + ${part}`) : sql`0`;

  const rows = await sql<
    {
      id: number;
      name: string;
      category: string;
      position: number;
      brand_slug: string | null;
      brand_name: string | null;
      amount_cents: number;
      promo_kind: "percent" | "amount" | null;
      promo_value: number | null;
      nutriscore_grade: string | null;
      is_organic: boolean;
      shelf_rank: number;
      popularity: number;
      created_at: Date;
      score: number;
    }[]
  >`
    SELECT p.id, p.name, c.slug AS category, c.position, b.slug AS brand_slug, b.name AS brand_name,
           pr.amount_cents, promo.kind AS promo_kind, promo.value AS promo_value,
           p.nutriscore_grade, p.is_organic, p.shelf_rank, p.popularity, p.created_at,
           (${score})::float AS score
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN prices pr ON pr.product_id = p.id
    JOIN product_images i ON i.product_id = p.id AND i.kind = 'front'
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN LATERAL (
      SELECT kind, value FROM promotions pm
      WHERE pm.product_id = p.id AND pm.is_active AND pm.starts_at <= now() AND (pm.ends_at IS NULL OR pm.ends_at > now())
      ORDER BY pm.created_at DESC LIMIT 1
    ) promo ON true
    WHERE ${ACTIVE()} AND ${where}
    ORDER BY score DESC, p.popularity DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => {
    const promotion = r.promo_kind && r.promo_value !== null ? { kind: r.promo_kind, value: r.promo_value } : null;
    return {
      id: r.id,
      name: r.name,
      categorySlug: r.category,
      categoryPosition: r.position,
      brandSlug: r.brand_slug,
      brandName: r.brand_name,
      priceCents: r.amount_cents,
      finalPriceCents: applyPromotion(r.amount_cents, promotion),
      nutriscore: r.nutriscore_grade,
      organic: r.is_organic,
      hasPromo: promotion !== null,
      shelfRank: r.shelf_rank,
      popularity: r.popularity,
      createdAt: r.created_at.getTime(),
      textScore: r.score + Math.log1p(r.popularity) / 8,
    };
  });
}

export function categoryNameMap(): Map<string, string> {
  return new Map(CATEGORIES.map((c) => [c.slug, c.name]));
}
