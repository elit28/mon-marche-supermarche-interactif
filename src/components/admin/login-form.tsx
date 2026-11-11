"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Adresse e-mail</span>
        <input name="email" type="email" required autoComplete="username" className="h-12 w-full rounded-xl border border-forest-900/15 bg-white px-3.5 outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Mot de passe</span>
        <input name="password" type="password" required autoComplete="current-password" className="h-12 w-full rounded-xl border border-forest-900/15 bg-white px-3.5 outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10" />
      </label>
      {state.message ? (
        <p role="alert" className="text-sm text-tomato-700">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center rounded-full bg-forest-700 font-semibold text-white disabled:opacity-60">
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
