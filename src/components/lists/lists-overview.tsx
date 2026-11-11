"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRightIcon, ListIcon, PlusIcon, ShareIcon } from "@/components/ui/icons";

interface ListRef {
  id: string;
  name: string;
  itemCount: number;
  shareToken: string | null;
  updatedAt: string;
}

export function ListsOverview() {
  const [lists, setLists] = useState<ListRef[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lists")
      .then((r) => (r.ok ? r.json() : { lists: [] }))
      .then((d: { lists: ListRef[] }) => setLists(d.lists))
      .catch(() => setLists([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = (await res.json().catch(() => ({}))) as { list?: ListRef; error?: string };
    if (!res.ok || !data.list) return setError(data.error ?? "La liste n'a pas pu être créée.");
    setLists((prev) => [data.list!, ...(prev ?? [])]);
    setName("");
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={create} className="flex gap-2 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-forest-900/6">
        <label htmlFor="nouvelle-liste" className="sr-only">
          Nom de la nouvelle liste
        </label>
        <input
          id="nouvelle-liste"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Ex. Courses de la semaine, Anniversaire…"
          className="h-12 min-w-0 flex-1 rounded-xl px-3 outline-none"
          aria-describedby={error ? "nouvelle-liste-erreur" : undefined}
        />
        <button type="submit" disabled={!name.trim()} className="inline-flex h-12 items-center gap-2 rounded-xl bg-forest-700 px-4 font-semibold text-white disabled:opacity-40">
          <PlusIcon size={18} /> Créer
        </button>
      </form>
      {error ? (
        <p id="nouvelle-liste-erreur" role="alert" className="text-sm text-tomato-700">
          {error}
        </p>
      ) : null}

      {lists === null ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-forest-900/15 p-8 text-center text-ink-soft">Aucune liste pour le moment. Créez votre première liste ci-dessus.</p>
      ) : (
        <ul className="space-y-2">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/listes/${l.id}`} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-forest-900/6 transition hover:ring-forest-700/30">
                <span className="grid size-12 place-items-center rounded-xl bg-leaf-100 text-forest-700">
                  <ListIcon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.name}</span>
                  <span className="flex items-center gap-2 text-sm text-ink-muted">
                    {l.itemCount} article{l.itemCount > 1 ? "s" : ""}
                    {l.shareToken ? (
                      <span className="inline-flex items-center gap-1 text-forest-700">
                        <ShareIcon size={14} /> partagée
                      </span>
                    ) : null}
                  </span>
                </span>
                <ChevronRightIcon className="text-ink-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
