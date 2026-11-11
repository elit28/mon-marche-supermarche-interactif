import Image from "next/image";
import { applyPromotion, formatPrice } from "@/lib/pricing";
import { listPromotions } from "@/server/services/admin";
import { deletePromotionAction, togglePromotionAction } from "@/app/admin/actions";
import { PromotionForm } from "@/components/admin/promotion-form";

export default async function AdminPromotionsPage() {
  const promos = await listPromotions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Promotions de démonstration</h1>
        <p className="mt-1 text-sm text-ink-muted">Fictives par nature : elles sont affichées comme telles sur le site public.</p>
      </div>
      <PromotionForm />
      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="p-3">Produit</th>
              <th scope="col" className="p-3">Remise</th>
              <th scope="col" className="p-3">Prix</th>
              <th scope="col" className="p-3">Validité</th>
              <th scope="col" className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {promos.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "opacity-60"}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Image src={p.image_path} alt="" width={40} height={48} className="h-12 w-10 object-contain" />
                    <span>
                      <span className="block font-semibold">{p.name}</span>
                      <span className="text-xs text-ink-muted">
                        {p.brand} · <span className="font-mono">{p.barcode}</span>
                      </span>
                    </span>
                  </div>
                </td>
                <td className="p-3 font-semibold text-tomato-700">{p.label}</td>
                <td className="p-3 tabular-nums">
                  {formatPrice(p.amount_cents)} → <strong>{formatPrice(applyPromotion(p.amount_cents, { kind: p.kind, value: p.value }))}</strong>
                </td>
                <td className="p-3 text-xs">
                  dès le {p.starts_at.toLocaleDateString("fr-FR")}
                  <br />
                  {p.ends_at ? `jusqu'au ${p.ends_at.toLocaleDateString("fr-FR")}` : "sans date de fin"}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <form action={togglePromotionAction}>
                      <input type="hidden" name="promotionId" value={p.id} />
                      <input type="hidden" name="value" value={String(!p.is_active)} />
                      <button type="submit" className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold">
                        {p.is_active ? "Suspendre" : "Réactiver"}
                      </button>
                    </form>
                    <form action={deletePromotionAction}>
                      <input type="hidden" name="promotionId" value={p.id} />
                      <button type="submit" className="rounded-full bg-tomato-50 px-3 py-1 text-xs font-semibold text-tomato-700">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
