/**
 * Mise à jour incrémentale des fiches depuis Open Food Facts (API v3).
 *
 *   pnpm catalog:refresh [--limit=200]
 */
import "../lib/env";
import { refreshFromOpenFoodFacts } from "../../src/server/catalog/refresh";
import { closeDb, getDb } from "../../src/server/db";

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.slice(8), 10) : 200;
  console.log(`🔄 Vérification de ${limit} fiches auprès d'Open Food Facts…`);
  const stats = await refreshFromOpenFoodFacts(getDb(), { triggeredBy: "cli", limit });
  console.log("✅ Terminé :", stats);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
