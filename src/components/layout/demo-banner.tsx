import Link from "next/link";
import { InfoIcon } from "@/components/ui/icons";

/** Bandeau permanent : le site est une démonstration, les prix sont fictifs. */
export function DemoBanner() {
  return (
    <div className="bg-[#e3e8e0] text-xs text-ink-soft">
      <p className="mx-auto flex max-w-[110rem] items-center justify-center gap-1.5 px-4 py-1 text-center sm:px-6 lg:px-8">
        <InfoIcon size={13} className="shrink-0" />
        <span>
          <strong className="font-semibold text-ink">Démo</strong> · produits réels, <strong className="font-semibold text-ink">prix fictifs</strong>, aucun paiement ·{" "}
          <Link href="/a-propos" className="font-semibold text-forest-800 underline underline-offset-2">
            En savoir plus
          </Link>
        </span>
      </p>
    </div>
  );
}
