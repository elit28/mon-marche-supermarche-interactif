import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { importSharedList } from "@/server/services/lists";
import { rateLimit } from "@/server/security/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await ensureGuestKey();
  if (!rateLimit(`list-import:${guest}`, 10, 60_000).ok) return jsonError(429, "Trop de requêtes.");
  const body = await readJson(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,32}$/) }));
  if (!body.ok) return body.response;
  const id = await importSharedList(guest, body.data.token);
  return id ? NextResponse.json({ id }, { status: 201 }) : jsonError(404, "Liste partagée introuvable ou limite de listes atteinte.");
}
