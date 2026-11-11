import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { addListItem } from "@/server/services/lists";
import { rateLimit } from "@/server/security/rate-limit";
import { listLabelSchema } from "@/lib/validation";

const itemSchema = z
  .object({
    productId: z.number().int().positive().optional(),
    label: listLabelSchema.optional(),
    quantity: z.number().int().min(1).max(99).default(1),
  })
  .refine((v) => Boolean(v.productId) !== Boolean(v.label), { message: "Indiquez un produit OU un libellé." });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  if (!guest) return jsonError(404, "Liste introuvable.");
  if (!rateLimit(`list-items:${guest}`, 120, 60_000).ok) return jsonError(429, "Trop de requêtes.");
  const body = await readJson(request, itemSchema);
  if (!body.ok) return body.response;
  const { id } = await params;
  const result = await addListItem(guest, id, body.data);
  return result.ok ? NextResponse.json({ ok: true }, { status: 201 }) : jsonError(result.status, result.error);
}
