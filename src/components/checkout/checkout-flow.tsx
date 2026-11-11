"use client";

/**
 * Parcours de commande SIMULÉ en 5 étapes + confirmation.
 * Les montants affichés à chaque étape proviennent d'un devis serveur.
 */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { computeFee, FREE_DELIVERY_THRESHOLD_CENTS, formatPrice, type Fulfillment } from "@/lib/pricing";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { CheckIcon, ChevronLeftIcon, InfoIcon, LockIcon, MinusIcon, PlusIcon, StoreIcon, TrashIcon, TruckIcon } from "@/components/ui/icons";

interface QuoteLine {
  product: ProductSummary;
  quantity: number;
  unitPriceCents: number;
  finalUnitPriceCents: number;
  lineTotalCents: number;
  discountCents: number;
}
interface Quote {
  lines: QuoteLine[];
  unavailable: number[];
  itemCount: number;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}
interface Slot {
  id: string;
  label: string;
}
interface Confirmation {
  reference: string;
  totalCents: number;
  feeCents: number;
  itemCount: number;
  slotLabel: string;
}

const STEPS = ["Récapitulatif", "Quantités", "Adresse", "Livraison", "Résumé"] as const;

export function CheckoutFlow() {
  const lines = useCartStore((s) => s.lines);
  const hydrated = useCartStore((s) => s.hydrated);
  const clear = useCartStore((s) => s.clear);
  const announce = useUiStore((s) => s.announce);
  const [step, setStep] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [address, setAddress] = useState({ name: "", street: "", postalCode: "", city: "" });
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [slotId, setSlotId] = useState<string>("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<Confirmation | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const items = useMemo(() => Object.values(lines).map((l) => ({ productId: l.product.id, quantity: l.quantity })), [lines]);

  const refreshQuote = useCallback(async () => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    setQuoteError(null);
    try {
      const res = await fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { quote: Quote; slots: Slot[] };
      setQuote(data.quote);
      setSlots(data.slots);
      setSlotId((current) => current || data.slots[0]?.id || "");
    } catch {
      setQuoteError("Impossible de vérifier les prix pour le moment. Vérifiez votre connexion.");
    }
  }, [items]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => void refreshQuote(), 250);
    return () => window.clearTimeout(t);
  }, [hydrated, refreshQuote]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, done]);

  const postalError = address.postalCode && !/^\d{5}$/.test(address.postalCode) ? "Le code postal doit comporter 5 chiffres." : null;
  const fee = quote ? computeFee(quote.totalCents, fulfillment) : 0;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const hasAddress = Object.values(address).some((v) => v.trim());
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, fulfillment, slotId, address: hasAddress ? address : null, acknowledged }),
      });
      const data = (await res.json().catch(() => ({}))) as Confirmation & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "La simulation a échoué.");
      setDone(data);
      clear();
      announce(`Commande de démonstration ${data.reference} simulée. Aucun paiement n'a été effectué.`);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="mx-auto max-w-xl py-6 text-center" aria-labelledby="confirmation-titre">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-leaf-100 text-forest-700 animate-[pop_400ms_var(--ease-spring)]">
          <CheckIcon size={40} />
        </span>
        <h1 id="confirmation-titre" ref={headingRef} tabIndex={-1} className="mt-5 font-display text-3xl font-semibold outline-none">
          Commande simulée !
        </h1>
        <p className="mt-2 text-ink-soft">
          Référence de démonstration <strong className="font-mono">{done.reference}</strong>
        </p>
        <div className="mt-6 rounded-2xl bg-white p-5 text-left shadow-soft">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Articles</dt>
              <dd>{done.itemCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Créneau (fictif)</dt>
              <dd className="text-right">{done.slotLabel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Frais</dt>
              <dd>{done.feeCents ? formatPrice(done.feeCents) : "Offerts"}</dd>
            </div>
            <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold">
              <dt>Total simulé</dt>
              <dd className="tabular-nums">{formatPrice(done.totalCents)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-cream-100 p-4 text-left text-sm text-ink-soft">
          <InfoIcon size={18} className="mt-px shrink-0" />
          Ceci était une démonstration : aucune commande n’a été transmise, aucun paiement n’a été demandé ni encaissé, et aucun produit ne sera livré.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
            Retour aux rayons
          </Link>
          <Link href="/mon-espace" className="inline-flex min-h-12 items-center rounded-full bg-white px-6 font-semibold text-forest-700 ring-1 ring-forest-900/12">
            Mes commandes simulées
          </Link>
        </div>
      </section>
    );
  }

  if (hydrated && items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-semibold outline-none">
          Votre panier est vide
        </h1>
        <p className="mt-2 text-ink-soft">Ajoutez quelques produits avant de passer commande.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest-700 px-6 font-semibold text-white">
          Parcourir les rayons
        </Link>
      </div>
    );
  }

  const canContinue = step === 2 ? !postalError : step === 3 ? Boolean(slotId) : step === 4 ? acknowledged : Boolean(quote && quote.lines.length > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <ol className="flex gap-1.5" aria-label="Étapes de la commande">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1" aria-current={i === step ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full transition-colors", i <= step ? "bg-forest-700" : "bg-cream-200")} />
              <span className={cn("mt-1.5 hidden text-xs font-medium sm:block", i === step ? "text-forest-800" : "text-ink-muted")}>
                {i + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <h1 ref={headingRef} tabIndex={-1} className="mt-6 font-display text-3xl font-semibold outline-none">
          <span className="sr-only">Étape {step + 1} sur {STEPS.length} : </span>
          {["Récapitulatif du panier", "Vérifiez les quantités", "Adresse (facultative)", "Livraison ou retrait", "Résumé de la commande"][step]}
        </h1>

        {quoteError ? (
          <p role="alert" className="mt-4 rounded-xl bg-tomato-50 p-3 text-sm text-tomato-700">
            {quoteError}
          </p>
        ) : null}
        {quote && quote.unavailable.length > 0 ? (
          <p role="alert" className="mt-4 rounded-xl bg-tomato-50 p-3 text-sm text-tomato-700">
            {quote.unavailable.length} produit(s) ne sont plus disponibles et seront retirés.
          </p>
        ) : null}

        <div className="mt-5">
          {step === 0 || step === 1 ? (
            <ul className="space-y-2">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.product.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(23_35_28/0.06)]">
                  <Image src={l.product.image.src} alt="" width={l.product.image.width} height={l.product.image.height} sizes="56px" className="max-h-14 w-14 object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{l.product.name}</p>
                    <p className="text-xs text-ink-muted">
                      {[l.product.brand, l.product.quantity].filter(Boolean).join(" · ")} · {formatPrice(l.finalUnitPriceCents)} l’unité
                    </p>
                  </div>
                  {step === 1 ? (
                    <div className="flex items-center rounded-full bg-cream-100 p-0.5">
                      <button
                        type="button"
                        onClick={() => useCartStore.getState().decrement(l.product.id)}
                        className="grid size-9 place-items-center rounded-full hover:bg-white"
                        aria-label={l.quantity === 1 ? `Retirer ${l.product.name}` : `Diminuer la quantité de ${l.product.name}`}
                      >
                        {l.quantity === 1 ? <TrashIcon size={16} /> : <MinusIcon size={16} />}
                      </button>
                      <span className="w-7 text-center font-bold tabular-nums">{lines[l.product.id]?.quantity ?? l.quantity}</span>
                      <button type="button" onClick={() => useCartStore.getState().increment(l.product.id)} className="grid size-9 place-items-center rounded-full hover:bg-white" aria-label={`Augmenter la quantité de ${l.product.name}`}>
                        <PlusIcon size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-ink-soft">× {l.quantity}</span>
                  )}
                  <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(l.lineTotalCents)}</span>
                </li>
              ))}
              {!quote && !quoteError ? Array.from({ length: 3 }, (_, i) => <li key={i} className="skeleton h-20 rounded-2xl" />) : null}
            </ul>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
              <p className="flex items-start gap-2 text-sm text-ink-soft">
                <InfoIcon size={18} className="mt-px shrink-0 text-forest-700" />
                Environnement de test : n’indiquez pas votre véritable adresse. Ces champs sont facultatifs et peuvent rester vides.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["name", "Nom (fictif)", "Camille Martin", "name"],
                    ["street", "Adresse (fictive)", "12 rue des Marchés", "street-address"],
                    ["postalCode", "Code postal", "75000", "postal-code"],
                    ["city", "Ville", "Paris", "address-level2"],
                  ] as const
                ).map(([key, label, placeholder, autoComplete]) => (
                  <label key={key} className={cn("text-sm", key === "street" && "sm:col-span-2")}>
                    <span className="mb-1 block font-medium">{label}</span>
                    <input
                      value={address[key]}
                      onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      placeholder={placeholder}
                      autoComplete={autoComplete}
                      inputMode={key === "postalCode" ? "numeric" : undefined}
                      maxLength={key === "postalCode" ? 5 : 120}
                      aria-invalid={key === "postalCode" && Boolean(postalError)}
                      aria-describedby={key === "postalCode" && postalError ? "cp-erreur" : undefined}
                      className="h-12 w-full rounded-xl border border-forest-900/15 px-3.5 outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10 aria-[invalid=true]:border-tomato-600"
                    />
                  </label>
                ))}
              </div>
              {postalError ? (
                <p id="cp-erreur" role="alert" className="text-sm text-tomato-700">
                  {postalError}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">Mode de remise</legend>
                {(
                  [
                    ["delivery", "Livraison à domicile", `Offerte dès ${formatPrice(FREE_DELIVERY_THRESHOLD_CENTS)}, sinon ${formatPrice(490)} (fictif)`, TruckIcon],
                    ["pickup", "Retrait au magasin", "Gratuit (point de retrait fictif)", StoreIcon],
                  ] as const
                ).map(([value, label, hint, Icon]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-soft ring-2 transition",
                      fulfillment === value ? "ring-forest-700" : "ring-transparent hover:ring-forest-700/30",
                    )}
                  >
                    <input type="radio" name="remise" value={value} checked={fulfillment === value} onChange={() => setFulfillment(value)} className="mt-1 size-4 accent-forest-700" />
                    <Icon size={22} className="text-forest-700" />
                    <span>
                      <span className="block font-semibold">{label}</span>
                      <span className="block text-sm text-ink-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-semibold">Créneau (fictif)</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {slots.map((s) => (
                    <label key={s.id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-4 ring-2 transition", slotId === s.id ? "ring-forest-700" : "ring-forest-900/8")}>
                      <input type="radio" name="creneau" value={s.id} checked={slotId === s.id} onChange={() => setSlotId(s.id)} className="size-4 accent-forest-700" />
                      <span className="text-sm">{s.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 4 && quote ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-soft">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-ink-muted">Articles</dt>
                  <dd>
                    {quote.itemCount} ({quote.lines.length} référence{quote.lines.length > 1 ? "s" : ""})
                  </dd>
                  <dt className="text-ink-muted">Remise</dt>
                  <dd>{fulfillment === "delivery" ? "Livraison à domicile" : "Retrait au magasin"}</dd>
                  <dt className="text-ink-muted">Créneau</dt>
                  <dd>{slots.find((s) => s.id === slotId)?.label}</dd>
                  <dt className="text-ink-muted">Adresse</dt>
                  <dd>{Object.values(address).some((v) => v.trim()) ? [address.name, address.street, `${address.postalCode} ${address.city}`.trim()].filter(Boolean).join(", ") : "Non renseignée"}</dd>
                </dl>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream-100 p-4">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 size-5 accent-forest-700" />
                <span className="text-sm">
                  Je comprends qu’il s’agit d’une <strong>simulation</strong> : aucune commande ne sera passée, aucun paiement ne sera demandé et les prix sont fictifs.
                </span>
              </label>
              {submitError ? (
                <p role="alert" className="rounded-xl bg-tomato-50 p-3 text-sm text-tomato-700">
                  {submitError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex min-h-12 items-center gap-1 rounded-full px-4 font-semibold text-forest-700 hover:bg-white">
              <ChevronLeftIcon size={18} /> Retour
            </button>
          ) : (
            <Link href="/" className="inline-flex min-h-12 items-center gap-1 rounded-full px-4 font-semibold text-forest-700 hover:bg-white">
              <ChevronLeftIcon size={18} /> Continuer mes courses
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex min-h-12 items-center rounded-full bg-forest-700 px-7 font-semibold text-white shadow-soft hover:bg-forest-800 disabled:opacity-40"
            >
              {step === 2 && !Object.values(address).some((v) => v.trim()) ? "Passer cette étape" : "Continuer"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue || submitting}
              onClick={() => void submit()}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest-700 px-7 font-semibold text-white shadow-soft hover:bg-forest-800 disabled:opacity-40"
            >
              <LockIcon size={18} /> {submitting ? "Simulation…" : "Simuler la commande"}
            </button>
          )}
        </div>
      </div>

      <aside className="h-fit rounded-3xl bg-white p-5 shadow-soft lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]" aria-label="Montant de la commande">
        <h2 className="font-display text-xl font-semibold">Montant</h2>
        <p className="text-xs text-ink-muted">Calculé par le serveur · prix fictifs</p>
        {quote ? (
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Sous-total</dt>
              <dd className="tabular-nums">{formatPrice(quote.subtotalCents)}</dd>
            </div>
            {quote.discountCents > 0 ? (
              <div className="flex justify-between text-tomato-700">
                <dt>Promotions</dt>
                <dd className="tabular-nums">−{formatPrice(quote.discountCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-ink-soft">{fulfillment === "delivery" ? "Livraison" : "Retrait"}</dt>
              <dd className="tabular-nums">{fee ? formatPrice(fee) : "Offert"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-cream-200 pt-2">
              <dt className="font-display text-lg font-semibold">Total</dt>
              <dd className="text-2xl font-bold tabular-nums">{formatPrice(quote.totalCents + fee)}</dd>
            </div>
          </dl>
        ) : (
          <div className="skeleton mt-4 h-28 rounded-xl" />
        )}
        <p className="mt-4 flex items-start gap-2 text-xs text-ink-muted">
          <InfoIcon size={15} className="mt-px shrink-0" /> Démonstration : aucun moyen de paiement n’est demandé.
        </p>
      </aside>
    </div>
  );
}
