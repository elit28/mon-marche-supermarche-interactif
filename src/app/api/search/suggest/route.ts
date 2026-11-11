import { NextResponse } from "next/server";
import { getSql } from "@/server/db";
import { normalizeSearchText } from "@/lib/search-text";
import { jsonError } from "@/server/http";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/** Marques correspondant au début de la saisie (sans accents), avec nombre de produits. */
export async function GET(request: Request) {
  const limited = rateLimit(`suggest:${clientIp(request.headers)}`, 240, 60_000);
  if (!limited.ok) return jsonError(429, "Trop de requêtes.");
  const q = normalizeSearchText(new URL(request.url).searchParams.get("q") ?? "").slice(0, 40);
  if (q.length < 2) return NextResponse.json({ brands: [] });
  try {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const rows = await getSql()<{ slug: string; name: string; count: number }[]>`
      SELECT b.slug, b.name, count(p.id)::int AS count
      FROM brands b JOIN products p ON p.brand_id = b.id AND p.is_active
      WHERE unaccent(lower(b.name)) LIKE ${like} OR word_similarity(${q}, unaccent(lower(b.name))) > 0.6
      GROUP BY b.id
      ORDER BY (unaccent(lower(b.name)) LIKE ${`${q}%`}) DESC, count(p.id) DESC
      LIMIT 6
    `;
    return NextResponse.json({ brands: rows }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Suggestions indisponibles.");
  }
}
