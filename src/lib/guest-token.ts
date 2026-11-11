/**
 * Jeton d'identité invitée : `<identifiant aléatoire>.<signature HMAC>`.
 * Compatible Web Crypto (proxy, route handlers, Node.js).
 * L'identifiant ne contient aucune donnée personnelle.
 */
export const GUEST_COOKIE = "mm_guest";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET doit contenir au moins 32 caractères.");
    return "dev-only-secret-change-me-dev-only-secret-change-me";
  }
  return secret;
}

function hmacKey(): Promise<CryptoKey> {
  const secret = getSecret();
  if (!cachedKey || cachedKey.secret !== secret) {
    cachedKey = {
      secret,
      key: crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    };
  }
  return cachedKey.key;
}

async function sign(value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(value));
  return toBase64Url(new Uint8Array(signature)).slice(0, 32);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createGuestToken(): Promise<{ id: string; token: string }> {
  const id = toBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  return { id, token: `${id}.${await sign(id)}` };
}

/** Retourne l'identifiant invité si le jeton est authentique, sinon `null`. */
export async function verifyGuestToken(token: string | undefined | null): Promise<string | null> {
  if (!token || token.length > 80) return null;
  const [id, signature] = token.split(".");
  if (!id || !signature || !/^[A-Za-z0-9_-]{24}$/.test(id)) return null;
  return timingSafeEqual(signature, await sign(id)) ? id : null;
}
