"use client";

/**
 * Le panier « physique » : posé en bas de l'écran (ordinateur), il se remplit
 * des emballages ajoutés. Sur mobile, il devient une barre flottante.
 */
import Image from "next/image";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/cn";
import { useCartTotals, useLatestCartProducts } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import { BasketIcon, ChevronRightIcon } from "@/components/ui/icons";

function useBasket() {
  const totals = useCartTotals();
  const latest = useLatestCartProducts(7);
  return { totals, latest };
}

/** Positions des emballages dans le panier (éventail naturel). */
const SPOTS = [
  { x: -62, r: -14, s: 0.92 },
  { x: 58, r: 12, s: 0.9 },
  { x: -24, r: -5, s: 1 },
  { x: 26, r: 6, s: 0.98 },
  { x: -84, r: -20, s: 0.82 },
  { x: 82, r: 18, s: 0.82 },
  { x: 0, r: 0, s: 1.04 },
];

export function DesktopBasket() {
  const { totals, latest } = useBasket();
  const bump = useUiStore((s) => s.basketBump);
  const openCart = useUiStore((s) => s.openCart);
  const count = totals.itemCount;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden justify-center md:flex">
      <button
        type="button"
        onClick={openCart}
        aria-label={`Ouvrir le panier : ${count} article${count > 1 ? "s" : ""}, total ${formatPrice(totals.totalCents)}`}
        className="group pointer-events-auto relative h-[5.6rem] w-[15.5rem] translate-y-3 transition-transform duration-300 ease-[var(--ease-out-soft)] hover:translate-y-0 focus-visible:translate-y-0"
      >
        {/* Emballages dans le panier */}
        <span className="absolute inset-x-0 bottom-9 flex h-16 items-end justify-center" data-cart-target="primary">
          {latest.map((p, i) => {
            const spot = SPOTS[(latest.length - 1 - i) % SPOTS.length]!;
            return (
              <span
                key={p.id}
                className="absolute bottom-0 flex h-14 w-12 items-end justify-center animate-[rise_380ms_var(--ease-out-soft)_both]"
                style={{ transform: `translateX(${spot.x}px) rotate(${spot.r}deg) scale(${spot.s})`, zIndex: i }}
              >
                <Image src={p.image.src} alt="" width={p.image.width} height={p.image.height} sizes="48px" className="max-h-14 w-auto object-contain drop-shadow-[0_3px_3px_rgb(0_0_0/0.18)]" />
              </span>
            );
          })}
        </span>
        {/* Corps du panier */}
        <span key={bump} className="absolute inset-x-0 bottom-0 block h-14 origin-bottom animate-[pop_320ms_var(--ease-spring)]">
          <svg viewBox="0 0 248 56" className="h-full w-full drop-shadow-[0_-4px_14px_rgb(15_61_34/0.25)]" aria-hidden="true">
            <defs>
              <linearGradient id="basket-body" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#1b7a40" />
                <stop offset="1" stopColor="#14532d" />
              </linearGradient>
            </defs>
            <path d="M14 8h220l-12 48H26L14 8Z" fill="url(#basket-body)" />
            <path d="M22 22h204M26 36h196" stroke="#22c55e" strokeOpacity=".35" strokeWidth="2" />
            {Array.from({ length: 11 }, (_, i) => (
              <path key={i} d={`M${34 + i * 18} 12v40`} stroke="#0f3d22" strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
            ))}
            <rect x="6" y="2" width="236" height="12" rx="6" fill="#0f3d22" />
            <rect x="12" y="4" width="224" height="3" rx="1.5" fill="#22c55e" fillOpacity=".5" />
          </svg>
          <span className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-2 text-sm font-semibold text-white">
            {count > 0 ? (
              <>
                <span className="tabular-nums">{count} article{count > 1 ? "s" : ""}</span>
                <span className="h-3 w-px bg-white/30" />
                <span className="tabular-nums">{formatPrice(totals.totalCents)}</span>
              </>
            ) : (
              <span className="text-white/85">Votre panier</span>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}

export function MobileCartBar() {
  const { totals, latest } = useBasket();
  const bump = useUiStore((s) => s.basketBump);
  const openCart = useUiStore((s) => s.openCart);
  const count = totals.itemCount;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(0.75rem+var(--safe-bottom))] md:hidden">
      <button
        type="button"
        onClick={openCart}
        aria-label={`Ouvrir le panier : ${count} article${count > 1 ? "s" : ""}, total ${formatPrice(totals.totalCents)}`}
        className={cn(
          "flex h-16 w-full items-center gap-3 rounded-2xl px-3 text-left shadow-float transition-colors duration-300",
          count > 0 ? "bg-forest-900 text-white" : "bg-white text-ink ring-1 ring-forest-900/10",
        )}
      >
        <span key={bump} data-cart-target="primary" className={cn("relative grid size-11 shrink-0 place-items-center rounded-xl animate-[pop_320ms_var(--ease-spring)]", count > 0 ? "bg-forest-700" : "bg-leaf-100 text-forest-700")}>
          <BasketIcon size={22} />
          {count > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 grid h-5.5 min-w-5.5 place-items-center rounded-full bg-leaf-400 px-1 text-xs font-bold text-forest-950 tabular-nums">{count}</span>
          ) : null}
        </span>
        <span className="flex -space-x-3" aria-hidden="true">
          {latest.slice(-3).map((p) => (
            <span key={p.id} className="grid size-9 place-items-center rounded-full bg-white ring-2 ring-forest-900">
              <Image src={p.image.src} alt="" width={p.image.width} height={p.image.height} sizes="36px" className="max-h-7 w-auto object-contain" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1">
          {count > 0 ? (
            <>
              <span className="block text-xs text-leaf-200">
                {count} article{count > 1 ? "s" : ""}
              </span>
              <span className="block text-lg font-bold leading-tight tabular-nums">{formatPrice(totals.totalCents)}</span>
            </>
          ) : (
            <span className="block text-sm font-medium text-ink-soft">Votre panier est vide</span>
          )}
        </span>
        {count > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-leaf-400 px-3 py-2 text-sm font-semibold text-forest-950">
            Panier <ChevronRightIcon size={16} />
          </span>
        ) : null}
      </button>
    </div>
  );
}
