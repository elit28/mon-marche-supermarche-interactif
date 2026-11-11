import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/pricing";
import { finalPriceCents, productHref } from "@/lib/product";
import { getSharedList } from "@/server/services/lists";
import { SharedListActions } from "@/components/lists/shared-list-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Liste de courses partagée", robots: { index: false, follow: false } };

export default async function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const list = await getSharedList(token);
  if (!list) notFound();
  const products = list.items.filter((i) => i.product).map((i) => ({ product: i.product!, quantity: i.quantity }));
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-forest-700">Liste partagée</p>
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{list.name}</h1>
      <p className="mt-2 text-ink-soft">
        {list.items.length} article{list.items.length > 1 ? "s" : ""} · lecture seule. Prix fictifs de démonstration.
      </p>
      <SharedListActions token={token} products={products} />
      <ul className="mt-6 space-y-2">
        {list.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(23_35_28/0.06)]">
            {item.product ? (
              <>
                <Link href={productHref(item.product)} scroll={false} className="grid size-12 shrink-0 place-items-center">
                  <Image src={item.product.image.src} alt="" width={item.product.image.width} height={item.product.image.height} sizes="48px" className="max-h-12 w-auto object-contain" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.product.name}</p>
                  <p className="text-xs text-ink-muted">{[item.product.brand, item.product.quantity].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="text-sm tabular-nums text-ink-soft">
                  {item.quantity} × {formatPrice(finalPriceCents(item.product))}
                </span>
              </>
            ) : (
              <>
                <span className="grid size-12 place-items-center rounded-xl bg-cream-100 text-lg" aria-hidden="true">
                  ✎
                </span>
                <p className="flex-1 font-medium">{item.label}</p>
                <span className="text-sm text-ink-soft">× {item.quantity}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
