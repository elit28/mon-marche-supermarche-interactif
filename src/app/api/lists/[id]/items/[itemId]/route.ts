import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { deleteListItem, updateListItem } from "@/server/services/lists";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

function parseItemId(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  const { id, itemId } = await params;
  const item = parseItemId(itemId);
  if (!guest || !item) return jsonError(404, "Élément introuvable.");
  const body = await readJson(request, z.object({ quantity: z.number().int().min(1).max(99).optional(), checked: z.boolean().optional() }));
  if (!body.ok) return body.response;
  return (await updateListItem(guest, id, item, body.data)) ? NextResponse.json({ ok: true }) : jsonError(404, "Élément introuvable.");
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  const { id, itemId } = await params;
  const item = parseItemId(itemId);
  if (!guest || !item) return jsonError(404, "Élément introuvable.");
  return (await deleteListItem(guest, id, item)) ? NextResponse.json({ ok: true }) : jsonError(404, "Élément introuvable.");
}
