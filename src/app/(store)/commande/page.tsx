import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";

export const metadata: Metadata = { title: "Commande (démonstration)", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-forest-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-leaf-100">
        Parcours de démonstration · aucun paiement
      </p>
      <CheckoutFlow />
    </div>
  );
}
