"use client";

/**
 * Édition d'une liste : articles libres ou produits, cases à cocher en magasin,
 * partage par lien, conversion en panier.
 */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/pricing";
import { finalPriceCents, productHref } from "@/lib/product";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { BasketIcon, CheckIcon, ChevronLeftIcon, MinusIcon, PlusIcon, SearchIcon, ShareIcon, TrashIcon } from "@/components/ui/icons";

interface Item {
  id: number;
  label: string | null;
  quantity: number;
  checked: boolean;
  product: ProductSummary | null;
}

interface List {
  id: string;
  name: string;
  shareToken: string | null;
  items: Item[];
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Une erreur est survenue.");
  }
  return res.json().catch(() => ({}));
}

export function ListEditor({ listId }: { listId: string }) {
  const router = useRouter();
  const [list, setList] = useState<List | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const announce = useUiStore((s) => s.announce);
  const openCart = useUiStore((s) => s.openCart);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/lists/${listId}`);
    if (!res.ok) return setNotFound(true);
    const data = (await res.json()) as { list: List };
    setList(data.list);
  }, [listId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lists/${listId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setNotFound(true);
        const data = (await res.json()) as { list: List };
        if (!cancelled) setList(data.list);
      })
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (notFound) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-2xl font-semibold">Liste introuvable</p>
        <Link href="/listes" className="mt-4 inline-block font-semibold text-forest-700 underline">
          Retour à mes listes
        </Link>
      </div>
    );
  }
  if (!list) return <div className="skeleton mt-6 h-72 rounded-3xl" />;

  const shareUrl = list.shareToken ? `${window.location.origin}/liste/${list.shareToken}` : null;
  const productItems = list.items.filter((i) => i.product);
  const estimate = productItems.reduce((s, i) => s + finalPriceCents(i.product!) * i.quantity, 0);

  function toCart() {
    const store = useCartStore.getState();
    let count = 0;
    for (const item of productItems) {
      store.add(item.product!, item.quantity);
      count += item.quantity;
    }
    announce(`${count} article${count > 1 ? "s" : ""} de la liste « ${list!.name} » ajoutés au panier.`);
    openCart();
  }

  return (
    <div className="mt-2">
      <Link href="/listes" className="inline-flex min-h-11 items-center gap-1 pr-3 text-sm font-semibold text-forest-700 hover:underline">
        <ChevronLeftIcon size={18} /> Mes listes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{list.name}</h1>
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              if (!window.confirm(`Supprimer définitivement la liste « ${list.name} » ?`)) return;
              await call(`/api/lists/${list.id}`, "DELETE");
              router.push("/listes");
            })
          }
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-muted hover:bg-tomato-50 hover:text-tomato-700"
        >
          <TrashIcon size={16} /> Supprimer la liste
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={toCart}
          disabled={productItems.length === 0}
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-forest-700 px-5 font-semibold text-white shadow-soft hover:bg-forest-800 disabled:opacity-40"
        >
          <BasketIcon size={20} /> Tout mettre au panier {productItems.length > 0 ? `(${formatPrice(estimate)})` : ""}
        </button>
        <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-forest-900/6">
          {shareUrl ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-forest-700">
                <ShareIcon size={16} /> Lien de partage actif (lecture seule)
              </p>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} aria-label="Lien de partage" className="h-10 min-w-0 flex-1 rounded-lg bg-cream-100 px-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
                <button
                  type="button"
                  onClick={async () => {
                    if (navigator.share) {
                      await navigator.share({ title: list.name, url: shareUrl }).catch(() => {});
                    } else {
                      await navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }
                  }}
                  className="h-10 shrink-0 rounded-lg bg-forest-700 px-3 text-sm font-semibold text-white"
                >
                  {copied ? "Copié !" : "Partager"}
                </button>
              </div>
              <button type="button" onClick={() => void run(() => call(`/api/lists/${list.id}/share`, "POST", { enabled: false }))} className="text-xs font-medium text-ink-muted underline">
                Désactiver le lien
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void run(() => call(`/api/lists/${list.id}/share`, "POST", { enabled: true }))} className="flex min-h-11 w-full items-center justify-center gap-2 font-semibold text-forest-700">
              <ShareIcon size={18} /> Créer un lien de partage
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted">Le lien partagé n’affiche que le nom de la liste et ses articles, jamais d’information sur vous.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          void run(async () => {
            await call(`/api/lists/${list.id}/items`, "POST", { label, quantity: 1 });
            setLabel("");
          });
        }}
        className="mt-6 flex gap-2"
      >
        <label htmlFor="article-libre" className="sr-only">
          Ajouter un article
        </label>
        <input
          id="article-libre"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
          placeholder="Ajouter un article (ex. pain, tomates)…"
          className="h-12 min-w-0 flex-1 rounded-xl border border-forest-900/15 bg-white px-3.5 outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
        />
        <button type="submit" disabled={!label.trim()} className="grid size-12 shrink-0 place-items-center rounded-xl bg-forest-700 text-white disabled:opacity-40" aria-label="Ajouter l'article">
          <PlusIcon />
        </button>
      </form>
      <p className="mt-1.5 text-xs text-ink-muted">Astuce : depuis une fiche produit, « Ajouter à une liste » y place le produit exact avec son prix.</p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-tomato-700">
          {error}
        </p>
      ) : null}

      {list.items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-forest-900/15 p-8 text-center text-ink-soft">Cette liste est vide.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {list.items.map((item) => (
            <li key={item.id} className={cn("flex items-center gap-3 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgb(23_35_28/0.06)]", item.checked && "opacity-60")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={item.checked}
                aria-label={`${item.checked ? "Décocher" : "Cocher"} ${item.product?.name ?? item.label}`}
                onClick={() => void run(() => call(`/api/lists/${list.id}/items/${item.id}`, "PATCH", { checked: !item.checked }))}
                className={cn("grid size-7 shrink-0 place-items-center rounded-lg border-2", item.checked ? "border-forest-700 bg-forest-700 text-white" : "border-forest-900/25")}
              >
                {item.checked ? <CheckIcon size={16} /> : null}
              </button>
              {item.product ? (
                <>
                  <Link href={productHref(item.product)} scroll={false} className="grid size-12 shrink-0 place-items-center">
                    <Image src={item.product.image.src} alt="" width={item.product.image.width} height={item.product.image.height} sizes="48px" className="max-h-12 w-auto object-contain" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-medium", item.checked && "line-through")}>{item.product.name}</p>
                    <p className="text-xs text-ink-muted">
                      {[item.product.brand, item.product.quantity].filter(Boolean).join(" · ")} · {formatPrice(finalPriceCents(item.product))}
                    </p>
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", item.checked && "line-through")}>{item.label}</p>
                  <Link href={`/recherche?q=${encodeURIComponent(item.label ?? "")}`} className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
                    <SearchIcon size={13} /> Trouver en rayon
                  </Link>
                </div>
              )}
              <div className="flex items-center rounded-full bg-cream-100 p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    void run(() =>
                      item.quantity <= 1 ? call(`/api/lists/${list.id}/items/${item.id}`, "DELETE") : call(`/api/lists/${list.id}/items/${item.id}`, "PATCH", { quantity: item.quantity - 1 }),
                    )
                  }
                  className="grid size-8 place-items-center rounded-full hover:bg-white"
                  aria-label={item.quantity <= 1 ? "Retirer de la liste" : "Diminuer la quantité"}
                >
                  {item.quantity <= 1 ? <TrashIcon size={15} /> : <MinusIcon size={15} />}
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => void run(() => call(`/api/lists/${list.id}/items/${item.id}`, "PATCH", { quantity: Math.min(99, item.quantity + 1) }))}
                  className="grid size-8 place-items-center rounded-full hover:bg-white"
                  aria-label="Augmenter la quantité"
                >
                  <PlusIcon size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
