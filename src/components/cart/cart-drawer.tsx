"use client";

/**
 * Tiroir du panier : panneau latéral sur ordinateur, feuille glissante sur
 * mobile. Les lignes arrivent en cascade, chacune baignée d'un halo de la
 * couleur de son emballage.
 */
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { FREE_DELIVERY_THRESHOLD_CENTS, formatPrice, MAX_QUANTITY_PER_ITEM } from "@/lib/pricing";
import { finalPriceCents, productHref } from "@/lib/product";
import { useCartStore, useCartTotals, type CartLine } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import { Sheet } from "@/components/ui/sheet";
import { BasketIcon, CheckIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "@/components/ui/icons";
import { useCartActions } from "./add-to-cart";

function CartLineRow({ line, index }: { line: CartLine; index: number }) {
  const { product, quantity } = line;
  const actions = useCartActions();
  const reduce = useReducedMotion();
  const unit = finalPriceCents(product);
  const closeCart = useUiStore((s) => s.closeCart);
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0, transition: { delay: reduce ? 0 : Math.min(index, 10) * 0.035, duration: 0.32, ease: [0.22, 1, 0.36, 1] } }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.22 } }}
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-white px-3 py-2.5 shadow-[0_1px_2px_rgb(23_35_28/0.05)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 top-1/2 size-28 -translate-y-1/2 rounded-full opacity-35 blur-2xl"
        style={{ backgroundColor: product.image.color }}
      />
      <Link href={productHref(product)} scroll={false} onClick={closeCart} className="relative grid size-16 shrink-0 place-items-center" aria-label={`Voir la fiche : ${product.name}`}>
        <Image
          src={product.image.src}
          alt=""
          width={product.image.width}
          height={product.image.height}
          sizes="64px"
          className={product.image.cutout ? "max-h-16 w-auto object-contain" : "max-h-16 w-auto rounded-md object-contain mix-blend-multiply"}
        />
      </Link>
      <div className="relative min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
        <p className="truncate text-xs text-ink-muted">{[product.brand, product.quantity].filter(Boolean).join(" · ")}</p>
        <p className="mt-0.5 text-xs text-ink-soft tabular-nums">
          {formatPrice(unit)} l’unité
          {product.promotion ? <span className="ml-1.5 rounded-full bg-tomato-100 px-1.5 py-px font-semibold text-tomato-700">{product.promotion.label}</span> : null}
        </p>
      </div>
      <div className="relative flex flex-col items-end gap-1.5">
        <span className="text-sm font-bold tabular-nums">{formatPrice(unit * quantity)}</span>
        <div className="flex items-center rounded-full bg-cream-100 p-0.5" role="group" aria-label={`Quantité de ${product.name}`}>
          <button
            type="button"
            onClick={() => actions.decrement(product)}
            className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-white hover:text-ink"
            aria-label={quantity === 1 ? `Retirer ${product.name} du panier` : `Retirer un ${product.name}`}
          >
            {quantity === 1 ? <TrashIcon size={15} /> : <MinusIcon size={15} />}
          </button>
          <span className="w-7 text-center text-sm font-bold tabular-nums">{quantity}</span>
          <button
            type="button"
            onClick={() => actions.increment(product)}
            disabled={quantity >= MAX_QUANTITY_PER_ITEM}
            className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-white hover:text-ink disabled:opacity-40"
            aria-label={`Ajouter un ${product.name}`}
          >
            <PlusIcon size={15} />
          </button>
        </div>
      </div>
    </motion.li>
  );
}

