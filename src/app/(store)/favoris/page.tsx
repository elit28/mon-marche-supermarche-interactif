import type { Metadata } from "next";
import { FavoritesView } from "@/components/lists/favorites-view";

export const metadata: Metadata = { title: "Mes favoris", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-[110rem] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tomato-600">Mon espace</p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mes favoris</h1>
      <FavoritesView />
    </div>
  );
}
