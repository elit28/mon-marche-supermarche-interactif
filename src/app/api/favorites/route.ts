import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { addFavorite, getFavorites, removeFavorite, replaceFavorites } from "@/server/services/user-data";
import { rateLimit } from "@/server/security/rate-limit";

const one = z.object({ productId: z.number().int().positive() });
const many = z.object({ productIds: z.array(z.number().int().positive()).max(500) });

export async function GET() {
  const guest = await getGuestKey();
  if (!guest) return NextResponse.json({ products: [] });
  try {
    return NextResponse.json({ products: await getFavorites(guest) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Favoris momentanément indisponibles.");
  }
}

async function guard(request: Request) {
  if (!isSameOrigin(request)) return { error: jsonError(403, "Origine non autorisée.") };
  const guest = await ensureGuestKey();
  if (!rateLimit(`fav:${guest}`, 120, 60_000).ok) return { error: jsonError(429, "Trop de requêtes.") };
  return { guest };
}

export async function POST(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  const body = await readJson(request, one);
  if (!body.ok) return body.response;
  const ok = await addFavorite(g.guest!, body.data.productId);
  return ok ? NextResponse.json({ ok: true }) : jsonError(404, "Produit introuvable.");
}

export async function DELETE(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  const body = await readJson(request, one);
  if (!body.ok) return body.response;
  await removeFavorite(g.guest!, body.data.productId);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const g = await guard(request);
  if (g.error) return g.error;
  const body = await readJson(request, many);
  if (!body.ok) return body.response;
  return NextResponse.json({ saved: await replaceFavorites(g.guest!, body.data.productIds) });
}
