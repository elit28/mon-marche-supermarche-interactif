/**
 * Schéma PostgreSQL de MON MARCHÉ (Drizzle ORM).
 *
 * Principe de séparation :
 * - `products`, `brands`, `categories`, `product_images`, `product_nutrition`
 *   décrivent le catalogue présenté (données issues d'Open Food Facts, ODbL,
 *   normalisées) ;
 * - `product_sources` conserve la provenance brute et la licence de chaque fiche ;
 * - `prices`, `price_history`, `promotions` forment la couche commerciale,
 *   totalement indépendante (prix FICTIFS de démonstration) ;
 * - `carts`, `favorites`, `shopping_lists`, `demo_orders` sont les données
 *   propres à l'application (visiteurs invités identifiés par une clé anonyme).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ------------------------------------------------------------------------ */
/* Catalogue                                                                */
/* ------------------------------------------------------------------------ */

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  shortName: varchar("short_name", { length: 60 }).notNull(),
  description: text("description").notNull().default(""),
  accent: varchar("accent", { length: 9 }).notNull().default("#166534"),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    barcode: varchar("barcode", { length: 14 }).notNull().unique(),
    name: varchar("name", { length: 240 }).notNull(),
    genericName: varchar("generic_name", { length: 240 }),
    brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    /** Étagère (sous-rayon) dans le rayon. */
    subshelf: varchar("subshelf", { length: 64 }).notNull(),
    /** Catégorie corrigée manuellement depuis l'administration (prioritaire à l'import suivant). */
    categoryLocked: boolean("category_locked").notNull().default(false),
    quantityLabel: varchar("quantity_label", { length: 60 }),
    netAmount: numeric("net_amount", { precision: 12, scale: 3, mode: "number" }),
    netUnit: varchar("net_unit", { length: 4 }),
    isOrganic: boolean("is_organic").notNull().default(false),
    nutriscoreGrade: varchar("nutriscore_grade", { length: 1 }),
    novaGroup: smallint("nova_group"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    /** Ordre d'affichage sur l'étagère (plus petit = plus visible). */
    shelfRank: integer("shelf_rank").notNull().default(1000),
    popularity: integer("popularity").notNull().default(0),
    /** Score qualité calculé à l'import (0–100) et anomalies détectées. */
    qualityScore: integer("quality_score").notNull().default(0),
    qualityIssues: text("quality_issues").array().notNull().default(sql`'{}'::text[]`),
    /** Texte normalisé (minuscules, sans accents) pour la recherche. */
    searchText: text("search_text").notNull().default(""),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId, t.isActive, t.shelfRank),
    index("products_brand_idx").on(t.brandId),
    index("products_search_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
    index("products_created_idx").on(t.createdAt),
    check("products_nutriscore_check", sql`${t.nutriscoreGrade} IS NULL OR ${t.nutriscoreGrade} IN ('a','b','c','d','e')`),
    check("products_net_unit_check", sql`${t.netUnit} IS NULL OR ${t.netUnit} IN ('g','ml')`),
  ],
);

/** Provenance brute de chaque fiche (séparée des données présentées). */
export const productSources = pgTable("product_sources", {
  productId: integer("product_id")
    .primaryKey()
    .references(() => products.id, { onDelete: "cascade" }),
  source: varchar("source", { length: 32 }).notNull(),
  sourceUrl: text("source_url").notNull(),
  license: varchar("license", { length: 40 }).notNull().default("ODbL-1.0"),
  rawName: text("raw_name").notNull(),
  rawBrands: text("raw_brands"),
  categoriesTags: text("categories_tags").array().notNull().default(sql`'{}'::text[]`),
  labelsTags: text("labels_tags").array().notNull().default(sql`'{}'::text[]`),
  sourceLastModifiedAt: timestamp("source_last_modified_at", { withTimezone: true }),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  importJobId: integer("import_job_id"),
});

export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    kind: varchar("kind", { length: 16 }).notNull().default("front"),
    /** Chemin public de l'image optimisée (servie par l'application). */
    path: text("path").notNull(),
    originalUrl: text("original_url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    /** Couleur dominante, utilisée pour les effets de lumière (panier, fiche). */
    dominantColor: varchar("dominant_color", { length: 9 }),
    isCutout: boolean("is_cutout").notNull().default(false),
    backgroundScore: real("background_score"),
    qualityStatus: varchar("quality_status", { length: 16 }).notNull().default("ok"),
    license: varchar("license", { length: 40 }).notNull().default("CC-BY-SA-3.0"),
    attribution: text("attribution").notNull(),
  },
  (t) => [uniqueIndex("product_images_product_kind_idx").on(t.productId, t.kind)],
);

export const productNutrition = pgTable("product_nutrition", {
  productId: integer("product_id")
    .primaryKey()
    .references(() => products.id, { onDelete: "cascade" }),
  per: varchar("per", { length: 8 }).notNull().default("100g"),
  energyKcal: real("energy_kcal"),
  fat: real("fat"),
  saturatedFat: real("saturated_fat"),
  carbohydrates: real("carbohydrates"),
  sugars: real("sugars"),
  fiber: real("fiber"),
  proteins: real("proteins"),
  salt: real("salt"),
  servingSize: varchar("serving_size", { length: 80 }),
  ingredientsText: text("ingredients_text"),
  allergens: text("allergens").array().notNull().default(sql`'{}'::text[]`),
  traces: text("traces").array().notNull().default(sql`'{}'::text[]`),
});

