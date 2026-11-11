import { NextResponse } from "next/server";
import { z } from "zod";
import { cartItemsSchema } from "@/lib/checkout-schema";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { listSlots, quoteCart } from "@/server/services/orders";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

/** Devis serveur : prix et totaux recalculés à partir de la base. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  if (!rateLimit(`quote:${clientIp(request.headers)}`, 60, 60_000).ok) return jsonError(429, "Trop de requêtes.");
  const body = await readJson(request, z.object({ items: cartItemsSchema }));
  if (!body.ok) return body.response;
  try {
    return NextResponse.json({ quote: await quoteCart(body.data.items), slots: listSlots() });
  } catch (error) {
    console.error(error);
    return jsonError(503, "Service momentanément indisponible.");
  }
}
