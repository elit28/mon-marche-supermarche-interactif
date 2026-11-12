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

// Migrations et import : connexion directe si l'hébergeur en fournit une
// (ex. Neon via Vercel : DATABASE_URL_UNPOOLED), plus sûre qu'un pool en mode transaction.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
