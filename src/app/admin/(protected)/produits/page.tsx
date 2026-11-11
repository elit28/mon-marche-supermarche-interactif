import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog/categories";
import { formatPrice } from "@/lib/pricing";
import { QUALITY_ISSUE_LABELS, type QualityIssue } from "@/server/catalog/quality";
import { listAdminProducts, type AdminProductStatus } from "@/server/services/admin";
import { imageQualityAction, toggleFlagAction, updateCategoryAction, updatePriceAction } from "@/app/admin/actions";

const STATUSES: { value: AdminProductStatus; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "actifs", label: "Actifs" },
  { value: "inactifs", label: "Désactivés" },
  { value: "incomplets", label: "Incomplets" },
  { value: "non-detoures", label: "Photos non détourées" },
  { value: "signales", label: "Photos signalées" },
  { value: "en-avant", label: "Mis en avant" },
];

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = (STATUSES.find((s) => s.value === sp.statut)?.value ?? "tous") as AdminProductStatus;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { rows, total, pageCount } = await listAdminProducts({ q: sp.q?.slice(0, 80), category: sp.rayon, status, page });
  const qs = (patch: Record<string, string | number>) => {
    const params = new URLSearchParams(Object.entries({ q: sp.q ?? "", rayon: sp.rayon ?? "", statut: status, page: String(page), ...patch }).filter(([, v]) => v !== "" && v !== undefined).map(([k, v]) => [k, String(v)]));
    return `?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Produits & prix de démonstration</h1>
      <form className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-white p-3 shadow-soft" method="get">
        <input name="q" defaultValue={sp.q} placeholder="Nom, marque ou code-barres" aria-label="Rechercher un produit" className="h-11 min-w-56 flex-1 rounded-xl border border-forest-900/15 px-3" />
        <select name="rayon" defaultValue={sp.rayon ?? ""} aria-label="Rayon" className="h-11 rounded-xl border border-forest-900/15 px-3">
          <option value="">Tous les rayons</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="statut" defaultValue={status} aria-label="Statut" className="h-11 rounded-xl border border-forest-900/15 px-3">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-forest-700 px-5 font-semibold text-white">
          Filtrer
        </button>
      </form>
      <p className="mt-3 text-sm text-ink-muted">
        {total} produit{total > 1 ? "s" : ""} · page {page}/{pageCount}. Les prix sont fictifs ; chaque modification est historisée.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="bg-cream-100 text-left text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="p-3">Produit</th>
              <th scope="col" className="p-3">Rayon › étagère</th>
              <th scope="col" className="p-3">Prix démo</th>
              <th scope="col" className="p-3">Photo</th>
              <th scope="col" className="p-3">Qualité</th>
              <th scope="col" className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {rows.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "bg-cream-50 opacity-70"}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Image src={p.image_path} alt="" width={p.image_width} height={p.image_height} sizes="48px" className="h-12 w-10 object-contain" />
                    <div className="min-w-0">
                      <p className="max-w-64 truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-ink-muted">
                        {[p.brand, p.quantity_label].filter(Boolean).join(" · ")} · <span className="font-mono">{p.barcode}</span>
                      </p>
                      <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest-700 underline">
                        Fiche source
                      </a>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <form action={updateCategoryAction} className="flex gap-1">
                    <input type="hidden" name="productId" value={p.id} />
                    <select name="target" defaultValue={`${p.category}/${p.subshelf}`} aria-label={`Rayon de ${p.name}`} className="h-9 max-w-52 rounded-lg border border-forest-900/15 px-2 text-xs">
                      {CATEGORIES.map((c) => (
                        <optgroup key={c.slug} label={c.name}>
                          {c.subshelves.map((s) => (
                            <option key={s.slug} value={`${c.slug}/${s.slug}`}>
                              {s.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <button type="submit" className="h-9 rounded-lg bg-cream-100 px-2 text-xs font-semibold">
                      OK
                    </button>
                  </form>
                  {p.category_locked ? <p className="mt-1 text-xs text-ink-muted">Corrigé manuellement</p> : null}
                </td>
                <td className="p-3">
                  <form action={updatePriceAction} className="flex items-center gap-1">
                    <input type="hidden" name="productId" value={p.id} />
                    <input
                      name="price"
                      defaultValue={(p.amount_cents / 100).toFixed(2).replace(".", ",")}
                      inputMode="decimal"
                      aria-label={`Prix de ${p.name} en euros`}
                      className="h-9 w-20 rounded-lg border border-forest-900/15 px-2 text-right tabular-nums"
                    />
                    <span aria-hidden="true">€</span>
                    <button type="submit" className="h-9 rounded-lg bg-cream-100 px-2 text-xs font-semibold">
                      OK
                    </button>
                  </form>
                  <p className="mt-1 text-xs text-ink-muted">{formatPrice(p.amount_cents)} (fictif)</p>
                </td>
                <td className="p-3">
                  <p className="text-xs">{p.is_cutout ? "Détourée" : "Fond d'origine"}</p>
                  <form action={imageQualityAction} className="mt-1 flex gap-1">
                    <input type="hidden" name="productId" value={p.id} />
                    <select name="status" defaultValue={p.quality_status} aria-label={`Qualité de la photo de ${p.name}`} className="h-9 rounded-lg border border-forest-900/15 px-2 text-xs">
                      <option value="ok">Validée</option>
                      <option value="flagged">À vérifier</option>
                      <option value="rejected">Rejetée (masquée)</option>
                    </select>
                    <button type="submit" className="h-9 rounded-lg bg-cream-100 px-2 text-xs font-semibold">
                      OK
                    </button>
                  </form>
                </td>
                <td className="p-3">
                  <span className="font-semibold tabular-nums">{p.quality_score}/100</span>
                  <ul className="mt-1 space-y-0.5 text-xs text-ink-muted">
                    {p.quality_issues.slice(0, 3).map((i) => (
                      <li key={i}>{QUALITY_ISSUE_LABELS[i as QualityIssue] ?? i}</li>
                    ))}
                  </ul>
                </td>
                <td className="space-y-1 p-3">
                  <form action={toggleFlagAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="flag" value="is_active" />
                    <input type="hidden" name="value" value={String(!p.is_active)} />
                    <button type="submit" className={p.is_active ? "rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-forest-800" : "rounded-full bg-tomato-50 px-3 py-1 text-xs font-semibold text-tomato-700"}>
                      {p.is_active ? "Actif · désactiver" : "Désactivé · réactiver"}
                    </button>
                  </form>
                  <form action={toggleFlagAction}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="flag" value="is_featured" />
                    <input type="hidden" name="value" value={String(!p.is_featured)} />
                    <button type="submit" className="rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold">
                      {p.is_featured ? "★ Mis en avant" : "☆ Mettre en avant"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination" className="mt-4 flex justify-between">
        {page > 1 ? (
          <Link href={qs({ page: page - 1 })} className="rounded-full bg-white px-4 py-2 font-semibold shadow-soft">
            ← Précédent
          </Link>
        ) : (
          <span />
        )}
        {page < pageCount ? (
          <Link href={qs({ page: page + 1 })} className="rounded-full bg-white px-4 py-2 font-semibold shadow-soft">
            Suivant →
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
