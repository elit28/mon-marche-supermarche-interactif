import Link from "next/link";
import { QUALITY_ISSUE_LABELS, type QualityIssue } from "@/server/catalog/quality";
import { getDashboardStats, listImportJobs } from "@/server/services/admin";

export default async function AdminDashboard() {
  const [{ counts, issues }, jobs] = await Promise.all([getDashboardStats(), listImportJobs()]);
  const cards = [
    { label: "Produits actifs", value: counts.active, href: "/admin/produits?statut=actifs" },
    { label: "Désactivés", value: counts.inactive, href: "/admin/produits?statut=inactifs" },
    { label: "Fiches incomplètes", value: counts.incomplete, href: "/admin/produits?statut=incomplets" },
    { label: "Photos non détourées", value: counts.not_cutout, href: "/admin/produits?statut=non-detoures" },
    { label: "Photos signalées", value: counts.flagged, href: "/admin/produits?statut=signales" },
    { label: "Mis en avant", value: counts.featured, href: "/admin/produits?statut=en-avant" },
    { label: "Promotions actives", value: counts.promos, href: "/admin/promotions" },
    { label: "Commandes simulées", value: counts.orders },
  ];
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Tableau de bord</h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            {c.href ? (
              <Link href={c.href} className="block rounded-2xl bg-white p-5 shadow-soft hover:ring-2 hover:ring-forest-700/20">
                <span className="block text-3xl font-bold tabular-nums">{c.value}</span>
                <span className="text-sm text-ink-muted">{c.label}</span>
              </Link>
            ) : (
              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <span className="block text-3xl font-bold tabular-nums">{c.value}</span>
                <span className="text-sm text-ink-muted">{c.label}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="font-display text-xl font-semibold">Anomalies de qualité (produits actifs)</h2>
        <ul className="mt-3 divide-y divide-cream-200 text-sm">
          {issues.map((i) => (
            <li key={i.issue} className="flex justify-between py-2">
              <span>{QUALITY_ISSUE_LABELS[i.issue as QualityIssue] ?? i.issue}</span>
              <span className="font-semibold tabular-nums">{i.count}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Derniers imports</h2>
          <Link href="/admin/imports" className="text-sm font-semibold text-forest-700 underline">
            Gérer les imports
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-cream-200 text-sm">
          {jobs.slice(0, 5).map((j) => (
            <li key={j.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                n°{j.id} · {j.kind} · {j.triggered_by}
              </span>
              <span className={j.status === "succeeded" ? "text-forest-700" : j.status === "running" ? "text-ink-muted" : "text-tomato-700"}>
                {j.status} · {j.started_at.toLocaleString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
