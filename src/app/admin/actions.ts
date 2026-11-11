"use server";

/**
 * Actions serveur de l'administration. Chacune revérifie la session
 * administrateur (une action serveur est un point d'entrée public) et valide
 * strictement ses entrées avec Zod. Next.js vérifie l'origine des requêtes.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/server/auth/admin";
import { verifyPassword } from "@/server/auth/password";
import { getSql } from "@/server/db";
import {
  createPromotion,
  deletePromotion,
  runSnapshotImport,
  setImageQuality,
  setProductCategory,
  setProductFlag,
  setPromotionActive,
  startOffRefresh,
  updatePrice,
} from "@/server/services/admin";
import { clientIp, rateLimit } from "@/server/security/rate-limit";

export interface ActionState {
  ok?: boolean;
  message?: string;
}

const id = z.coerce.number().int().positive();

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ip = clientIp(await headers());
  if (!rateLimit(`admin-login:${ip}`, 6, 15 * 60_000).ok) {
    return { message: "Trop de tentatives. Réessayez dans quelques minutes." };
  }
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(200) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { message: "Identifiants invalides." };
  const rows = await getSql()<{ id: string; password_hash: string; role: string }[]>`
    SELECT id, password_hash, role FROM users WHERE email = ${parsed.data.email}
  `;
  const user = rows[0];
  // Vérification effectuée même si l'utilisateur n'existe pas (temps de réponse homogène).
  const valid = await verifyPassword(parsed.data.password, user?.password_hash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA");
  if (!user || !valid || user.role !== "admin") return { message: "Identifiants invalides." };
  await createAdminSession(user.id);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/connexion");
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
}

export async function updatePriceAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      productId: id,
      price: z
        .string()
        .trim()
        .transform((v) => Math.round(Number.parseFloat(v.replace(",", ".")) * 100))
        .pipe(z.number().int().min(1).max(99_999)),
    })
    .safeParse({ productId: form.get("productId"), price: form.get("price") });
  if (!parsed.success) return;
  await updatePrice(parsed.data.productId, parsed.data.price, admin.email, "Modification manuelle (prix de démonstration)");
  refresh();
}

export async function toggleFlagAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({ productId: id, flag: z.enum(["is_active", "is_featured"]), value: z.enum(["true", "false"]) })
    .safeParse({ productId: form.get("productId"), flag: form.get("flag"), value: form.get("value") });
  if (!parsed.success) return;
  await setProductFlag(parsed.data.productId, parsed.data.flag, parsed.data.value === "true");
  refresh();
}

export async function updateCategoryAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({ productId: id, target: z.string().regex(/^[a-z0-9-]+\/[a-z0-9-]+$/) })
    .safeParse({ productId: form.get("productId"), target: form.get("target") });
  if (!parsed.success) return;
  const [category, subshelf] = parsed.data.target.split("/") as [string, string];
  await setProductCategory(parsed.data.productId, category, subshelf);
  refresh();
}

export async function imageQualityAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z
    .object({ productId: id, status: z.enum(["ok", "flagged", "rejected"]) })
    .safeParse({ productId: form.get("productId"), status: form.get("status") });
  if (!parsed.success) return;
  await setImageQuality(parsed.data.productId, parsed.data.status);
  refresh();
}

export async function createPromotionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z
    .object({
      barcode: z.string().trim().regex(/^\d{8,14}$/, "Code-barres invalide."),
      kind: z.enum(["percent", "amount"]),
      value: z
        .string()
        .trim()
        .transform((v) => Number.parseFloat(v.replace(",", "."))),
      endsAt: z
        .string()
        .optional()
        .transform((v) => (v ? new Date(`${v}T23:59:59`) : null)),
    })
    .safeParse({ barcode: form.get("barcode"), kind: form.get("kind"), value: form.get("value"), endsAt: form.get("endsAt") || undefined });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Données invalides." };
  const { kind } = parsed.data;
  const value = kind === "percent" ? Math.round(parsed.data.value) : Math.round(parsed.data.value * 100);
  if (!Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 90) || (kind === "amount" && value > 5_000)) {
    return { message: kind === "percent" ? "Le pourcentage doit être compris entre 1 et 90." : "La remise doit être comprise entre 0,01 € et 50 €." };
  }
  if (parsed.data.endsAt && parsed.data.endsAt.getTime() < Date.now()) return { message: "La date de fin est déjà passée." };
  const error = await createPromotion({ barcode: parsed.data.barcode, kind, value, endsAt: parsed.data.endsAt });
  if (error) return { message: error };
  refresh();
  return { ok: true, message: "Promotion de démonstration créée." };
}

export async function togglePromotionAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ promotionId: id, value: z.enum(["true", "false"]) }).safeParse({ promotionId: form.get("promotionId"), value: form.get("value") });
  if (!parsed.success) return;
  await setPromotionActive(parsed.data.promotionId, parsed.data.value === "true");
  refresh();
}

export async function deletePromotionAction(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(form.get("promotionId"));
  if (!parsed.success) return;
  await deletePromotion(parsed.data);
  refresh();
}

export async function runImportAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const kind = form.get("kind");
  const error = kind === "off-refresh" ? await startOffRefresh(admin.email) : await runSnapshotImport(admin.email);
  refresh();
  if (error) return { message: error };
  return {
    ok: true,
    message: kind === "off-refresh" ? "Mise à jour depuis Open Food Facts lancée en arrière-plan (environ 2 minutes)." : "Instantané réimporté avec succès.",
  };
}