/* ------------------------------------------------------------------------ */
/* Couche commerciale (indépendante du catalogue)                          */
/* ------------------------------------------------------------------------ */

export const prices = pgTable(
  "prices",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Montant en centimes d'euro (entier : aucun arrondi flottant). */
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    /** `demo` = prix fictif généré ; un futur fournisseur autorisé aura son propre identifiant. */
    source: varchar("source", { length: 40 }).notNull().default("demo"),
    isDemo: boolean("is_demo").notNull().default(true),
    updatedAt: updatedAt(),
  },
  (t) => [check("prices_amount_positive", sql`${t.amountCents} > 0`)],
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    previousCents: integer("previous_cents"),
    amountCents: integer("amount_cents").notNull(),
    source: varchar("source", { length: 40 }).notNull(),
    reason: varchar("reason", { length: 200 }),
    changedBy: varchar("changed_by", { length: 120 }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("price_history_product_idx").on(t.productId, t.changedAt)],
);

export const promotions = pgTable(
  "promotions",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** `percent` (value = pourcentage) ou `amount` (value = centimes de remise unitaire). */
    kind: varchar("kind", { length: 16 }).notNull(),
    value: integer("value").notNull(),
    label: varchar("label", { length: 80 }).notNull(),
    isDemo: boolean("is_demo").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("promotions_product_idx").on(t.productId, t.isActive),
    check("promotions_kind_check", sql`${t.kind} IN ('percent','amount')`),
    check("promotions_value_check", sql`${t.value} > 0 AND (${t.kind} <> 'percent' OR ${t.value} <= 90)`),
  ],
);

/* ------------------------------------------------------------------------ */
/* Utilisateurs & sessions                                                  */
/* ------------------------------------------------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }),
  role: varchar("role", { length: 16 }).notNull().default("customer"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 du jeton de session (le jeton brut n'est jamais stocké). */
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------------ */
/* Données des visiteurs (mode invité)                                      */
/* ------------------------------------------------------------------------ */

/**
 * `owner_key` : identifiant anonyme aléatoire stocké dans un cookie httpOnly.
 * Aucune donnée personnelle n'est nécessaire pour utiliser le site.
 */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerKey: varchar("owner_key", { length: 64 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.productId] }), check("cart_items_quantity_check", sql`${t.quantity} > 0 AND ${t.quantity} <= 99`)],
);

export const favorites = pgTable(
  "favorites",
  {
    ownerKey: varchar("owner_key", { length: 64 }).notNull(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.ownerKey, t.productId] })],
);

export const shoppingLists = pgTable(
  "shopping_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerKey: varchar("owner_key", { length: 64 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    /** Jeton de partage public (lecture seule), aléatoire et révocable. */
    shareToken: varchar("share_token", { length: 32 }).unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("shopping_lists_owner_idx").on(t.ownerKey)],
);

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: serial("id").primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Libellé libre (« pain », « tomates ») quand aucun produit n'est choisi. */
    label: varchar("label", { length: 120 }),
    quantity: integer("quantity").notNull().default(1),
    checked: boolean("checked").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("shopping_list_items_list_idx").on(t.listId, t.position),
    check("shopping_list_items_quantity_check", sql`${t.quantity} > 0 AND ${t.quantity} <= 99`),
    check("shopping_list_items_content_check", sql`${t.productId} IS NOT NULL OR ${t.label} IS NOT NULL`),
  ],
);

export const demoOrders = pgTable(
  "demo_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 20 }).notNull().unique(),
    ownerKey: varchar("owner_key", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("simulated"),
    fulfillment: varchar("fulfillment", { length: 16 }).notNull(),
    slotLabel: varchar("slot_label", { length: 120 }).notNull(),
    /** Adresse de test facultative (jamais exigée). */
    address: jsonb("address"),
    itemCount: integer("item_count").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull(),
    feeCents: integer("fee_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("demo_orders_owner_idx").on(t.ownerKey, t.createdAt)],
);

export const demoOrderItems = pgTable(
  "demo_order_items",
  {
    orderId: uuid("order_id")
      .notNull()
      .references(() => demoOrders.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
    nameSnapshot: varchar("name_snapshot", { length: 300 }).notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    discountCents: integer("discount_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [index("demo_order_items_order_idx").on(t.orderId)],
);

/* ------------------------------------------------------------------------ */
/* Imports                                                                  */
/* ------------------------------------------------------------------------ */

export const importJobs = pgTable("import_jobs", {
  id: serial("id").primaryKey(),
  kind: varchar("kind", { length: 24 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("running"),
  triggeredBy: varchar("triggered_by", { length: 120 }).notNull().default("cli"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  stats: jsonb("stats").$type<Record<string, unknown>>().notNull().default({}),
  log: text("log").notNull().default(""),
  error: text("error"),
});
