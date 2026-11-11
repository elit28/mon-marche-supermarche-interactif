import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail, getSimilarProducts } from "@/server/services/catalog";
import { ProductDetail } from "@/components/products/product-detail";
import { ChevronLeftIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const product = await getProductDetail(code).catch(() => null);
  if (!product) return { title: "Produit introuvable" };
  return {
    title: `${product.name}${product.brand ? ` — ${product.brand}` : ""}`,
    description: `${product.name}${product.quantity ? `, ${product.quantity}` : ""} au rayon ${product.categoryName}. Fiche issue de ${product.source.name}.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { code } = await params;
  const product = await getProductDetail(code);
  if (!product) notFound();
  const similar = await getSimilarProducts(product);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 md:px-8">
      <Link href={`/rayon/${product.category}`} className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-sm font-semibold text-forest-700 hover:underline">
        <ChevronLeftIcon size={18} /> Rayon {product.categoryName}
      </Link>
      <ProductDetail product={product} similar={similar} titleId="produit-titre" />
    </div>
  );
}
