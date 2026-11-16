"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Clock,
  Forklift,
  LayoutGrid,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Store,
  Table2,
  Truck,
  X,
} from "lucide-react";
import type { FuelCategory, RegionCode, Seller, SellerSize } from "@/types";
import { FUEL_CATEGORIES, FUEL_META, REGION_CODES, REGIONS } from "@/lib/constants";
import { formatCzk, formatNumber, formatRelative, plural } from "@/lib/format";
import { getSellers } from "@/lib/api/sellers";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  FuelBadge,
  FuelIcon,
  ListSkeleton,
  MockModeBadge,
  PageHeader,
  StarRating,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cheapestHardWood, cheapestPellets, deliveryShort, SIZE_LABEL, THREAT_META } from "./seller-utils";

type SortKey = "name" | "rating" | "hardwood" | "breadth" | "updated";
type DeliveryKey = "own" | "arm" | "free" | "pickup";
type BreadthKey = "all" | "1" | "2" | "3+";
type SizeKey = SellerSize | "all";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Název",
  rating: "Hodnocení",
  hardwood: "Nejlevnější dřevo",
  breadth: "Šíře sortimentu",
  updated: "Aktualizace",
};

const DELIVERY_LABEL: Record<DeliveryKey, string> = {
  own: "Vlastní doprava",
  arm: "Hydraulická ruka",
  free: "Doprava zdarma v okolí",
  pickup: "Osobní odběr",
};

const BREADTH_LABEL: Record<BreadthKey, string> = {
  all: "Libovolný",
  "1": "1 palivo",
  "2": "2 paliva",
  "3+": "3 a více paliv",
};

const SIZE_OPTIONS: Record<SizeKey, string> = {
  all: "Všechny",
  small: "Malý",
  medium: "Střední",
  large: "Velký",
};

function matchesDelivery(s: Seller, k: DeliveryKey): boolean {
  const d = s.delivery;
  switch (k) {
    case "own":
      return d.ownDelivery;
    case "arm":
      return d.hydraulicArm;
    case "free":
      return d.ownDelivery && d.freeRadiusKm > 0;
    case "pickup":
      return d.pickupAvailable;
  }
}

function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/* ------------------------------------------------------------------ */
/* Filtry                                                              */
/* ------------------------------------------------------------------ */

/** Tlačítko-pilulka otevírající popover; po aktivaci zvýrazněné a s počtem / hodnotou. */
function FilterPill({
  label,
  icon,
  value,
  count = 0,
  children,
  width = "w-64",
}: {
  label: string;
  icon?: React.ReactNode;
  value?: string;
  count?: number;
  children: React.ReactNode;
  width?: string;
}) {
  const active = count > 0 || !!value;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            active
              ? "border-primary bg-accent text-accent-foreground"
              : "border-border bg-card text-foreground hover:bg-muted",
          )}
        >
          {icon}
          <span>{label}</span>
          {value && <span className="font-semibold">· {value}</span>}
          {count > 0 && (
            <span className="num flex min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-aria-expanded:rotate-180"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("gap-1 rounded-xl p-2", width)}>
        {children}
      </PopoverContent>
    </Popover>
  );
}

function CheckOption({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
    </label>
  );
}

