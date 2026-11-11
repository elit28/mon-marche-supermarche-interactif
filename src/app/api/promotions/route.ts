import { NextResponse } from "next/server";
import { getPromotedProducts } from "@/server/services/catalog";
import { jsonError } from "@/server/http";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(60, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "18", 10) || 18));
  try {
    return NextResponse.json(await getPromotedProducts(limit, offset), { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Les promotions sont momentanément indisponibles.");
  }
}
