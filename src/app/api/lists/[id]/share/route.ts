import { NextResponse } from "next/server";
import { z } from "zod";
import { getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError, readJson } from "@/server/http";
import { setSharing } from "@/server/services/lists";

/** Active (nouveau jeton) ou révoque le lien de partage d'une liste. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  if (!guest) return jsonError(404, "Liste introuvable.");
  const body = await readJson(request, z.object({ enabled: z.boolean() }));
  if (!body.ok) return body.response;
  const { id } = await params;
  const token = await setSharing(guest, id, body.data.enabled);
  if (token === false) return jsonError(404, "Liste introuvable.");
  return NextResponse.json({ shareToken: token });
}
