import type { Metadata } from "next";
import { getPromotedProducts } from "@/server/services/catalog";
import { ProductGrid } from "@/components/shelves/product-grid";
import { InfoIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Promotions (démonstration)" };

export default async function PromotionsPage() {
  const page = await getPromotedProducts(60);
  return (
    <div className="mx-auto max-w-[110rem] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-tomato-600">Offres de la semaine</p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Promotions</h1>
      <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl bg-tomato-50 px-4 py-3 text-sm text-tomato-700 ring-1 ring-tomato-600/15">
        <InfoIcon size={18} className="mt-px shrink-0" />
        Ces promotions sont fictives et générées pour la démonstration. Elles ne correspondent à aucune offre commerciale réelle d’une marque ou d’une enseigne.
      </p>
      <div className="-mx-2 mt-8 sm:-mx-0">
        {page.products.length > 0 ? (
          <ProductGrid products={page.products} nextOffset={null} label="Produits en promotion" />
        ) : (
          <p className="py-12 text-center text-ink-soft">Aucune promotion en cours.</p>
        )}
      </div>
    </div>
  );
}
