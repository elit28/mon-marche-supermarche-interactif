/**
 * Charge l'instantané versionné du catalogue (`data/catalog/products.json`)
 * dans PostgreSQL : rayons, marques, fiches, images, nutrition, provenance,
 * puis prix et promotions FICTIFS de démonstration.
 *
 *   pnpm db:seed
 */
import "./lib/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { importSnapshot } from "../src/server/catalog/seed";
import type { SnapshotFile } from "../src/server/catalog/snapshot";
import { closeDb, getDb } from "../src/server/db";

async function main() {
  const file = path.resolve(process.cwd(), process.argv[2] ?? "data/catalog/products.json");
  const snapshot = JSON.parse(await readFile(file, "utf8")) as SnapshotFile;
  console.log(`📦 Import de ${snapshot.count} produits (instantané du ${snapshot.generatedAt})…`);
  const { jobId, stats } = await importSnapshot(getDb(), snapshot, { triggeredBy: "cli" });
  console.log(`✅ Import n°${jobId} terminé :`, stats);
}

main()
  .catch((error) => {
    console.error("❌ Échec de l'import :", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
