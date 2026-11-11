/**
 * Sessions d'administration : jeton aléatoire dans un cookie httpOnly,
 * seule son empreinte SHA-256 est stockée en base. Rôle « admin » exigé.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSql } from "../db";

export const ADMIN_COOKIE = "mm_admin";
const SESSION_HOURS = 8;

const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  await getSql()`INSERT INTO sessions (id, user_id, expires_at) VALUES (${digest(token)}, ${userId}, ${expires})`;
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires,
  });
}

export async function getAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const rows = await getSql()<{ id: string; email: string; display_name: string | null }[]>`
    SELECT u.id, u.email, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${digest(token)} AND s.expires_at > now() AND u.role = 'admin'
  `;
  const row = rows[0];
  return row ? { id: row.id, email: row.email, displayName: row.display_name } : null;
}

/** À appeler en tête de chaque page ET de chaque action serveur d'administration. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/connexion");
  return admin;
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const sql = getSql();
  if (token) await sql`DELETE FROM sessions WHERE id = ${digest(token)}`;
  store.delete(ADMIN_COOKIE);
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
}
