"use client";

/** État d'interface éphémère (non persisté). */
import { create } from "zustand";

interface UiState {
  cartOpen: boolean;
  /** Message pour les technologies d'assistance (région live). */
  announcement: { id: number; text: string };
  /** Incrémenté à chaque arrivée d'un produit dans le panier (rebond). */
  basketBump: number;
  openCart: () => void;
  closeCart: () => void;
  announce: (text: string) => void;
  bumpBasket: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  cartOpen: false,
  announcement: { id: 0, text: "" },
  basketBump: 0,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  announce: (text) => set((s) => ({ announcement: { id: s.announcement.id + 1, text } })),
  bumpBasket: () => set((s) => ({ basketBump: s.basketBump + 1 })),
}));
