"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, Home, Loader2, MapPin, Search, Store, X } from "lucide-react";
import { localPlaces, remotePlaces, type PlaceSuggestion } from "@/lib/geocoding";
import { sellerMatchesQuery } from "@/lib/filters";
import type { Seller } from "@/types";
import { cn } from "@/lib/utils";

type Option =
  | { type: "place"; key: string; place: PlaceSuggestion }
  | { type: "seller"; key: string; seller: Seller };

const KIND_ICON = {
  address: Home,
  street: MapPin,
  city: Building2,
  zip: MapPin,
  place: MapPin,
} as const;

/**
 * Vyhledávací lišta nad mapou (tvar „pilulky“): adresa, PSČ nebo město → našeptávač
 * s nejlepšími shodami; vybrané místo se najde na mapě a přiblíží. Umí najít i prodejce podle názvu.
 */
export function AddressSearch({
  sellers,
  currentLabel,
  onPickPlace,
  onPickSeller,
  className,
}: {
  sellers: Seller[];
  currentLabel?: string;
  onPickPlace: (place: PlaceSuggestion) => void;
  onPickSeller: (sellerId: string) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<{ q: string; items: PlaceSuggestion[] }>({ q: "", items: [] });
  const [active, setActive] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const loading = trimmed.length >= 3 && remote.q !== trimmed;

  // vzdálený geokodér s debounce
  useEffect(() => {
    if (trimmed.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const items = await remotePlaces(trimmed, ctrl.signal);
      if (!ctrl.signal.aborted) setRemote({ q: trimmed, items });
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed]);

  const options = useMemo<Option[]>(() => {
    if (!trimmed) return [];
    const sellerHits = sellers
      .filter((s) => sellerMatchesQuery(s, trimmed))
      .slice(0, 3)
      .map<Option>((s) => ({ type: "seller", key: `s-${s.id}`, seller: s }));
    const local = localPlaces(trimmed);
    const remoteItems = remote.q === trimmed ? remote.items : [];
    const seen = new Set(local.map((p) => p.label.toLowerCase()));
    const places = [...local, ...remoteItems.filter((p) => !seen.has(p.label.toLowerCase()))]
      .slice(0, 7)
      .map<Option>((p) => ({ type: "place", key: p.id, place: p }));
    return [...places, ...sellerHits];
  }, [trimmed, sellers, remote]);

  // zavřít při kliknutí mimo
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const pick = (o: Option) => {
    if (o.type === "place") {
      onPickPlace(o.place);
      setQuery(o.place.label);
    } else {
      onPickSeller(o.seller.id);
      setQuery("");
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const o = options[active] ?? options[0];
      if (o) {
        e.preventDefault();
        pick(o);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && trimmed.length > 0;
  const places = options.filter((o) => o.type === "place");
  const sellerOpts = options.filter((o) => o.type === "seller");

  const renderOption = (o: Option) => {
    const idx = options.indexOf(o);
    const isActive = idx === active;
    if (o.type === "place") {
      const Icon = KIND_ICON[o.place.kind];
      return (
        <li key={o.key} id={`${listId}-${idx}`} role="option" aria-selected={isActive}>
          <button
            type="button"
            onMouseEnter={() => setActive(idx)}
            onClick={() => pick(o)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
              isActive ? "bg-accent" : "hover:bg-muted",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-moss-soft text-moss-strong [&_svg]:size-4">
              <Icon aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{o.place.label}</span>
              {o.place.detail && <span className="block truncate text-xs text-muted-foreground">{o.place.detail}</span>}
            </span>
          </button>
        </li>
      );
    }
    return (
      <li key={o.key} id={`${listId}-${idx}`} role="option" aria-selected={isActive}>
        <button
          type="button"
          onMouseEnter={() => setActive(idx)}
          onClick={() => pick(o)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
            isActive ? "bg-accent" : "hover:bg-muted",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-wood-soft text-wood-strong [&_svg]:size-4">
            <Store aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{o.seller.name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {o.seller.address.city} · {o.seller.address.zip}
            </span>
          </span>
        </button>
      </li>
    );
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="flex h-11 items-center gap-2 rounded-full bg-muted pr-1.5 pl-4 transition-colors focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/25">
        <Search aria-hidden className="size-[18px] shrink-0 text-moss-strong" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
          aria-label="Zadejte adresu, PSČ nebo obec"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={currentLabel ? `Vaše adresa… (teď: ${currentLabel})` : "Zadejte svou adresu, PSČ nebo obec…"}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Smazat"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-[calc(100%+14px)] z-10 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-float">
          <ul id={listId} role="listbox" aria-label="Návrhy" className="max-h-[min(60vh,420px)] overflow-y-auto">
            {places.length > 0 && (
              <li role="presentation" className="px-3 pt-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Adresy a místa
              </li>
            )}
            {places.map(renderOption)}
            {sellerOpts.length > 0 && (
              <li role="presentation" className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Prodejci
              </li>
            )}
            {sellerOpts.map(renderOption)}
            {options.length === 0 && (
              <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
                {loading ? "Hledám…" : "Nic jsme nenašli. Zkuste obec nebo PSČ."}
              </li>
            )}
          </ul>
          <p className="border-t border-border px-3 pt-2 pb-0.5 text-[10px] text-muted-foreground">
            Adresy © přispěvatelé OpenStreetMap
          </p>
        </div>
      )}
    </div>
  );
}
