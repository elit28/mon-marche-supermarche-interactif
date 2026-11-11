"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCartStore } from "@/stores/cart";
import { useFavoritesStore } from "@/stores/favorites";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";

/** Effacement complet des données (appareil + serveur). */
export function ForgetMe() {
  const [state, setState] = useState<"idle" | "confirm" | "done" | "error">("idle");
  const router = useRouter();
  async function forget() {
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) throw new Error();
      useCartStore.getState().clear();
      useRecentlyViewedStore.getState().clear();
      useFavoritesStore.setState({ items: {} });
      setState("done");
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1200);
    } catch {
      setState("error");
    }
  }
  return (
    <div className="mt-5">
      {state === "idle" ? (
        <button type="button" onClick={() => setState("confirm")} className="min-h-11 rounded-full bg-tomato-50 px-5 text-sm font-semibold text-tomato-700 ring-1 ring-tomato-600/20 hover:bg-tomato-100">
          Effacer toutes mes données
        </button>
      ) : state === "confirm" ? (
        <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirmer l'effacement des données">
          <span className="text-sm font-medium">Panier, favoris, listes et commandes simulées seront supprimés.</span>
          <button type="button" autoFocus onClick={() => setState("idle")} className="min-h-11 rounded-full px-4 text-sm font-semibold hover:bg-cream-100">
            Annuler
          </button>
          <button type="button" onClick={() => void forget()} className="min-h-11 rounded-full bg-tomato-600 px-5 text-sm font-semibold text-white">
            Tout effacer
          </button>
        </div>
      ) : state === "done" ? (
        <p role="status" className="text-sm font-semibold text-forest-700">
          Vos données ont été effacées.
        </p>
      ) : (
        <p role="alert" className="text-sm text-tomato-700">
          L’effacement a échoué, réessayez.
        </p>
      )}
    </div>
  );
}
