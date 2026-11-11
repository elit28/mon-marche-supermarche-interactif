"use client";

import { useActionState } from "react";
import { runImportAction, type ActionState } from "@/app/admin/actions";

export function ImportButtons() {
  const [state, action, pending] = useActionState<ActionState, FormData>(runImportAction, {});
  return (
    <div className="space-y-3 rounded-2xl bg-white p-5 shadow-soft">
      <div className="grid gap-3 sm:grid-cols-2">
        <form action={action} className="rounded-xl bg-cream-100 p-4">
          <input type="hidden" name="kind" value="snapshot" />
          <p className="font-semibold">Réimporter l’instantané</p>
          <p className="mt-1 text-sm text-ink-muted">Recharge data/catalog/products.json (hors ligne, idempotent). Vos corrections sont conservées.</p>
          <button type="submit" disabled={pending} className="mt-3 rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Lancer
          </button>
        </form>
        <form action={action} className="rounded-xl bg-cream-100 p-4">
          <input type="hidden" name="kind" value="off-refresh" />
          <p className="font-semibold">Mettre à jour depuis Open Food Facts</p>
          <p className="mt-1 text-sm text-ink-muted">Relit 120 fiches via l’API v3 (limites d’usage respectées) et applique les modifications de la source.</p>
          <button type="submit" disabled={pending} className="mt-3 rounded-full bg-forest-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            Lancer
          </button>
        </form>
      </div>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-forest-700" : "text-sm text-tomato-700"}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
