import { NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/search-params";
import { getGuestKey } from "@/server/auth/guest";
import { jsonError } from "@/server/http";
import { searchCatalog } from "@/server/services/search";
import { getFavoriteIds } from "@/server/services/user-data";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`search:${clientIp(request.headers)}`, 120, 60_000);
  if (!limited.ok) return jsonError(429, "Trop de recherches, réessayez dans un instant.");
  const params = parseSearchParams(new URL(request.url).searchParams);
  try {
    const guest = params.favoris ? await getGuestKey() : null;
    const favorites = guest ? await getFavoriteIds(guest) : new Set<number>();
    return NextResponse.json(await searchCatalog(params, favorites));
  } catch (error) {
    console.error(error);
    return jsonError(503, "La recherche est momentanément indisponible.");
  }
}
