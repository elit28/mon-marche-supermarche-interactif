/**
 * Proxy (ex-middleware) : attribue un identifiant invité anonyme et signé
 * à chaque visiteur, pour retrouver panier, favoris et listes sans compte.
 */
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE, createGuestToken, verifyGuestToken } from "@/lib/guest-token";

export async function proxy(request: NextRequest) {
  const current = request.cookies.get(GUEST_COOKIE)?.value;
  if (await verifyGuestToken(current)) return NextResponse.next();

  const { token } = await createGuestToken();
  // Le cookie est aussi injecté dans la requête courante pour que la page le voie dès le premier rendu.
  request.cookies.set(GUEST_COOKIE, token);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(GUEST_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|catalog/images|brand|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml).*)"],
};
