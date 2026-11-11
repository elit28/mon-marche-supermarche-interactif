/**
 * Crée (ou met à jour) un compte administrateur.
 *
 *   pnpm admin:create admin@exemple.fr "un mot de passe long"
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm admin:create
 */
import "./lib/env";
import { hashPassword } from "../src/server/auth/password";
import { closeDb, getSql } from "../src/server/db";

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const email = (args[0] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = args[1] ?? process.env.ADMIN_PASSWORD ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse e-mail invalide.");
  if (password.length < 12) throw new Error("Le mot de passe doit contenir au moins 12 caractères.");
  const hash = await hashPassword(password);
  await getSql()`
    INSERT INTO users (email, password_hash, role, display_name) VALUES (${email}, ${hash}, 'admin', 'Administration')
    ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, role = 'admin'
  `;
  console.log(`✅ Compte administrateur prêt : ${email}`);
}

main()
  .catch((error) => {
    console.error(`❌ ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
