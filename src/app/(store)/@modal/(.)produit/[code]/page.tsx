import { notFound } from "next/navigation";
import { getProductDetail, getSimilarProducts } from "@/server/services/catalog";
import { ProductDetail } from "@/components/products/product-detail";
import { ProductModal } from "@/components/products/product-modal";

export default async function ProductModalPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const product = await getProductDetail(code);
  if (!product) notFound();
  const similar = await getSimilarProducts(product);
  return (
    <ProductModal titleId="fiche-produit-titre">
      <ProductDetail product={product} similar={similar} titleId="fiche-produit-titre" />
    </ProductModal>
  );
}
