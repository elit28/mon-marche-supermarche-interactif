import type { Metadata } from "next";
import { ListsOverview } from "@/components/lists/lists-overview";

export const metadata: Metadata = { title: "Mes listes de courses", robots: { index: false } };

export default function ListsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-forest-700">Mon espace</p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mes listes de courses</h1>
      <p className="mt-2 text-ink-soft">Préparez vos courses, partagez une liste par lien, puis transformez-la en panier en un geste.</p>
      <ListsOverview />
    </div>
  );
}
