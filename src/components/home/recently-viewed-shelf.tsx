"use client";

import { useRecentlyViewedStore } from "@/stores/recently-viewed";
import { Shelf } from "@/components/shelves/shelf";
import { ClockIcon } from "@/components/ui/icons";

/** Derniers produits consultés (données de cet appareil uniquement). */
export function RecentlyViewedShelf() {
  const items = useRecentlyViewedStore((s) => s.items);
  const hydrated = useRecentlyViewedStore((s) => s.hydrated);
  if (!hydrated || items.length === 0) return null;
  return <Shelf id="vus-recemment" title="Vus récemment" eyebrow="Pour vous" accent="#3f4d45" icon={<ClockIcon size={22} />} countLabel={`${items.length}`} products={items} />;
}
