import { listCategories } from "@/server/services/catalog";
import type { CategorySummary } from "@/types/catalog";
import { AppSync } from "@/components/layout/app-sync";
import { DemoBanner } from "@/components/layout/demo-banner";
import { Footer } from "@/components/layout/footer";
import { LiveRegion } from "@/components/layout/live-region";
import { Header } from "@/components/navigation/header";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { DesktopBasket, MobileCartBar } from "@/components/cart/basket";

/** Le magasin est rendu à la demande (catalogue, prix et promotions vivants). */
export const dynamic = "force-dynamic";

async function loadCategories(): Promise<CategorySummary[]> {
  try {
    return await listCategories();
  } catch (error) {
    console.error("Impossible de charger les rayons :", error);
    return [];
  }
}

export default async function StoreLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const categories = await loadCategories();
  return (
    <>
      <a href="#contenu" className="sr-only-focusable fixed left-3 top-2 z-[60] rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white">
        Aller au contenu
      </a>
      <DemoBanner />
      <Header categories={categories} />
      <main id="contenu" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      {modal}
      <CartDrawer />
      <DesktopBasket />
      <MobileCartBar />
      <LiveRegion />
      <AppSync />
    </>
  );
}
