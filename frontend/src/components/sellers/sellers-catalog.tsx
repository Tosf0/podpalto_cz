"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, Store, Table2, Truck } from "lucide-react";
import type { FuelCategory, RegionCode, Seller, SellerSize } from "@/types";
import { FUEL_CATEGORIES, FUEL_META, REGIONS } from "@/lib/constants";
import { formatCzk, formatNumber, formatRelative, plural } from "@/lib/format";
import { getSellers } from "@/lib/api/sellers";
import { useApi } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  FuelBadge,
  ListSkeleton,
  MockModeBadge,
  PageHeader,
  RegionSelect,
  StarRating,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cheapestHardWood, cheapestPellets, deliverySummary, SIZE_LABEL, THREAT_META } from "./seller-utils";

type SortKey = "name" | "rating" | "hardwood" | "breadth" | "updated";
type DeliveryKey = "own" | "arm" | "free" | "pickup";
type BreadthKey = "all" | "1" | "2" | "3+";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Název",
  rating: "Hodnocení",
  hardwood: "Nejlevnější tvrdé dřevo",
  breadth: "Šíře sortimentu",
  updated: "Poslední aktualizace",
};

const DELIVERY_LABEL: Record<DeliveryKey, string> = {
  own: "Vlastní doprava",
  arm: "Hydraulická ruka",
  free: "Doprava zdarma v okolí",
  pickup: "Osobní odběr",
};

const BREADTH_LABEL: Record<BreadthKey, string> = {
  all: "Libovolná",
  "1": "1 kategorie",
  "2": "2 kategorie",
  "3+": "3 a více",
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center rounded-xl border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ThreatBadge({ seller }: { seller: Seller }) {
  if (!seller.intel) return <span className="text-muted-foreground">–</span>;
  const m = THREAT_META[seller.intel.threatLevel];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-lg border px-2 py-0.5 text-xs font-medium",
        m.className,
      )}
    >
      {m.label}
    </span>
  );
}

function priceCell(value: number | undefined, unit: string) {
  return value === undefined ? "–" : `${formatCzk(value)}/${unit}`;
}

function SellerRow({ seller }: { seller: Seller }) {
  const router = useRouter();
  const href = `/prodejci/${seller.slug}`;
  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(href)}>
      <TableCell className="min-w-52">
        <Link
          href={href}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-foreground outline-none hover:text-primary focus-visible:underline"
        >
          {seller.name}
        </Link>
        <div className="text-xs text-muted-foreground">{seller.address.city}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">{REGIONS[seller.address.region].short}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {seller.categories.map((c) => (
            <FuelBadge key={c} category={c} size="sm" showIcon={false} />
          ))}
        </div>
      </TableCell>
      <TableCell className="num whitespace-nowrap text-right">{priceCell(cheapestHardWood(seller), "PRMS")}</TableCell>
      <TableCell className="num whitespace-nowrap text-right">{priceCell(cheapestPellets(seller), "t")}</TableCell>
      <TableCell className="min-w-44 whitespace-normal text-xs text-muted-foreground">{deliverySummary(seller)}</TableCell>
      <TableCell>
        <StarRating rating={seller.rating} reviewCount={seller.reviewCount} />
      </TableCell>
      <TableCell>
        <ThreatBadge seller={seller} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatRelative(seller.lastScrapedAt)}
      </TableCell>
    </TableRow>
  );
}