function RadioOption({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50",
        selected && "bg-accent font-medium text-accent-foreground",
      )}
    >
      {children}
      {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function AppliedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Zrušit filtr ${label}`}
      className="group inline-flex h-8 items-center gap-1.5 rounded-xl border border-primary/40 bg-accent px-2.5 text-xs font-medium whitespace-nowrap text-accent-foreground transition-colors outline-none hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <X aria-hidden="true" className="size-3.5 text-muted-foreground group-hover:text-foreground" />
    </button>
  );
}

function ViewToggle({ value, onChange }: { value: "table" | "grid"; onChange: (v: "table" | "grid") => void }) {
  const items = [
    { v: "table" as const, label: "Tabulka", Icon: Table2 },
    { v: "grid" as const, label: "Mřížka", Icon: LayoutGrid },
  ];
  return (
    <div role="radiogroup" aria-label="Zobrazení" className="inline-flex rounded-full bg-muted p-1">
      {items.map(({ v, label, Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buňky                                                               */
/* ------------------------------------------------------------------ */

function ThreatIcon({ seller }: { seller: Seller }) {
  if (!seller.intel) return null;
  const m = THREAT_META[seller.intel.threatLevel];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-lg border", m.className)}
          aria-label={m.label}
        >
          <ShieldAlert aria-hidden="true" className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{m.label}</TooltipContent>
    </Tooltip>
  );
}

function DeliveryLine({ seller, truck = true }: { seller: Seller; truck?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
      {truck && <Truck aria-hidden="true" className="size-3.5 shrink-0" />}
      {deliveryShort(seller)}
      {seller.delivery.hydraulicArm && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex text-foreground" aria-label="Hydraulická ruka">
              <Forklift aria-hidden="true" className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>Hydraulická ruka</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

function FuelIcons({ seller }: { seller: Seller }) {
  return (
    <div className="flex items-center gap-1">
      {seller.categories.map((c) => (
        <Tooltip key={c}>
          <TooltipTrigger asChild>
            <span
              className={cn("inline-flex size-6 items-center justify-center rounded-lg border", FUEL_META[c].className)}
              aria-label={FUEL_META[c].label}
            >
              <FuelIcon category={c} className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{FUEL_META[c].label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function priceCell(value: number | undefined) {
  return value === undefined ? <span className="text-muted-foreground">–</span> : formatCzk(value);
}

function SellerRow({ seller }: { seller: Seller }) {
  const router = useRouter();
  const href = `/prodejci/${seller.slug}`;
  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href)}>
      <TableCell className="whitespace-normal">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-foreground outline-none hover:text-primary focus-visible:underline"
        >
          {seller.name}
        </Link>
        <div className="text-xs text-muted-foreground">
          {seller.address.city} · {REGIONS[seller.address.region].short}
        </div>
      </TableCell>
      <TableCell>
        <FuelIcons seller={seller} />
      </TableCell>
      <TableCell className="num text-right whitespace-nowrap">{priceCell(cheapestHardWood(seller))}</TableCell>
      <TableCell className="num text-right whitespace-nowrap">{priceCell(cheapestPellets(seller))}</TableCell>
      <TableCell>
        <DeliveryLine seller={seller} truck={false} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <StarRating rating={seller.rating} reviewCount={seller.reviewCount} className="whitespace-nowrap" />
          <ThreatIcon seller={seller} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function PriceStat({ label, unit, value }: { label: string; unit: string; value: number | undefined }) {
  return (
    <div className="min-w-0 rounded-xl bg-secondary px-3 py-2.5">
      <dt className="text-xs whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 text-base font-semibold whitespace-nowrap">
        {value === undefined ? (
          "–"
        ) : (
          <>
            {formatCzk(value)}
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">/{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  return (
    <article className="relative row-span-5 grid grid-rows-subgrid gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold text-foreground">
            <Link
              href={`/prodejci/${seller.slug}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl hover:text-primary focus-visible:underline"
            >
              {seller.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {seller.address.city} · {REGIONS[seller.address.region].short}
          </p>
        </div>
        <StarRating rating={seller.rating} className="shrink-0 whitespace-nowrap" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {seller.categories.map((c) => (
          <FuelBadge key={c} category={c} size="sm" />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <PriceStat label="Tvrdé dřevo od" unit="PRMS" value={cheapestHardWood(seller)} />
        <PriceStat label="Pelety od" unit="t" value={cheapestPellets(seller)} />
      </dl>
      <DeliveryLine seller={seller} />
      <div className="relative flex items-center justify-between gap-2 self-end border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden="true" className="size-3.5" />
          Aktualizace {formatRelative(seller.lastScrapedAt)}
        </span>
        <ThreatIcon seller={seller} />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Katalog                                                             */
/* ------------------------------------------------------------------ */

export function SellersCatalog() {
  const { data: sellers, loading, error, reload } = useApi(() => getSellers(), []);
  const [view, setView] = useState<"table" | "grid">("table");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionCode | "all">("all");
  const [size, setSize] = useState<SizeKey>("all");
  const [breadth, setBreadth] = useState<BreadthKey>("all");
  const [delivery, setDelivery] = useState<DeliveryKey[]>([]);
  const [fuels, setFuels] = useState<FuelCategory[]>([]);
  const [sort, setSort] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    if (!sellers) return [];
    const q = query.trim().toLowerCase();
    const list = sellers.filter((s) => {
      if (q && !`${s.name} ${s.address.city} ${s.legalName ?? ""}`.toLowerCase().includes(q)) return false;
      if (region !== "all" && s.address.region !== region) return false;
      if (size !== "all" && s.size !== size) return false;
      const n = s.categories.length;
      if (breadth === "1" && n !== 1) return false;
      if (breadth === "2" && n !== 2) return false;
      if (breadth === "3+" && n < 3) return false;
      if (!delivery.every((k) => matchesDelivery(s, k))) return false;
      if (!fuels.every((f) => s.categories.includes(f))) return false;
      return true;
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "rating":
          return b.rating - a.rating;
        case "hardwood":
          return (cheapestHardWood(a) ?? Infinity) - (cheapestHardWood(b) ?? Infinity);
        case "breadth":
          return b.categories.length - a.categories.length || a.name.localeCompare(b.name, "cs");
        case "updated":
          return new Date(b.lastScrapedAt).getTime() - new Date(a.lastScrapedAt).getTime();
        default:
          return a.name.localeCompare(b.name, "cs");
      }
    });
  }, [sellers, query, region, size, breadth, delivery, fuels, sort]);

  const moreCount = (size !== "all" ? 1 : 0) + (breadth !== "all" ? 1 : 0);
  const hasFilters = query !== "" || region !== "all" || moreCount > 0 || delivery.length > 0 || fuels.length > 0;
  const hasChips = region !== "all" || moreCount > 0 || delivery.length > 0 || fuels.length > 0;
  const total = sellers?.length ?? 0;

  function reset() {
    setQuery("");
    setRegion("all");
    setSize("all");
    setBreadth("all");
    setDelivery([]);
    setFuels([]);
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Prodejci paliv"
        icon={<Store />}
        description="Ceny, doprava a hodnocení na jednom místě."
        actions={<MockModeBadge />}
      />

      <section aria-label="Filtry" className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:max-w-sm lg:flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat prodejce nebo město"
              aria-label="Hledat prodejce"
              className="h-10 rounded-xl bg-card pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterPill label="Kraj" value={region === "all" ? undefined : REGIONS[region].short} width="w-60">
              <div role="radiogroup" aria-label="Kraj" className="max-h-72 space-y-0.5 overflow-y-auto">
                <RadioOption selected={region === "all"} onSelect={() => setRegion("all")}>
                  Všechny kraje
                </RadioOption>
                {REGION_CODES.map((code) => (
                  <RadioOption key={code} selected={region === code} onSelect={() => setRegion(code)}>
                    {REGIONS[code].name}
                  </RadioOption>
                ))}
              </div>
            </FilterPill>

            <FilterPill label="Palivo" count={fuels.length}>
              {FUEL_CATEGORIES.map((c) => (
                <CheckOption key={c} checked={fuels.includes(c)} onChange={() => setFuels(toggleIn(fuels, c))}>
                  <FuelIcon category={c} className="size-4 shrink-0 text-muted-foreground" />
                  {FUEL_META[c].label}
                </CheckOption>
              ))}
            </FilterPill>

            <FilterPill label="Doprava" count={delivery.length} width="w-64">
              {(Object.keys(DELIVERY_LABEL) as DeliveryKey[]).map((k) => (
                <CheckOption key={k} checked={delivery.includes(k)} onChange={() => setDelivery(toggleIn(delivery, k))}>
                  {DELIVERY_LABEL[k]}
                </CheckOption>
              ))}
            </FilterPill>

            <FilterPill
              label="Další filtry"
              icon={<SlidersHorizontal aria-hidden="true" className="size-4 text-muted-foreground" />}
              count={moreCount}
              width="w-64"
            >
              <GroupLabel>Velikost prodejce</GroupLabel>
              <div role="radiogroup" aria-label="Velikost prodejce" className="space-y-0.5">
                {(Object.keys(SIZE_OPTIONS) as SizeKey[]).map((k) => (
                  <RadioOption key={k} selected={size === k} onSelect={() => setSize(k)}>
                    {SIZE_OPTIONS[k]}
                  </RadioOption>
                ))}
              </div>
              <div className="my-1 h-px bg-border" />
              <GroupLabel>Šíře sortimentu</GroupLabel>
              <div role="radiogroup" aria-label="Šíře sortimentu" className="space-y-0.5">
                {(Object.keys(BREADTH_LABEL) as BreadthKey[]).map((k) => (
                  <RadioOption key={k} selected={breadth === k} onSelect={() => setBreadth(k)}>
                    {BREADTH_LABEL[k]}
                  </RadioOption>
                ))}
              </div>
            </FilterPill>
          </div>
        </div>

        {hasChips && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Aktivní filtry">
            {region !== "all" && <AppliedChip label={REGIONS[region].name} onRemove={() => setRegion("all")} />}
            {fuels.map((f) => (
              <AppliedChip key={f} label={FUEL_META[f].label} onRemove={() => setFuels(toggleIn(fuels, f))} />
            ))}
            {delivery.map((k) => (
              <AppliedChip key={k} label={DELIVERY_LABEL[k]} onRemove={() => setDelivery(toggleIn(delivery, k))} />
            ))}
            {size !== "all" && <AppliedChip label={`Velikost: ${SIZE_LABEL[size]}`} onRemove={() => setSize("all")} />}
            {breadth !== "all" && (
              <AppliedChip label={`Sortiment: ${BREADTH_LABEL[breadth]}`} onRemove={() => setBreadth("all")} />
            )}
            <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
              Zrušit vše
            </Button>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loading ? (
            "Načítání…"
          ) : (
            <>
              <span className="num text-base font-semibold text-foreground">{formatNumber(filtered.length)}</span>
              {filtered.length !== total && <span className="num"> z {formatNumber(total)}</span>}{" "}
              {plural(filtered.length, "prodejce", "prodejci", "prodejců")}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger aria-label="Řazení" className="h-10 w-auto min-w-52 gap-2 rounded-xl bg-card px-3">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Řadit:</span>
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {loading ? (
        <ListSkeleton count={6} />
      ) : error ? (
        <EmptyState
          title="Katalog se nepodařilo načíst"
          description={error.message}
          action={<Button onClick={reload}>Zkusit znovu</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search />}
          title="Nic nenalezeno"
          description="Zkuste upravit hledání nebo zrušit filtry."
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                Zrušit vše
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {view === "table" && (
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="h-12 bg-secondary/50 hover:bg-secondary/50">
                    <TableHead>Prodejce</TableHead>
                    <TableHead className="w-22">Paliva</TableHead>
                    <TableHead className="w-24 text-right">
                      <div className="leading-tight">Tvrdé dřevo</div>
                      <div className="text-[11px] font-normal text-muted-foreground">od, Kč/PRMS</div>
                    </TableHead>
                    <TableHead className="w-20 text-right">
                      <div className="leading-tight">Pelety</div>
                      <div className="text-[11px] font-normal text-muted-foreground">od, Kč/t</div>
                    </TableHead>
                    <TableHead className="w-36">Doprava</TableHead>
                    <TableHead className="w-32">Hodnocení</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <SellerRow key={s.id} seller={s} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div
            // karty jsou subgrid přes 5 řádků → hlavička, štítky, ceny, doprava a patička lícují napříč celou řadou
            className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", view === "table" && "md:hidden")}
          >
            {filtered.map((s) => (
              <SellerCard key={s.id} seller={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
