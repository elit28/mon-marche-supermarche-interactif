/**
 * Charge `.env` pour les scripts lancés hors de Next.js (tsx).
 * Utilise le chargeur natif de Node (process.loadEnvFile, Node ≥ 20.12).
 */
import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Fichier illisible : on garde les variables déjà définies.
    }
  }
}
