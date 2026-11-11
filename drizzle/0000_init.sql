CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"cart_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_cart_id_product_id_pk" PRIMARY KEY("cart_id","product_id"),
	CONSTRAINT "cart_items_quantity_check" CHECK ("cart_items"."quantity" > 0 AND "cart_items"."quantity" <= 99)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_key" varchar(64) NOT NULL,
	"user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_owner_key_unique" UNIQUE("owner_key")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"short_name" varchar(60) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"accent" varchar(9) DEFAULT '#166534' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "demo_order_items" (
	"order_id" uuid NOT NULL,
	"product_id" integer,
	"name_snapshot" varchar(300) NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(20) NOT NULL,
	"owner_key" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'simulated' NOT NULL,
	"fulfillment" varchar(16) NOT NULL,
	"slot_label" varchar(120) NOT NULL,
	"address" jsonb,
	"item_count" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"fee_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"owner_key" varchar(64) NOT NULL,
	"product_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_owner_key_product_id_pk" PRIMARY KEY("owner_key","product_id")
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" varchar(24) NOT NULL,
	"status" varchar(16) DEFAULT 'running' NOT NULL,
	"triggered_by" varchar(120) DEFAULT 'cli' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"log" text DEFAULT '' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"previous_cents" integer,
	"amount_cents" integer NOT NULL,
	"source" varchar(40) NOT NULL,
	"reason" varchar(200),
	"changed_by" varchar(120),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prices" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"source" varchar(40) DEFAULT 'demo' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prices_amount_positive" CHECK ("prices"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"kind" varchar(16) DEFAULT 'front' NOT NULL,
	"path" text NOT NULL,
	"original_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"dominant_color" varchar(9),
	"is_cutout" boolean DEFAULT false NOT NULL,
	"background_score" real,
	"quality_status" varchar(16) DEFAULT 'ok' NOT NULL,
	"license" varchar(40) DEFAULT 'CC-BY-SA-3.0' NOT NULL,
	"attribution" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_nutrition" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"per" varchar(8) DEFAULT '100g' NOT NULL,
	"energy_kcal" real,
	"fat" real,
	"saturated_fat" real,
	"carbohydrates" real,
	"sugars" real,
	"fiber" real,
	"proteins" real,
	"salt" real,
	"serving_size" varchar(80),
	"ingredients_text" text,
	"allergens" text[] DEFAULT '{}'::text[] NOT NULL,
	"traces" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_sources" (
	"product_id" integer PRIMARY KEY NOT NULL,
	"source" varchar(32) NOT NULL,
	"source_url" text NOT NULL,
	"license" varchar(40) DEFAULT 'ODbL-1.0' NOT NULL,
	"raw_name" text NOT NULL,
	"raw_brands" text,
	"categories_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"labels_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_last_modified_at" timestamp with time zone,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"import_job_id" integer
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"barcode" varchar(14) NOT NULL,
	"name" varchar(240) NOT NULL,
	"generic_name" varchar(240),
	"brand_id" integer,
	"category_id" integer NOT NULL,
	"subshelf" varchar(64) NOT NULL,
	"category_locked" boolean DEFAULT false NOT NULL,
	"quantity_label" varchar(60),
	"net_amount" numeric(12, 3),
	"net_unit" varchar(4),
	"is_organic" boolean DEFAULT false NOT NULL,
	"nutriscore_grade" varchar(1),
	"nova_group" smallint,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"shelf_rank" integer DEFAULT 1000 NOT NULL,
	"popularity" integer DEFAULT 0 NOT NULL,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"quality_issues" text[] DEFAULT '{}'::text[] NOT NULL,
	"search_text" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_barcode_unique" UNIQUE("barcode"),
	CONSTRAINT "products_nutriscore_check" CHECK ("products"."nutriscore_grade" IS NULL OR "products"."nutriscore_grade" IN ('a','b','c','d','e')),
	CONSTRAINT "products_net_unit_check" CHECK ("products"."net_unit" IS NULL OR "products"."net_unit" IN ('g','ml'))
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"kind" varchar(16) NOT NULL,
	"value" integer NOT NULL,
	"label" varchar(80) NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promotions_kind_check" CHECK ("promotions"."kind" IN ('percent','amount')),
	CONSTRAINT "promotions_value_check" CHECK ("promotions"."value" > 0 AND ("promotions"."kind" <> 'percent' OR "promotions"."value" <= 90))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" uuid NOT NULL,
	"product_id" integer,
	"label" varchar(120),
	"quantity" integer DEFAULT 1 NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_list_items_quantity_check" CHECK ("shopping_list_items"."quantity" > 0 AND "shopping_list_items"."quantity" <= 99),
	CONSTRAINT "shopping_list_items_content_check" CHECK ("shopping_list_items"."product_id" IS NOT NULL OR "shopping_list_items"."label" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_key" varchar(64) NOT NULL,
	"name" varchar(80) NOT NULL,
	"share_token" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_lists_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(120),
	"role" varchar(16) DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_order_items" ADD CONSTRAINT "demo_order_items_order_id_demo_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."demo_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_order_items" ADD CONSTRAINT "demo_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prices" ADD CONSTRAINT "prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_nutrition" ADD CONSTRAINT "product_nutrition_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_sources" ADD CONSTRAINT "product_sources_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_list_id_shopping_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demo_order_items_order_idx" ON "demo_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "demo_orders_owner_idx" ON "demo_orders" USING btree ("owner_key","created_at");--> statement-breakpoint
CREATE INDEX "price_history_product_idx" ON "price_history" USING btree ("product_id","changed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_product_kind_idx" ON "product_images" USING btree ("product_id","kind");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id","is_active","shelf_rank");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "products_search_trgm_idx" ON "products" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_created_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "promotions_product_idx" ON "promotions" USING btree ("product_id","is_active");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shopping_list_items_list_idx" ON "shopping_list_items" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "shopping_lists_owner_idx" ON "shopping_lists" USING btree ("owner_key");