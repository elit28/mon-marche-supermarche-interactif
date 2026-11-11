import { NextResponse } from "next/server";
import { getProductsByIds } from "@/server/services/catalog";
import { jsonError } from "@/server/http";

/** Résumés de produits par identifiants (panier, vus récemment). Max 200. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);
  try {
    return NextResponse.json({ products: await getProductsByIds(ids) }, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Catalogue momentanément indisponible.");
  }
}
