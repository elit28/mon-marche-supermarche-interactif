/**
 * Connexion PostgreSQL partagée (postgres.js + Drizzle).
 * Un singleton global évite de multiplier les pools lors du rechargement à chaud.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

interface DbGlobal {
  __monMarcheSql?: postgres.Sql;
  __monMarcheDbClient?: postgres.Sql;
  __monMarcheDb?: Database;
}

const globalForDb = globalThis as unknown as DbGlobal;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL n'est pas défini. Copiez .env.example vers .env puis ajustez la connexion PostgreSQL.");
  }
  return url;
}

function createClient(max: number): postgres.Sql {
  return postgres(getDatabaseUrl(), {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: true,
    onnotice: () => {},
  });
}

/** Client SQL brut (requêtes paramétrées en gabarits), types natifs (Date, etc.). */
export function getSql(): postgres.Sql {
  if (!globalForDb.__monMarcheSql) {
    globalForDb.__monMarcheSql = createClient(Number.parseInt(process.env.DATABASE_POOL_SIZE ?? "10", 10));
  }
  return globalForDb.__monMarcheSql;
}

/**
 * Client Drizzle. Il dispose de son propre pool : Drizzle remplace les
 * convertisseurs de types du client qu'il reçoit (dates en chaînes), ce qui ne
 * doit pas affecter les requêtes SQL brutes.
 */
export function getDb(): Database {
  if (!globalForDb.__monMarcheDb) {
    globalForDb.__monMarcheDbClient = createClient(4);
    globalForDb.__monMarcheDb = drizzle(globalForDb.__monMarcheDbClient, { schema, casing: "snake_case" });
  }
  return globalForDb.__monMarcheDb;
}

export async function closeDb(): Promise<void> {
  await Promise.all([globalForDb.__monMarcheSql?.end({ timeout: 5 }), globalForDb.__monMarcheDbClient?.end({ timeout: 5 })]);
  globalForDb.__monMarcheSql = undefined;
  globalForDb.__monMarcheDbClient = undefined;
  globalForDb.__monMarcheDb = undefined;
}

export { schema };
