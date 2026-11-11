"use client";

import { useUiStore } from "@/stores/ui";

/** Annonces polies pour les lecteurs d'écran (ajouts au panier, favoris…). */
export function LiveRegion() {
  const announcement = useUiStore((s) => s.announcement);
  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true" role="status">
      <span key={announcement.id}>{announcement.text}</span>
    </div>
  );
}
