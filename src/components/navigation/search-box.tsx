"use client";

/**
 * Barre de recherche : les rayons se filtrent « sur place » pendant la frappe
 * (page /recherche mise à jour sans rechargement), avec des raccourcis vers
 * les rayons et marques correspondants. Tolérante aux accents et aux fautes.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { normalizeSearchText } from "@/lib/search-text";
import type { CategorySummary } from "@/types/catalog";
import { CategoryIcon } from "./category-icon";
import { CloseIcon, SearchIcon, TagIcon } from "@/components/ui/icons";

interface Suggestion {
  id: string;
  kind: "rayon" | "marque";
  label: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
}

interface SuggestResponse {
  brands: Array<{ slug: string; name: string; count: number }>;
}

export function SearchBox({ categories, className }: { categories: CategorySummary[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlQuery = pathname === "/recherche" ? (params.get("q") ?? "") : "";
  const [value, setValue] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [brands, setBrands] = useState<SuggestResponse["brands"]>([]);
  const [pending, startTransition] = useTransition();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const lastPushed = useRef(urlQuery);

  // L'URL fait foi (navigation arrière, lien partagé…).
  useEffect(() => {
    if (urlQuery !== lastPushed.current) {
      setValue(urlQuery);
      lastPushed.current = urlQuery;
    }
  }, [urlQuery]);

  const normalized = normalizeSearchText(value);

  const categoryMatches = useMemo(() => {
    if (normalized.length < 2) return [];
    return categories
      .filter((c) => normalizeSearchText(`${c.name} ${c.shortName}`).includes(normalized))
      .slice(0, 3);
  }, [categories, normalized]);

  useEffect(() => {
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<SuggestResponse>) : { brands: [] }))
        .then((data) => setBrands(data.brands.slice(0, 4)))
        .catch(() => {});
    }, 120);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [normalized, value]);

  const suggestions: Suggestion[] = [
    ...categoryMatches.map((c) => ({
      id: `rayon-${c.slug}`,
      kind: "rayon" as const,
      label: c.name,
      hint: `${c.productCount} produits`,
      href: `/rayon/${c.slug}`,
      icon: <CategoryIcon slug={c.slug} size={18} />,
    })),
    ...(normalized.length < 2 ? [] : brands).map((b) => ({
      id: `marque-${b.slug}`,
      kind: "marque" as const,
      label: b.name,
      hint: `${b.count} produit${b.count > 1 ? "s" : ""}`,
      href: `/recherche?marque=${encodeURIComponent(b.slug)}`,
      icon: <TagIcon size={18} />,
    })),
  ];

  function navigate(q: string) {
    window.clearTimeout(debounceRef.current);
    const next = new URLSearchParams(pathname === "/recherche" ? params.toString() : "");
    next.delete("offset");
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    const qs = next.toString();
    lastPushed.current = q.trim();
    startTransition(() => {
      if (!qs) {
        if (pathname === "/recherche") router.replace("/", { scroll: false });
        return;
      }
      const href = `/recherche?${qs}`;
      if (pathname === "/recherche") router.replace(href, { scroll: false });
      else router.push(href);
    });
  }

  function onChange(next: string) {
    setValue(next);
    setOpen(true);
    setActive(-1);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => navigate(next), 260);
  }

  function choose(s: Suggestion) {
    setOpen(false);
    window.clearTimeout(debounceRef.current);
    router.push(s.href);
  }

  const showList = open && suggestions.length > 0;

  return (
    <div className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (showList && active >= 0 && suggestions[active]) return choose(suggestions[active]!);
          setOpen(false);
          navigate(value);
          inputRef.current?.blur();
        }}
      >
        <label htmlFor="recherche-produits" className="sr-only">
          Rechercher un produit, une marque, un rayon ou un code-barres
        </label>
        <div className="group relative flex items-center">
          <SearchIcon size={19} className={cn("pointer-events-none absolute left-3.5 text-ink-muted transition-colors group-focus-within:text-forest-700", pending && "animate-pulse")} />
          <input
            ref={inputRef}
            id="recherche-produits"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Rechercher : Nutella, pâtes, Evian, 3017620422003…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length) {
                e.preventDefault();
                setOpen(true);
                setActive((i) => (i + 1) % suggestions.length);
              } else if (e.key === "ArrowUp" && suggestions.length) {
                e.preventDefault();
                setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
              } else if (e.key === "Escape") {
                if (showList) setOpen(false);
                else if (value) onChange("");
              }
            }}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? suggestions[active]?.id : undefined}
            className="h-11 w-full rounded-full border border-forest-900/12 bg-white pl-11 pr-11 text-[0.95rem] text-ink shadow-[inset_0_1px_2px_rgb(23_35_28/0.04)] outline-none transition placeholder:text-ink-muted/80 focus:border-forest-700 focus:ring-4 focus:ring-forest-700/12 [&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 grid size-8 place-items-center rounded-full text-ink-muted hover:bg-cream-100 hover:text-ink"
            >
              <CloseIcon size={16} />
            </button>
          ) : null}
        </div>
      </form>

      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl bg-white p-1.5 shadow-float ring-1 ring-forest-900/10 animate-[fade-in_160ms_ease-out]"
      >
        {suggestions.map((s, i) => (
          <li
            key={s.id}
            id={s.id}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(s);
            }}
            onMouseEnter={() => setActive(i)}
            className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", i === active ? "bg-leaf-50" : "")}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-cream-100 text-forest-700">{s.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{s.label}</span>
              <span className="block text-xs text-ink-muted">
                {s.kind === "rayon" ? "Aller au rayon" : "Marque"} · {s.hint}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
