import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
      <LogoMark size={56} />
      <p className="mt-6 font-display text-7xl font-semibold text-forest-700">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Cette allée n’existe pas</h1>
      <p className="mt-3 text-ink-soft">Le produit ou la page demandés ne sont plus en rayon. Revenez à l’entrée du magasin pour reprendre vos courses.</p>
      <Link href="/" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
        Retour aux rayons
      </Link>
    </main>
  );
}
