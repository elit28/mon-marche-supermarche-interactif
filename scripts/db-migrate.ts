/**
 * Applique les migrations SQL (dossier `drizzle/`).
 * Crée au préalable les extensions nécessaires à la recherche (pg_trgm, unaccent).
 *
 *   pnpm db:migrate
 */
import "./lib/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb, getSql } from "../src/server/db";

async function main() {
  const sql = getSql();
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;
  await sql`CREATE EXTENSION IF NOT EXISTS unaccent`;
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("✅ Base de données à jour.");
}

main()
  .catch((error) => {
    console.error("❌ Échec de la migration :", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
