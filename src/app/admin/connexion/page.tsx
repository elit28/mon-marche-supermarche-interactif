import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/server/auth/admin";
import { LoginForm } from "@/components/admin/login-form";
import { LogoMark } from "@/components/layout/logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration — connexion", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdmin().catch(() => null)) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-soft">
        <LogoMark size={44} />
        <h1 className="mt-4 font-display text-2xl font-semibold">Administration</h1>
        <p className="mb-6 text-sm text-ink-muted">Accès réservé. Créez un compte avec « pnpm admin:create ».</p>
        <LoginForm />
      </div>
    </main>
  );
}
