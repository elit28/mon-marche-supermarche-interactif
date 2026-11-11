"use client";

import { useActionState } from "react";
import { createPromotionAction, type ActionState } from "@/app/admin/actions";

export function PromotionForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createPromotionAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-2xl bg-white p-4 shadow-soft sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] sm:items-end">
      <label className="text-sm">
        <span className="mb-1 block font-medium">Code-barres</span>
        <input name="barcode" required inputMode="numeric" pattern="\d{8,14}" className="h-11 w-full rounded-xl border border-forest-900/15 px-3 font-mono" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Type</span>
        <select name="kind" className="h-11 w-full rounded-xl border border-forest-900/15 px-3">
          <option value="percent">Pourcentage</option>
          <option value="amount">Montant (€)</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Valeur</span>
        <input name="value" required inputMode="decimal" placeholder="20" className="h-11 w-full rounded-xl border border-forest-900/15 px-3" />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Fin (facultatif)</span>
        <input name="endsAt" type="date" className="h-11 w-full rounded-xl border border-forest-900/15 px-3" />
      </label>
      <button type="submit" disabled={pending} className="h-11 rounded-xl bg-forest-700 px-5 font-semibold text-white disabled:opacity-60">
        Créer
      </button>
      {state.message ? (
        <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-forest-700 sm:col-span-5" : "text-sm text-tomato-700 sm:col-span-5"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
