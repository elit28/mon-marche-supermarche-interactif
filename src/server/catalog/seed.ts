/**
 * Import de l'instantané du catalogue en base (idempotent, rejouable).
 *
 * - Les fiches sont insérées ou mises à jour par code-barres.
 * - Les corrections faites dans l'administration sont préservées
 *   (catégorie verrouillée, désactivation, mise en avant, prix modifiés).
 * - Les prix de démonstration ne sont générés que pour les produits qui
 *   n'en ont pas encore ; chaque création est historisée.
 * - Les produits absents du nouvel instantané sont désactivés (jamais supprimés).
 */
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { CATEGORIES, getCategoryDefinition } from "../../lib/catalog/categories";
import { normalizeSearchText } from "../../lib/search-text";
import type { Database } from "../db";
import {
  brands,
  categories,
  importJobs,
  priceHistory,
  prices,
  productImages,
  productNutrition,
  productSources,
  products,
  promotions,
} from "../db/schema";
import { DEMO_PRICE_SOURCE, generateDemoPrice, generateDemoPromotion } from "../pricing/demo-prices";
import { OFF_SITE_LABELS } from "./off-types";
import type { SnapshotFile, SnapshotProduct } from "./snapshot";

export function buildSearchText(p: Pick<SnapshotProduct, "name" | "brand" | "genericName" | "quantityLabel" | "barcode" | "category" | "subshelf">): string {
  const category = getCategoryDefinition(p.category);
  const shelf = category?.subshelves.find((s) => s.slug === p.subshelf);
  return normalizeSearchText([p.name, p.brand, p.genericName, category?.name, shelf?.name, p.quantityLabel, p.barcode].filter(Boolean).join(" "));
}

export interface SeedStats {
  categories: number;
  brands: number;
  inserted: number;
  updated: number;
  deactivated: number;
  pricesCreated: number;
  promotionsCreated: number;
}

