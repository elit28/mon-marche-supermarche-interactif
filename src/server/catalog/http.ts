/**
 * Client HTTP poli pour les API Open Food Facts :
 * - User-Agent personnalisé (obligatoire selon la documentation OFF) ;
 * - limitation de débit par type d'appel (recherche 10/min, fiche 100/min) ;
 * - cache disque, ce qui rend le pipeline reprenable après une erreur ;
 * - nouvelles tentatives avec attente exponentielle (429, 5xx, réseau).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const USER_AGENT =
  process.env.OFF_USER_AGENT?.trim() || "MonMarche/0.1 (supermarche-virtuel-open-source; demo)";

export class RateLimiter {
  private next = 0;
  constructor(private readonly minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, this.next);
    this.next = at + this.minIntervalMs;
    if (at > now) await sleep(at - now);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const limiters = {
  /** Recherche : 10 requêtes / minute. */
  search: new RateLimiter(6_500),
  /** Fiche produit : 100 requêtes / minute. */
  product: new RateLimiter(700),
  /** Images statiques : on reste raisonnable. */
  image: new RateLimiter(150),
};

export function cacheKey(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 20);
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function writeAtomic(file: string, data: string | Uint8Array): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

export interface FetchOptions {
  limiter: RateLimiter;
  cacheFile?: string;
  /** Ignore le cache et force un nouvel appel. */
  refresh?: boolean;
  retries?: number;
  timeoutMs?: number;
}

async function fetchWithRetry(url: string, opts: FetchOptions, accept: string): Promise<Response> {
  const retries = opts.retries ?? 4;
  let attempt = 0;
  for (;;) {
    await opts.limiter.wait();
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= retries) return res;
        const retryAfter = Number.parseInt(res.headers.get("retry-after") ?? "", 10);
        const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 2_000 * 2 ** attempt;
        console.warn(`  ↻ ${res.status} sur ${url} — nouvelle tentative dans ${Math.round(delay / 1000)} s`);
        await sleep(delay);
        attempt++;
        continue;
      }
      return res;
    } catch (error) {
      if (attempt >= retries) throw error;
      const delay = 2_000 * 2 ** attempt;
      console.warn(`  ↻ erreur réseau (${(error as Error).message}) — nouvelle tentative dans ${delay / 1000} s`);
      await sleep(delay);
      attempt++;
    }
  }
}

export async function fetchJsonCached<T>(url: string, opts: FetchOptions): Promise<{ data: T; fromCache: boolean }> {
  if (opts.cacheFile && !opts.refresh && (await exists(opts.cacheFile))) {
    return { data: JSON.parse(await readFile(opts.cacheFile, "utf8")) as T, fromCache: true };
  }
  const res = await fetchWithRetry(url, opts, "application/json");
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const text = await res.text();
  const data = JSON.parse(text) as T;
  if (opts.cacheFile) await writeAtomic(opts.cacheFile, text);
  return { data, fromCache: false };
}

export async function downloadCached(url: string, opts: FetchOptions & { cacheFile: string; maxBytes?: number }): Promise<{ file: string; fromCache: boolean }> {
  if (!opts.refresh && (await exists(opts.cacheFile))) return { file: opts.cacheFile, fromCache: true };
  const res = await fetchWithRetry(url, opts, "image/*");
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error(`Type de contenu inattendu (${type}) pour ${url}`);
  const buffer = new Uint8Array(await res.arrayBuffer());
  const max = opts.maxBytes ?? 12 * 1024 * 1024;
  if (buffer.byteLength > max) throw new Error(`Image trop lourde (${buffer.byteLength} octets) : ${url}`);
  await writeAtomic(opts.cacheFile, buffer);
  return { file: opts.cacheFile, fromCache: false };
}
