"use client";

/** Ajoute un produit à une liste de courses (existante ou nouvelle). */
import { useEffect, useId, useRef, useState } from "react";
import { useUiStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { CheckIcon, ListIcon, PlusIcon } from "@/components/ui/icons";

interface ListRef {
  id: string;
  name: string;
  itemCount: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

export function AddToListButton({ product }: { product: ProductSummary }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListRef[] | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const announce = useUiStore((s) => s.announce);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api<{ lists: ListRef[] }>("/api/lists")
      .then((d) => setLists(d.lists))
      .catch(() => setLists([]));
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function addTo(list: ListRef) {
    setBusy(true);
    try {
      await api(`/api/lists/${list.id}/items`, { method: "POST", body: JSON.stringify({ productId: product.id, quantity: 1 }) });
      const text = `${product.name} ajouté à « ${list.name} ».`;
      setStatus({ kind: "ok", text });
      announce(text);
      setLists((prev) => prev?.map((l) => (l.id === list.id ? { ...l, itemCount: l.itemCount + 1 } : l)) ?? null);
    } catch (e) {
      setStatus({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { list } = await api<{ list: ListRef }>("/api/lists", { method: "POST", body: JSON.stringify({ name }) });
      setLists((prev) => [list, ...(prev ?? [])]);
      setName("");
      await addTo(list);
    } catch (err) {
      setStatus({ kind: "error", text: (err as Error).message });
      setBusy(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setStatus(null);
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cream-100 px-5 font-semibold text-forest-800 transition hover:bg-cream-200"
      >
        <ListIcon size={18} /> Ajouter à une liste
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute bottom-[calc(100%+0.5rem)] right-0 z-20 w-[min(20rem,calc(100vw-3rem))] rounded-2xl bg-white p-3 shadow-float ring-1 ring-forest-900/10 animate-[fade-in_160ms_ease-out]"
      >
        <p className="px-1 pb-2 text-sm font-semibold">Mes listes de courses</p>
        {lists === null ? (
          <p className="px-1 py-2 text-sm text-ink-muted">Chargement…</p>
        ) : lists.length === 0 ? (
          <p className="px-1 pb-2 text-sm text-ink-muted">Aucune liste pour l’instant : créez-en une ci-dessous.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {lists.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addTo(l)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm hover:bg-leaf-50 disabled:opacity-60"
                >
                  <span className="truncate font-medium">{l.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{l.itemCount} art.</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={createAndAdd} className="mt-2 flex gap-2 border-t border-cream-200 pt-3">
          <label htmlFor={`${panelId}-nom`} className="sr-only">
            Nom de la nouvelle liste
          </label>
          <input
            id={`${panelId}-nom`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nouvelle liste…"
            className="h-11 min-w-0 flex-1 rounded-full border border-forest-900/15 px-3.5 text-sm outline-none focus:border-forest-700 focus:ring-4 focus:ring-forest-700/10"
          />
          <button type="submit" disabled={busy || !name.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-forest-700 text-white disabled:opacity-40" aria-label="Créer la liste et y ajouter le produit">
            <PlusIcon size={18} />
          </button>
        </form>
        {status ? (
          <p role="status" className={status.kind === "ok" ? "mt-2 flex items-center gap-1.5 px-1 text-sm text-forest-700" : "mt-2 px-1 text-sm text-tomato-700"}>
            {status.kind === "ok" ? <CheckIcon size={16} /> : null}
            {status.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
