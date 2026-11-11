/**
 * Tests d'intégration sur une vraie base PostgreSQL (aucun appel réseau externe).
 * Nécessite TEST_DATABASE_URL (base dédiée, elle est réinitialisée).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fixtureProducts, fixtureSnapshot } from "../fixtures/snapshot";

const TEST_URL = process.env.TEST_DATABASE_URL;
const suite = TEST_URL ? describe : describe.skip;

suite("catalogue en base (PostgreSQL)", () => {
  let db: typeof import("@/server/db");
  let seed: typeof import("@/server/catalog/seed");
  let catalog: typeof import("@/server/services/catalog");
  let userData: typeof import("@/server/services/user-data");
  let orders: typeof import("@/server/services/orders");
  let search: typeof import("@/server/services/search");
  let params: typeof import("@/lib/search-params");

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    db = await import("@/server/db");
    const sql = db.getSql();
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
    await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
    await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db.getDb(), { migrationsFolder: "./drizzle" });
    seed = await import("@/server/catalog/seed");
    catalog = await import("@/server/services/catalog");
    userData = await import("@/server/services/user-data");
    orders = await import("@/server/services/orders");
    search = await import("@/server/services/search");
    params = await import("@/lib/search-params");
    await seed.importSnapshot(db.getDb(), fixtureSnapshot(), { triggeredBy: "test" });
  });

  afterAll(async () => {
    await db?.closeDb();
  });

  it("importe rayons, produits, images, provenance et prix fictifs historisés", async () => {
    const sql = db.getSql();
    const [counts] = await sql<{ categories: number; products: number; prices: number; history: number; sources: number }[]>`
      SELECT (SELECT count(*)::int FROM categories) AS categories, (SELECT count(*)::int FROM products) AS products,
             (SELECT count(*)::int FROM prices WHERE is_demo) AS prices, (SELECT count(*)::int FROM price_history) AS history,
             (SELECT count(*)::int FROM product_sources WHERE license = 'ODbL-1.0') AS sources
    `;
    expect(counts).toEqual({ categories: 18, products: 4, prices: 4, history: 4, sources: 4 });
  });

  it("est idempotent et préserve les corrections de l'administration", async () => {
    const sql = db.getSql();
    const [nutella] = await sql<{ id: number }[]>`SELECT id FROM products WHERE barcode = '3017620422003'`;
    await sql`UPDATE prices SET amount_cents = 1234 WHERE product_id = ${nutella!.id}`;
    await sql`UPDATE products SET category_locked = true, category_id = (SELECT id FROM categories WHERE slug = 'produits-bio'), subshelf = 'bio-epicerie' WHERE id = ${nutella!.id}`;

    // Nouvel instantané sans l'eau Volvic.
    const { stats } = await seed.importSnapshot(db.getDb(), fixtureSnapshot(fixtureProducts.slice(0, 3)), { triggeredBy: "test" });
    expect(stats).toMatchObject({ inserted: 0, updated: 3, deactivated: 1, pricesCreated: 0 });

    const [row] = await sql<{ amount_cents: number; slug: string }[]>`
      SELECT pr.amount_cents, c.slug FROM products p JOIN prices pr ON pr.product_id = p.id JOIN categories c ON c.id = p.category_id WHERE p.id = ${nutella!.id}
    `;
    expect(row).toEqual({ amount_cents: 1234, slug: "produits-bio" });
    const [{ history }] = (await sql<{ history: number }[]>`SELECT count(*)::int AS history FROM price_history`) as unknown as [{ history: number }];
    expect(history).toBe(4);
    const [volvic] = await sql<{ is_active: boolean }[]>`SELECT is_active FROM products WHERE barcode = '3057640117008'`;
    expect(volvic!.is_active).toBe(false);

    // Remise en état pour les tests suivants.
    await sql`UPDATE products SET category_locked = false WHERE id = ${nutella!.id}`;
    await seed.importSnapshot(db.getDb(), fixtureSnapshot(), { triggeredBy: "test" });
    await sql`UPDATE products SET is_active = true`;
  });

  it("recherche en tolérant fautes, accents et codes-barres", async () => {
    const typo = await catalog.findSearchRows("nutela");
    expect(typo[0]?.name).toBe("Nutella");
    const accents = await catalog.findSearchRows("PÂTES barilla");
    expect(accents.map((r) => r.name).sort()).toEqual(["Penne Rigate n°73", "Spaghetti n°5"]);
    const barcode = await catalog.findSearchRows("8076800195057");
    expect(barcode.map((r) => r.name)).toEqual(["Spaghetti n°5"]);
    expect(await catalog.findSearchRows("zzzzqqqq")).toEqual([]);
  });

  it("filtre et regroupe les résultats par rayon", async () => {
    const result = await search.searchCatalog(params.parseSearchParams({ q: "" }), new Set());
    expect(result.groups.map((g) => g.category.slug)).toEqual(["pates-riz-feculents", "petit-dejeuner", "boissons-eaux"]);
    const sorted = await search.searchCatalog(params.parseSearchParams({ tri: "prix-asc", marque: "barilla" }), new Set());
    expect(sorted.groups).toEqual([]);
    expect(sorted.products.map((p) => p.brand)).toEqual(["Barilla", "Barilla"]);
    expect(sorted.products[0]!.priceCents).toBeLessThanOrEqual(sorted.products[1]!.priceCents);
  });

  it("pagine une étagère côté serveur", async () => {
    const page1 = await catalog.getShelf("pates-riz-feculents", { limit: 1 });
    expect(page1).toMatchObject({ total: 2, nextOffset: 1 });
    const page2 = await catalog.getShelf("pates-riz-feculents", { limit: 1, offset: 1 });
    expect(page2.nextOffset).toBeNull();
    expect(page2.products[0]!.id).not.toBe(page1.products[0]!.id);
  });

  it("expose une fiche détaillée sans inventer les données manquantes", async () => {
    const nutella = await catalog.getProductDetail("3017620422003");
    expect(nutella?.nutrition?.energyKcal).toBe(539);
    expect(nutella?.nutrition?.fiber).toBeNull();
    expect(nutella?.source.license).toBe("ODbL-1.0");
    const pasta = await catalog.getProductDetail("8076800195057");
    expect(pasta?.nutrition).toBeNull();
    expect(pasta?.ingredientsText).toBeNull();
    expect(await catalog.getProductDetail("not-a-code")).toBeNull();
  });

  it("sauvegarde le panier invité en ignorant les produits inconnus", async () => {
    const [{ id }] = (await db.getSql()<{ id: number }[]>`SELECT id FROM products WHERE barcode = '3017620422003'`) as unknown as [{ id: number }];
    const saved = await userData.saveCart("invite-test-000000000000", [
      { productId: id, quantity: 3 },
      { productId: 999_999, quantity: 1 },
    ]);
    expect(saved).toBe(1);
    const cart = await userData.getCart("invite-test-000000000000");
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ quantity: 3, product: { barcode: "3017620422003" } });
  });

  it("recalcule les montants côté serveur lors d'une commande simulée", async () => {
    const sql = db.getSql();
    const [{ id, amount_cents }] = (await sql<{ id: number; amount_cents: number }[]>`
      SELECT p.id, pr.amount_cents FROM products p JOIN prices pr ON pr.product_id = p.id WHERE p.barcode = '8076800195057'
    `) as unknown as [{ id: number; amount_cents: number }];
    const slot = orders.listSlots()[0]!;
    const result = await orders.createDemoOrder("invite-test-000000000000", { items: [{ productId: id, quantity: 2 }], fulfillment: "pickup", slotId: slot.id, address: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reference).toMatch(/^DEMO-[A-Z0-9]{6}$/);
    const promo = (await catalog.getProductsByIds([id]))[0]!.promotion;
    const { applyPromotion } = await import("@/lib/pricing");
    expect(result.totalCents).toBe(applyPromotion(amount_cents, promo) * 2);

    const invalid = await orders.createDemoOrder("invite-test-000000000000", { items: [{ productId: 999_999, quantity: 1 }], fulfillment: "pickup", slotId: slot.id, address: null });
    expect(invalid.ok).toBe(false);
    const badSlot = await orders.createDemoOrder("invite-test-000000000000", { items: [{ productId: id, quantity: 1 }], fulfillment: "delivery", slotId: "1999-01-01T09", address: null });
    expect(badSlot).toMatchObject({ ok: false, status: 422 });
  });
});
