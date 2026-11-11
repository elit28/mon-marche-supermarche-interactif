"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="mx-auto max-w-xl px-6 py-24 text-center" role="alert">
      <h1 className="font-display text-3xl font-semibold">Un rayon s’est renversé</h1>
      <p className="mt-3 text-ink-soft">Une erreur inattendue est survenue. Votre panier est conservé sur cet appareil.</p>
      <button type="button" onClick={reset} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
        Réessayer
      </button>
    </section>
  );
}
