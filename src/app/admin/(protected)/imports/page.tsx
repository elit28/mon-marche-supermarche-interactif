import { listImportJobs } from "@/server/services/admin";
import { ImportButtons } from "@/components/admin/import-buttons";

export default async function AdminImportsPage() {
  const jobs = await listImportJobs();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Imports du catalogue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Le catalogue complet (découverte, photos, détourage) se régénère en ligne de commande : <code className="rounded bg-white px-1.5">pnpm catalog:import</code>. Rapport détaillé :
          docs/CATALOGUE-RAPPORT.md.
        </p>
      </div>
      <ImportButtons />
      <ul className="space-y-3">
        {jobs.map((j) => (
          <li key={j.id} className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Import n°{j.id} · {j.kind}
              </p>
              <span className={j.status === "succeeded" ? "rounded-full bg-leaf-100 px-3 py-1 text-xs font-semibold text-forest-800" : j.status === "running" ? "rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold" : "rounded-full bg-tomato-50 px-3 py-1 text-xs font-semibold text-tomato-700"}>
                {{ succeeded: "Réussi", running: "En cours", failed: "Échec", partial: "Partiel" }[j.status] ?? j.status}
              </span>
            </div>
            <p className="text-sm text-ink-muted">
              {j.started_at.toLocaleString("fr-FR")} · par {j.triggered_by}
              {j.finished_at ? ` · ${Math.round((j.finished_at.getTime() - j.started_at.getTime()) / 1000)} s` : ""}
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-cream-100 p-3 text-xs">{JSON.stringify(j.stats, null, 1)}</pre>
            {j.error ? <p className="mt-2 text-sm text-tomato-700">{j.error}</p> : null}
            {j.log ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold">Journal</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-ink-soft">{j.log}</pre>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
