"use client";

/** Fenêtre de fiche produit ouverte par-dessus les rayons (route interceptée). */
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { CloseIcon } from "@/components/ui/icons";

export function ProductModal({ children, titleId }: { children: React.ReactNode; titleId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  // Le créneau @modal conserve son contenu lors d'une navigation douce vers une autre
  // page : la fenêtre se retire d'elle-même dès que l'URL n'est plus celle d'un produit.
  if (!pathname.startsWith("/produit/")) return null;

  const close = () => {
    setOpen(false);
    window.setTimeout(() => router.back(), 220);
  };

  return (
    <Sheet open={open} onClose={close} labelledBy={titleId} placement="responsive-center">
      <div className="sticky top-0 z-20 flex justify-end bg-gradient-to-b from-cream-50 via-cream-50/90 to-transparent px-3 pt-3 md:absolute md:right-0 md:bg-none">
        <span className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-cream-300 md:hidden" aria-hidden="true" />
        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full bg-white shadow-soft ring-1 ring-forest-900/10 hover:bg-cream-100" aria-label="Fermer la fiche produit">
          <CloseIcon />
        </button>
      </div>
      <div className="overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+var(--safe-bottom))] sm:px-6 md:px-8 md:pt-8">{children}</div>
    </Sheet>
  );
}
