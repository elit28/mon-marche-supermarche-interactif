import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GUEST_COOKIE } from "@/lib/guest-token";
import { getGuestKey } from "@/server/auth/guest";
import { isSameOrigin, jsonError } from "@/server/http";
import { deleteGuestData } from "@/server/services/orders";

/** Supprime toutes les données serveur du visiteur et son identifiant invité. */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError(403, "Origine non autorisée.");
  const guest = await getGuestKey();
  if (guest) await deleteGuestData(guest);
  (await cookies()).delete(GUEST_COOKIE);
  return NextResponse.json({ ok: true });
}
