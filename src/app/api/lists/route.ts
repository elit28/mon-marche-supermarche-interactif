import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureGuestKey, getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { createList, getLists } from "@/server/services/lists";
import { rateLimit } from "@/server/security/rate-limit";
import { listNameSchema } from "@/lib/validation";

export async function GET() {
  const guest = await getGuestKey();
  if (!guest) return NextResponse.json({ lists: [] });
  return NextResponse.json({ lists: await getLists(guest) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await ensureGuestKey();
  if (!rateLimit(`lists:${guest}`, 30, 60_000).ok) return jsonError(429, "Trop de requêtes.");
  const body = await readJson(request, z.object({ name: listNameSchema }));
  if (!body.ok) return body.response;
  const result = await createList(guest, body.data.name);
  if ("error" in result) return jsonError(409, result.error);
  return NextResponse.json({ list: result }, { status: 201 });
}
