import Link from "next/link";
import { InfoIcon } from "@/components/ui/icons";

/** Bandeau permanent : le site est une démonstration, les prix sont fictifs. */
export function DemoBanner() {
  return (
    <div className="bg-forest-900 text-[0.8rem] text-leaf-100">
      <p className="mx-auto flex max-w-[110rem] items-center justify-center gap-2 px-4 py-1.5 text-center sm:px-6 lg:px-10">
        <InfoIcon size={15} className="shrink-0 text-leaf-400" />
        <span>
          <strong className="font-semibold text-white">Démonstration</strong> · produits réels, <strong className="font-semibold text-white">prix fictifs</strong> · aucune commande ni aucun paiement réels.{" "}
          <Link href="/a-propos" className="font-semibold text-white underline decoration-leaf-400 underline-offset-2 hover:decoration-white">
            En savoir plus
          </Link>
        </span>
      </p>
    </div>
  );
}
