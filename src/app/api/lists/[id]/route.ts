import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { deleteList, getList, renameList } from "@/server/services/lists";
import { listNameSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const guest = await getGuestKey();
  const { id } = await params;
  const list = guest ? await getList(guest, id) : null;
  return list ? NextResponse.json({ list }, { headers: { "Cache-Control": "private, no-store" } }) : jsonError(404, "Liste introuvable.");
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  const { id } = await params;
  if (!guest) return jsonError(404, "Liste introuvable.");
  const body = await readJson(request, z.object({ name: listNameSchema }));
  if (!body.ok) return body.response;
  return (await renameList(guest, id, body.data.name)) ? NextResponse.json({ ok: true }) : jsonError(404, "Liste introuvable.");
}

export async function DELETE(request: Request, { params }: Ctx) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  const { id } = await params;
  if (!guest) return jsonError(404, "Liste introuvable.");
  return (await deleteList(guest, id)) ? NextResponse.json({ ok: true }) : jsonError(404, "Liste introuvable.");
}
