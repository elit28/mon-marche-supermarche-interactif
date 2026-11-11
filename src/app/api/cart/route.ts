import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/pricing";
import { ensureGuestKey, getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { getCart, saveCart } from "@/server/services/user-data";
import { rateLimit } from "@/server/security/rate-limit";

const cartSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM) }))
    .max(300),
});

export async function GET() {
  const guest = await getGuestKey();
  if (!guest) return NextResponse.json({ items: [] });
  try {
    return NextResponse.json({ items: await getCart(guest) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Panier momentanément indisponible.");
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await ensureGuestKey();
  if (!rateLimit(`cart:${guest}`, 90, 60_000).ok) return jsonError(429, "Trop de mises à jour du panier.");
  const body = await readJson(request, cartSchema);
  if (!body.ok) return body.response;
  // Fusionne d'éventuels doublons envoyés par le navigateur.
  const merged = new Map<number, number>();
  for (const item of body.data.items) merged.set(item.productId, Math.min(MAX_QUANTITY_PER_ITEM, (merged.get(item.productId) ?? 0) + item.quantity));
  try {
    const saved = await saveCart(guest, [...merged].map(([productId, quantity]) => ({ productId, quantity })));
    return NextResponse.json({ saved });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Panier momentanément indisponible.");
  }
}
