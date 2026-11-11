"use client";

import Link from "next/link";
import type { CategorySummary } from "@/types/catalog";
import { useFavoritesStore } from "@/stores/favorites";
import { CartPill } from "@/components/cart/cart-pill";
import { HeartIcon, ListIcon, UserIcon } from "@/components/ui/icons";
import { Logo } from "@/components/layout/logo";
import { CategoryMenu } from "./category-menu";
import { SearchBox } from "./search-box";

function FavoritesLink() {
  const count = useFavoritesStore((s) => (s.hydrated ? Object.keys(s.items).length : 0));
  return (
    <Link
      href="/favoris"
      className="relative grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-white hover:text-tomato-600 sm:size-11"
      aria-label={`Mes favoris${count ? ` (${count})` : ""}`}
    >
      <HeartIcon size={21} />
      {count > 0 ? (
        <span className="absolute right-1 top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-tomato-600 px-1 text-[0.65rem] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function Header({ categories }: { categories: CategorySummary[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-forest-900/8 bg-cream-50/88 backdrop-blur-md supports-[backdrop-filter]:bg-cream-50/75">
      <div className="mx-auto flex max-w-[110rem] flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 sm:gap-x-3 sm:px-6 lg:flex-nowrap lg:gap-x-5 lg:py-2.5 lg:px-10">
        <Link href="/" className="shrink-0 rounded-xl" aria-label="MON MARCHÉ — accueil">
          <Logo compact />
        </Link>

        <div className="order-3 flex w-full items-center gap-2 lg:order-none lg:w-auto lg:flex-1">
          <CategoryMenu categories={categories} compact />
          <SearchBox categories={categories} className="min-w-0 flex-1 lg:max-w-[42rem]" />
        </div>

        <nav aria-label="Mon espace" className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link href="/promotions" className="hidden h-11 items-center rounded-full px-3 text-sm font-semibold text-tomato-700 transition hover:bg-tomato-50 xl:inline-flex">
            Promos
          </Link>
          <FavoritesLink />
          <Link href="/listes" className="hidden size-11 place-items-center rounded-full text-ink-soft transition hover:bg-white hover:text-forest-700 sm:grid" aria-label="Mes listes de courses">
            <ListIcon size={21} />
          </Link>
          <Link href="/mon-espace" className="grid size-10 place-items-center rounded-full text-ink-soft transition hover:bg-white hover:text-forest-700 sm:size-11" aria-label="Mon espace (invité)">
            <UserIcon size={21} />
          </Link>
          <CartPill className="ml-1" />
        </nav>
      </div>
    </header>
  );
}