export async function importSnapshot(db: Database, snapshot: SnapshotFile, options: { triggeredBy?: string } = {}): Promise<{ jobId: number; stats: SeedStats }> {
  const [job] = await db
    .insert(importJobs)
    .values({ kind: "snapshot", status: "running", triggeredBy: options.triggeredBy ?? "cli", log: `Instantané du ${snapshot.generatedAt} (${snapshot.count} fiches)\n` })
    .returning({ id: importJobs.id });
  const jobId = job!.id;

  try {
    const stats = await db.transaction(async (tx) => {
      const stats: SeedStats = { categories: 0, brands: 0, inserted: 0, updated: 0, deactivated: 0, pricesCreated: 0, promotionsCreated: 0 };

      // Rayons.
      for (const [position, c] of CATEGORIES.entries()) {
        await tx
          .insert(categories)
          .values({ slug: c.slug, name: c.name, shortName: c.shortName, description: c.description, accent: c.accent, position })
          .onConflictDoUpdate({
            target: categories.slug,
            set: { name: c.name, shortName: c.shortName, description: c.description, accent: c.accent, position },
          });
        stats.categories++;
      }
      const categoryRows = await tx.select({ id: categories.id, slug: categories.slug }).from(categories);
      const categoryId = new Map(categoryRows.map((r) => [r.slug, r.id]));

      // Marques.
      const brandMap = new Map<string, string>();
      for (const p of snapshot.products) if (p.brand && p.brandSlug) brandMap.set(p.brandSlug, p.brand);
      for (const [slug, name] of brandMap) {
        await tx.insert(brands).values({ slug, name }).onConflictDoUpdate({ target: brands.slug, set: { name } });
        stats.brands++;
      }
      const brandRows = await tx.select({ id: brands.id, slug: brands.slug }).from(brands);
      const brandId = new Map(brandRows.map((r) => [r.slug, r.id]));

      const existingRows = await tx
        .select({ id: products.id, barcode: products.barcode, categoryLocked: products.categoryLocked })
        .from(products);
      const existing = new Map(existingRows.map((r) => [r.barcode, r]));

      for (const p of snapshot.products) {
        const catId = categoryId.get(p.category);
        if (!catId) continue;
        const base = {
          name: p.name,
          genericName: p.genericName,
          brandId: p.brandSlug ? (brandId.get(p.brandSlug) ?? null) : null,
          quantityLabel: p.quantityLabel,
          netAmount: p.netAmount,
          netUnit: p.netUnit,
          isOrganic: p.organic,
          nutriscoreGrade: p.nutriscoreGrade,
          novaGroup: p.novaGroup,
          shelfRank: p.shelfRank,
          popularity: p.popularity,
          qualityScore: p.qualityScore,
          qualityIssues: p.qualityIssues,
          searchText: buildSearchText(p),
          tags: [...p.categoriesTags, ...p.labelsTags].slice(0, 80),
          updatedAt: new Date(),
        };
        const previous = existing.get(p.barcode);
        let productId: number;
        if (previous) {
          await tx
            .update(products)
            .set({
              ...base,
              ...(previous.categoryLocked ? {} : { categoryId: catId, subshelf: p.subshelf }),
            })
            .where(eq(products.id, previous.id));
          productId = previous.id;
          stats.updated++;
        } else {
          const [row] = await tx
            .insert(products)
            .values({ ...base, barcode: p.barcode, categoryId: catId, subshelf: p.subshelf, isFeatured: p.shelfRank <= 2 })
            .returning({ id: products.id });
          productId = row!.id;
          stats.inserted++;
        }

        await tx
          .insert(productSources)
          .values({
            productId,
            source: p.source,
            sourceUrl: p.sourceUrl,
            license: "ODbL-1.0",
            rawName: p.rawName,
            rawBrands: p.rawBrands,
            categoriesTags: p.categoriesTags,
            labelsTags: p.labelsTags,
            sourceLastModifiedAt: p.lastModifiedAt ? new Date(p.lastModifiedAt * 1000) : null,
            importJobId: jobId,
          })
          .onConflictDoUpdate({
            target: productSources.productId,
            set: {
              source: p.source,
              sourceUrl: p.sourceUrl,
              rawName: p.rawName,
              rawBrands: p.rawBrands,
              categoriesTags: p.categoriesTags,
              labelsTags: p.labelsTags,
              sourceLastModifiedAt: p.lastModifiedAt ? new Date(p.lastModifiedAt * 1000) : null,
              importedAt: new Date(),
              importJobId: jobId,
            },
          });

        const image = {
          path: p.image.path,
          originalUrl: p.image.originalUrl,
          width: p.image.width,
          height: p.image.height,
          dominantColor: p.image.dominantColor,
          isCutout: p.image.isCutout,
          backgroundScore: p.image.backgroundScore,
          license: p.image.license,
          attribution: p.image.attribution || `Photo — ${OFF_SITE_LABELS[p.source]}, CC BY-SA 3.0`,
        };
        await tx
          .insert(productImages)
          .values({ productId, kind: "front", ...image })
          .onConflictDoUpdate({ target: [productImages.productId, productImages.kind], set: image });

        if (p.nutrition || p.ingredientsText || p.allergens.length > 0 || p.traces.length > 0) {
          const nutrition = {
            per: p.nutrition?.per ?? "100g",
            energyKcal: p.nutrition?.energyKcal ?? null,
            fat: p.nutrition?.fat ?? null,
            saturatedFat: p.nutrition?.saturatedFat ?? null,
            carbohydrates: p.nutrition?.carbohydrates ?? null,
            sugars: p.nutrition?.sugars ?? null,
            fiber: p.nutrition?.fiber ?? null,
            proteins: p.nutrition?.proteins ?? null,
            salt: p.nutrition?.salt ?? null,
            servingSize: p.servingSize,
            ingredientsText: p.ingredientsText,
            allergens: p.allergens,
            traces: p.traces,
          };
          await tx.insert(productNutrition).values({ productId, ...nutrition }).onConflictDoUpdate({ target: productNutrition.productId, set: nutrition });
        } else {
          await tx.delete(productNutrition).where(eq(productNutrition.productId, productId));
        }

        // Prix fictif : uniquement s'il n'existe pas encore (les prix modifiés par l'admin sont conservés).
        const amountCents = generateDemoPrice({
          barcode: p.barcode,
          category: p.category,
          subshelf: p.subshelf,
          netAmount: p.netAmount,
          netUnit: p.netUnit,
          organic: p.organic,
        });
        const createdPrice = await tx
          .insert(prices)
          .values({ productId, amountCents, source: DEMO_PRICE_SOURCE, isDemo: true })
          .onConflictDoNothing()
          .returning({ productId: prices.productId });
        if (createdPrice.length > 0) {
          stats.pricesCreated++;
          await tx.insert(priceHistory).values({
            productId,
            previousCents: null,
            amountCents,
            source: DEMO_PRICE_SOURCE,
            reason: "Prix initial de démonstration (fictif)",
            changedBy: options.triggeredBy ?? "import",
          });
        }

        if (!previous) {
          const promo = generateDemoPromotion(p.barcode, amountCents);
          if (promo) {
            await tx.insert(promotions).values({ productId, kind: promo.kind, value: promo.value, label: promo.label, isDemo: true });
            stats.promotionsCreated++;
          }
        }
      }

      // Produits absents de l'instantané : désactivés (historique conservé).
      const barcodes = snapshot.products.map((p) => p.barcode);
      if (barcodes.length > 0) {
        const deactivated = await tx
          .update(products)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(products.isActive, true), notInArray(products.barcode, barcodes)))
          .returning({ id: products.id });
        stats.deactivated = deactivated.length;
      }
      return stats;
    });

    await db
      .update(importJobs)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        stats: stats as unknown as Record<string, unknown>,
        log: sql`${importJobs.log} || ${`Terminé : ${stats.inserted} ajoutés, ${stats.updated} mis à jour, ${stats.deactivated} désactivés.\n`}`,
      })
      .where(eq(importJobs.id, jobId));
    return { jobId, stats };
  } catch (error) {
    await db
      .update(importJobs)
      .set({ status: "failed", finishedAt: new Date(), error: (error as Error).message })
      .where(eq(importJobs.id, jobId));
    throw error;
  }
}

/** Utilisé par les tests : identifiants des produits actifs d'un rayon. */
export async function activeProductIds(db: Database, categorySlug: string): Promise<number[]> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(categories.slug, categorySlug), eq(products.isActive, true)));
  return rows.map((r) => r.id);
}

export { inArray };
