"use client";

/**
 * En-tête épuré : logo, recherche, favoris, listes, pastille « Total »,
 * compte et menu (plan du magasin). Une seule ligne sur ordinateur.
 */
import Link from "next/link";
import type { CategorySummary } from "@/types/catalog";
import { useFavoritesStore } from "@/stores/favorites";
import { CartPill } from "@/components/cart/cart-pill";
import { HeartIcon, ListIcon, UserIcon } from "@/components/ui/icons";
import { LogoMark } from "@/components/layout/logo";
import { CategoryMenu } from "./category-menu";
import { SearchBox } from "./search-box";

function FavoritesLink() {
  const count = useFavoritesStore((s) => (s.hydrated ? Object.keys(s.items).length : 0));
  return (
    <Link
      href="/favoris"
      className="relative grid size-10 place-items-center rounded-full text-ink transition hover:bg-cream-100 hover:text-tomato-600 sm:size-11"
      aria-label={`Mes favoris${count ? ` (${count})` : ""}`}
    >
      <HeartIcon size={22} />
      {count > 0 ? (
        <span className="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-tomato-600 px-1 text-[0.65rem] font-bold text-white">{count}</span>
      ) : null}
    </Link>
  );
}

export function Header({ categories }: { categories: CategorySummary[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/8 bg-white">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2.5 sm:px-6 md:h-[4.5rem] md:flex-nowrap md:gap-x-4 md:py-0 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-xl">
          <LogoMark size={34} />
          <span className="text-[1.45rem] font-extrabold leading-none tracking-tight">
            <span className="text-forest-900">mon</span>
            <span className="text-forest-600">marché</span>
            <span className="sr-only"> — accueil</span>
          </span>
        </Link>
        <span className="hidden h-7 w-px bg-forest-700/40 md:block" aria-hidden="true" />

        <SearchBox categories={categories} className="order-last w-full md:order-none md:w-auto md:max-w-[40rem] md:flex-1" />

        <nav aria-label="Mon espace" className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          <FavoritesLink />
          <Link href="/listes" className="hidden size-11 place-items-center rounded-full text-ink transition hover:bg-cream-100 hover:text-forest-700 sm:grid" aria-label="Mes listes de courses">
            <ListIcon size={22} />
          </Link>
          <CartPill />
          <Link href="/mon-espace" className="hidden size-11 place-items-center rounded-full text-ink transition hover:bg-cream-100 hover:text-forest-700 sm:grid" aria-label="Mon espace (invité)">
            <UserIcon size={22} />
          </Link>
          <CategoryMenu categories={categories} />
        </nav>
      </div>
    </header>
  );
}