function ClearCartButton() {
  const [confirming, setConfirming] = useState(false);
  const clear = useCartStore((s) => s.clear);
  const announce = useUiStore((s) => s.announce);
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 6000);
    return () => window.clearTimeout(t);
  }, [confirming]);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted hover:bg-cream-100 hover:text-tomato-700">
        <TrashIcon size={16} /> Vider le panier
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2" role="alertdialog" aria-label="Confirmer la suppression de tout le panier">
      <span className="text-sm font-medium">Tout retirer ?</span>
      <button type="button" onClick={() => setConfirming(false)} className="min-h-10 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-cream-100" autoFocus>
        Annuler
      </button>
      <button
        type="button"
        onClick={() => {
          clear();
          setConfirming(false);
          announce("Le panier a été vidé.");
        }}
        className="min-h-10 rounded-full bg-tomato-600 px-3.5 text-sm font-semibold text-white hover:bg-tomato-700"
      >
        Vider
      </button>
    </div>
  );
}

export function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const close = useUiStore((s) => s.closeCart);
  const lines = useCartStore((s) => s.lines);
  const order = useCartStore((s) => s.order);
  const totals = useCartTotals();
  const ordered = [...order].reverse().map((id) => lines[id]).filter((l): l is CartLine => Boolean(l));
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD_CENTS - totals.totalCents);
  // Chaque ouverture rejoue l'arrivée en cascade des lignes.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }
  const progress = Math.min(1, totals.totalCents / FREE_DELIVERY_THRESHOLD_CENTS);

  return (
    <Sheet open={open} onClose={close} labelledBy="panier-titre" placement="responsive-right">
      <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
        <div>
          <h2 id="panier-titre" className="font-display text-2xl font-semibold">
            Votre panier
          </h2>
          <p className="text-sm text-ink-muted">
            {totals.itemCount} article{totals.itemCount > 1 ? "s" : ""} · prix fictifs de démonstration
          </p>
        </div>
        <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full hover:bg-cream-100" aria-label="Fermer le panier">
          <CloseIcon />
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-16 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-leaf-100 text-forest-700">
            <BasketIcon size={36} />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">Votre panier est vide</p>
            <p className="mt-1 text-ink-muted">Parcourez les rayons et touchez « + » sous un produit pour l’ajouter.</p>
          </div>
          <button type="button" onClick={close} className="inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white hover:bg-forest-800">
            Continuer mes courses
          </button>
        </div>
      ) : (
        <>
          <div className="px-5 pb-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgb(23_35_28/0.05)]">
              <p className="flex items-center gap-2 text-sm font-medium">
                {remaining > 0 ? (
                  <>
                    <TruckIcon size={18} className="text-forest-700" />
                    Plus que <strong className="tabular-nums">{formatPrice(remaining)}</strong> pour la livraison offerte
                  </>
                ) : (
                  <>
                    <CheckIcon size={18} className="text-forest-700" />
                    Livraison offerte débloquée
                  </>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-200" aria-hidden="true">
                <div className="h-full origin-left rounded-full bg-leaf-500 transition-transform duration-500 ease-[var(--ease-out-soft)]" style={{ transform: `scaleX(${progress})` }} />
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 pb-4" aria-label="Articles du panier">
            <AnimatePresence key={session} initial={true}>
              {ordered.map((line, i) => (
                <CartLineRow key={line.product.id} line={line} index={i} />
              ))}
            </AnimatePresence>
          </ul>
          <div className="border-t border-cream-200 bg-white px-5 pb-[calc(1rem+var(--safe-bottom))] pt-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Sous-total</dt>
                <dd className="tabular-nums">{formatPrice(totals.subtotalCents)}</dd>
              </div>
              {totals.discountCents > 0 ? (
                <div className="flex justify-between text-tomato-700">
                  <dt>Promotions (démo)</dt>
                  <dd className="tabular-nums">−{formatPrice(totals.discountCents)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-display text-lg font-semibold">Total</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatPrice(totals.totalCents)}</dd>
              </div>
            </dl>
            <Link
              href="/commande"
              onClick={close}
              className="mt-3 flex min-h-13 items-center justify-center rounded-full bg-forest-700 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgb(15_61_34/0.9)] transition hover:bg-forest-800 active:scale-[0.99]"
            >
              Valider mon panier
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <ClearCartButton />
              <span className="text-xs text-ink-muted">Simulation · aucun paiement</span>
            </div>
          </div>
        </>
      )}
    </Sheet>
  );
}
