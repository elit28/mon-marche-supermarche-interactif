import "server-only";
import { cookies } from "next/headers";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, createGuestToken, verifyGuestToken } from "@/lib/guest-token";

/** Identifiant invité de la requête courante (ou `null`). */
export async function getGuestKey(): Promise<string | null> {
  const store = await cookies();
  return verifyGuestToken(store.get(GUEST_COOKIE)?.value);
}

/** Identifiant invité ; en crée un si nécessaire (route handlers et actions serveur uniquement). */
export async function ensureGuestKey(): Promise<string> {
  const existing = await getGuestKey();
  if (existing) return existing;
  const { id, token } = await createGuestToken();
  const store = await cookies();
  store.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return id;
}
