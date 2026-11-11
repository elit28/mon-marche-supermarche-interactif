import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/checkout-schema";
import { ensureGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { createDemoOrder } from "@/server/services/orders";
import { rateLimit } from "@/server/security/rate-limit";

/** Crée une commande SIMULÉE. Aucun paiement, aucune transmission à un tiers. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await ensureGuestKey();
  if (!rateLimit(`order:${guest}`, 5, 60_000).ok) return jsonError(429, "Trop de commandes simulées en peu de temps. Patientez une minute.");
  const body = await readJson(request, orderSchema);
  if (!body.ok) return body.response;
  try {
    const result = await createDemoOrder(guest, body.data);
    return result.ok ? NextResponse.json(result, { status: 201 }) : jsonError(result.status, result.error);
  } catch (error) {
    console.error(error);
    return jsonError(503, "La simulation de commande a échoué, réessayez.");
  }
}