function SellerCard({ seller }: { seller: Seller }) {
  return (
    <article className="relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">
            <Link
              href={`/prodejci/${seller.slug}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl hover:text-primary focus-visible:underline"
            >
              {seller.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {seller.address.city}, {REGIONS[seller.address.region].short}
          </p>
        </div>
        <StarRating rating={seller.rating} reviewCount={seller.reviewCount} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {seller.categories.map((c) => (
          <FuelBadge key={c} category={c} size="sm" />
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-secondary p-3">
        <div>
          <dt className="text-xs text-muted-foreground">Tvrdé dřevo od</dt>
          <dd className="num text-sm font-semibold">{priceCell(cheapestHardWood(seller), "PRMS")}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pelety od</dt>
          <dd className="num text-sm font-semibold">{priceCell(cheapestPellets(seller), "t")}</dd>
        </div>
      </dl>
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Truck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>{deliverySummary(seller)}</span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Aktualizováno {formatRelative(seller.lastScrapedAt)}</span>
        <ThreatBadge seller={seller} />
      </div>
    </article>
  );
}

function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function SellersCatalog() {
  const { data: sellers, loading, error, reload } = useApi(() => getSellers(), []);
  const [view, setView] = useState<"table" | "grid">("table");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionCode | "all">("all");
  const [size, setSize] = useState<SellerSize | "all">("all");
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

  const stats = useMemo(() => {
    if (!sellers) return null;
    return {
      sellers: sellers.length,
      regions: new Set(sellers.map((s) => s.address.region)).size,
      products: sellers.reduce((n, s) => n + s.products.length, 0),
    };
  }, [sellers]);

  const hasFilters =
    query !== "" || region !== "all" || size !== "all" || breadth !== "all" || delivery.length > 0 || fuels.length > 0;

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
        eyebrow="Katalog"
        title="Prodejci paliv"
        icon={<Store />}
        description={
          stats ? (
            <>
              <span className="num">{formatNumber(stats.sellers)}</span>{" "}
              {plural(stats.sellers, "prodejce", "prodejci", "prodejců")} z{" "}
              <span className="num">{formatNumber(stats.regions)}</span>{" "}
              {plural(stats.regions, "kraje", "krajů", "krajů")}, sledujeme{" "}
              <span className="num">{formatNumber(stats.products)}</span>{" "}
              {plural(stats.products, "produkt", "produkty", "produktů")}.
            </>
          ) : (
            "Načítáme katalog prodejců…"
          )
        }
        actions={<MockModeBadge />}
      />

      <section aria-label="Filtry" className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hledat podle názvu nebo města…"
              aria-label="Hledat prodejce"
              className="h-9 rounded-xl bg-background pl-9"
            />
          </div>
          <RegionSelect value={region} onChange={setRegion} className="h-9 w-full lg:w-56" />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger aria-label="Řazení" className="h-9 w-full bg-card lg:w-72">
              <span className="text-muted-foreground">Řadit:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[1200]">
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SORT_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <FilterGroup label="Velikost">
            {(["all", "small", "medium", "large"] as const).map((k) => (
              <Chip key={k} active={size === k} onClick={() => setSize(k)}>
                {k === "all" ? "Všechny" : SIZE_LABEL[k]}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Šíře sortimentu">
            {(Object.keys(BREADTH_LABEL) as BreadthKey[]).map((k) => (
              <Chip key={k} active={breadth === k} onClick={() => setBreadth(k)}>
                {BREADTH_LABEL[k]}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Doprava">
            {(Object.keys(DELIVERY_LABEL) as DeliveryKey[]).map((k) => (
              <Chip key={k} active={delivery.includes(k)} onClick={() => setDelivery(toggleIn(delivery, k))}>
                {DELIVERY_LABEL[k]}
              </Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Palivo">
            {FUEL_CATEGORIES.map((c) => (
              <Chip key={c} active={fuels.includes(c)} onClick={() => setFuels(toggleIn(fuels, c))}>
                {FUEL_META[c].short}
              </Chip>
            ))}
          </FilterGroup>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loading ? (
            "Načítání…"
          ) : (
            <>
              Zobrazeno <span className="num font-medium text-foreground">{formatNumber(filtered.length)}</span> z{" "}
              <span className="num">{formatNumber(sellers?.length ?? 0)}</span>
            </>
          )}
          {hasFilters && !loading && (
            <Button variant="link" size="sm" onClick={reset} className="ml-1">
              Zrušit filtry
            </Button>
          )}
        </p>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as "table" | "grid")}
          variant="outline"
          aria-label="Zobrazení"
        >
          <ToggleGroupItem value="table" aria-label="Tabulka" className="gap-1.5 px-3">
            <Table2 className="size-4" /> Tabulka
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Mřížka" className="gap-1.5 px-3">
            <LayoutGrid className="size-4" /> Mřížka
          </ToggleGroupItem>
        </ToggleGroup>
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
          title="Žádný prodejce neodpovídá filtrům"
          description="Zkuste upravit hledaný výraz nebo zrušit některý z filtrů."
          action={
            <Button variant="outline" onClick={reset}>
              Zrušit filtry
            </Button>
          }
        />
      ) : view === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead>Prodejce</TableHead>
                <TableHead>Kraj</TableHead>
                <TableHead>Paliva</TableHead>
                <TableHead className="text-right">Tvrdé dřevo od</TableHead>
                <TableHead className="text-right">Pelety od</TableHead>
                <TableHead>Doprava</TableHead>
                <TableHead>Hodnocení</TableHead>
                <TableHead>CI hrozba</TableHead>
                <TableHead>Aktualizace</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <SellerRow key={s.id} seller={s} />
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SellerCard key={s.id} seller={s} />
          ))}
        </div>
      )}
    </div>
  );
}
