import Link from "next/link";
import { requireAdmin } from "@/server/auth/admin";
import { logoutAction } from "@/app/admin/actions";
import { LogoMark } from "@/components/layout/logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration", robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/produits", label: "Produits & prix" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/imports", label: "Imports" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-cream-100">
      <header className="border-b border-forest-900/10 bg-forest-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-semibold">
            <LogoMark size={30} /> Administration
          </Link>
          <nav aria-label="Administration" className="flex flex-wrap gap-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 text-leaf-100 hover:bg-white/10 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" className="text-leaf-200 underline-offset-2 hover:underline">
              Voir le magasin
            </Link>
            <span className="hidden text-leaf-200 sm:inline">{admin.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
