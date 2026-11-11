import { NextResponse } from "next/server";
import { getShelf } from "@/server/services/catalog";
import { jsonError } from "@/server/http";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{2,64}$/.test(slug)) return jsonError(400, "Rayon invalide.");
  const url = new URL(request.url);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(60, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "18", 10) || 18));
  const subshelf = url.searchParams.get("etagere");
  if (subshelf && !/^[a-z0-9-]{2,64}$/.test(subshelf)) return jsonError(400, "Étagère invalide.");
  try {
    const page = await getShelf(slug, { offset, limit, subshelf: subshelf ?? undefined });
    return NextResponse.json(page, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Le rayon est momentanément indisponible.");
  }
}
