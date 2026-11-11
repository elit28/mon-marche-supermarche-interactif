import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";

/** Réponse d'erreur JSON homogène, avec un message compréhensible. */
export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<{ ok: true; data: z.output<T> } | { ok: false; response: NextResponse }> {
  const length = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (length > 64_000) return { ok: false, response: jsonError(413, "Requête trop volumineuse.") };
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "Corps de requête JSON invalide.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, response: jsonError(422, "Données invalides.", z.treeifyError(parsed.error)) };
  return { ok: true, data: parsed.data };
}

/** Vérifie que la requête provient bien de notre site (protection CSRF des API JSON). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === new URL(request.url).host || origin === process.env.NEXT_PUBLIC_SITE_URL;
  } catch {
    return false;
  }
}
