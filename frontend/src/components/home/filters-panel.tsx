"use client";

import type { ReactNode } from "react";
import { LayoutGrid, MapPin, RotateCcw, SlidersHorizontal } from "lucide-react";
import { FuelIcon } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  FUEL_CATEGORIES,
  FUEL_META,
  LOG_LENGTHS,
  MOISTURE,
  RADIUS_MAX_KM,
  RADIUS_MIN_KM,
  WOOD_FORMS,
  WOOD_GROUPS,
} from "@/lib/constants";
import {
  BRIQUETTE_TYPES,
  COAL_TYPES,
  PELLET_CERTIFICATIONS,
  SORT_OPTIONS,
  type FilterState,
  type SellerMatch,
  type SortKey,
} from "@/lib/filters";
import { formatCzkPerUnit, formatKm, formatKwhPrice, NBSP } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PRICE_TIER_META } from "@/lib/pricing";
import type { FuelCategory, Moisture, PriceMode, WoodForm, WoodGroup } from "@/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Stavební prvky                                                      */
/* ------------------------------------------------------------------ */

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex h-5 items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Čip ve stejně širokých sloupcích mřížky (symetrie). */
function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "flex h-9 min-w-0 items-center justify-center rounded-xl border px-2 text-xs font-medium transition-colors",
        active
          ? "border-moss bg-moss-soft text-moss-strong"
          : "border-border bg-card text-foreground hover:border-moss/50 hover:bg-muted",
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

function ChipGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div className={cn("grid gap-1.5", cols === 2 && "grid-cols-2", cols === 3 && "grid-cols-3", cols === 4 && "grid-cols-4")}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Podrobné filtry podle kategorie                                     */
/* ------------------------------------------------------------------ */

function DetailFilters({ filters, onChange }: { filters: FilterState; onChange: (patch: Partial<FilterState>) => void }) {
  const { t } = useI18n();
  const toggle = <K extends keyof FilterState>(key: K, value: NonNullable<FilterState[K]>) =>
    onChange({ [key]: filters[key] === value ? null : value } as Partial<FilterState>);

  switch (filters.category) {
    case "wood":
      return (
        <>
          <Section title={t("home.filters.woodType")}>
            <ChipGrid cols={3}>
              {(Object.keys(WOOD_GROUPS) as WoodGroup[]).map((g) => (
                <Chip key={g} active={filters.woodGroup === g} onClick={() => toggle("woodGroup", g)} title={WOOD_GROUPS[g].hint}>
                  {WOOD_GROUPS[g].label}
                </Chip>
              ))}
            </ChipGrid>
          </Section>
          <Section title={t("home.filters.processing")}>
            <ChipGrid>
              {(Object.keys(WOOD_FORMS) as WoodForm[]).map((f) => (
                <Chip key={f} active={filters.woodForm === f} onClick={() => toggle("woodForm", f)}>
                  {t(`home.filters.form.${f}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>
          <Section title={t("home.filters.moisture")}>
            <ChipGrid cols={3}>
              {(Object.keys(MOISTURE) as Moisture[]).map((m) => (
                <Chip key={m} active={filters.moisture === m} onClick={() => toggle("moisture", m)} title={MOISTURE[m].hint}>
                  {t(`home.filters.moist.${m}`)}
                </Chip>
              ))}
            </ChipGrid>
          </Section>
          <Section title={t("home.filters.logLength")}>
            <ChipGrid cols={4}>
              {LOG_LENGTHS.map((l) => (
                <Chip key={l} active={filters.logLengthCm === l} onClick={() => toggle("logLengthCm", l)}>
                  {l}{NBSP}cm
                </Chip>
              ))}
            </ChipGrid>
          </Section>
        </>
      );
    case "pellets":
      return (
        <Section title={t("home.filters.certification")}>
          <ChipGrid>
            {PELLET_CERTIFICATIONS.map((c) => (
              <Chip key={c} active={filters.certification === c} onClick={() => toggle("certification", c)}>
                {c}
              </Chip>
            ))}
          </ChipGrid>
        </Section>
      );
    case "briquettes":
      return (
        <Section title={t("home.filters.briquetteType")}>
          <ChipGrid>
            {BRIQUETTE_TYPES.map((t) => (
              <Chip key={t} active={filters.briquetteType === t} onClick={() => toggle("briquetteType", t)}>
                {t}
              </Chip>
            ))}
          </ChipGrid>
        </Section>
      );
    case "coal":
      return (
        <Section title={t("home.filters.coalType")}>
          <ChipGrid>
            {COAL_TYPES.map((t) => (
              <Chip key={t} active={filters.coalType === t} onClick={() => toggle("coalType", t)}>
                {t}
              </Chip>
            ))}
          </ChipGrid>
        </Section>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Výsledky                                                            */
/* ------------------------------------------------------------------ */

function ResultRow({
  match,
  mode,
  hovered,
  onHover,
  onSelect,
}: {
  match: SellerMatch;
  mode: PriceMode;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const { seller, product } = match;
  const tierColor = PRICE_TIER_META[match.tier].color;
  const unitPrice = formatCzkPerUnit(product.price, product.unit);
  const kwhPrice = formatKwhPrice(match.pricePerKwh);
  const [price, secondary] = mode === "kwh" ? [kwhPrice, unitPrice] : [unitPrice, kwhPrice];
  return (
    <li>
      <button
        type="button"
        id={`result-${seller.id}`}
        onMouseEnter={() => onHover(seller.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(seller.id)}
        onBlur={() => onHover(null)}
        onClick={() => onSelect(seller.id)}
        className={cn(
          "grid w-full grid-cols-[2.25rem_1fr] items-start gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
          hovered ? "border-moss/50 bg-accent" : "border-transparent hover:bg-muted",
        )}
      >
        <span className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-secondary text-wood-strong [&_svg]:size-4">
          <FuelIcon category={product.category} />
        </span>
        <span className="min-w-0 space-y-0.5">
          {/* 1) celý název, 2) obě ceny (hlavní podle přepínače), 3) místo a vzdálenost */}
          <span className="block truncate text-sm font-semibold text-foreground">{seller.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: tierColor }} />
              <span className="num text-xs font-bold text-foreground">{price}</span>
            </span>
            <span className="num pl-3.5 text-[11px] whitespace-nowrap text-muted-foreground">{secondary}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {seller.address.city} · {formatKm(match.distanceKm)}
          </span>
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export function FiltersPanel({
  filters,
  onChange,
  onCategoryChange,
  onReset,
  activeCount,
  matches,
  loading,
  mode,
  locationLabel,
  hoveredId,
  onHover,
  onSelect,
  className,
}: {
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onCategoryChange: (category: FuelCategory | "all") => void;
  onReset: () => void;
  activeCount: number;
  matches: SellerMatch[];
  loading: boolean;
  mode: PriceMode;
  locationLabel: string;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const { t } = useI18n();
  const nearby = !filters.nationwide;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-card", className)}>
      {/* Hlavička – stejná výška jako hlavička levého panelu */}
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-border px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-moss-soft text-moss-strong">
            <SlidersHorizontal aria-hidden className="size-4" />
          </span>
          <div>
            <h2 className="font-heading text-lg leading-tight font-semibold">{t("home.filters.title")}</h2>
            <p className="text-[11px] whitespace-nowrap text-muted-foreground">{activeCount > 0 ? t("home.filters.active", { count: activeCount }) : t("home.filters.unrestricted")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          {t("common.actions.reset")}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-5 px-5 py-5">
          <Section title={t("home.filters.fuel")}>
            <div className="grid grid-cols-2 gap-1.5">
              {(["all", ...FUEL_CATEGORIES] as const).map((c) => {
                const active = filters.category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCategoryChange(c)}
                    aria-pressed={active}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors [&_svg]:size-4",
                      c === "all" && "col-span-2",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "border-border bg-card text-foreground hover:border-moss/50 hover:bg-muted",
                    )}
                  >
                    {c === "all" ? <LayoutGrid aria-hidden /> : <FuelIcon category={c} />}
                    {c === "all" ? t("common.allFuels") : FUEL_META[c].short}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            title={t("home.filters.distance")}
            aside={
              <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                {t("home.filters.nearbyOnly")}
                <Switch size="sm" checked={nearby} onCheckedChange={(v) => onChange({ nationwide: !v })} aria-label={t("home.filters.nearbyOnly")} />
              </label>
            }
          >
            <div className={cn("rounded-xl border border-border bg-muted/50 px-3 py-3 transition-opacity", !nearby && "opacity-50")}>
              <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin aria-hidden className="size-3.5 shrink-0 text-moss" />
                <span className="truncate">
                  {t("home.filters.from")} <span className="font-medium text-foreground">{locationLabel}</span>
                </span>
              </p>
              <div className="flex items-center gap-3">
                <Slider
                  value={[filters.radiusKm]}
                  min={RADIUS_MIN_KM}
                  max={RADIUS_MAX_KM}
                  step={5}
                  disabled={!nearby}
                  onValueChange={(v) => onChange({ radiusKm: v[0] })}
                  aria-label={t("home.filters.radius")}
                  className="flex-1"
                />
                <span className="num w-14 text-right text-sm font-semibold text-foreground">{filters.radiusKm}{NBSP}km</span>
              </div>
            </div>
          </Section>

          <DetailFilters filters={filters} onChange={onChange} />

          <Section title={t("home.filters.sort")}>
            <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
              <SelectTrigger className="h-10 w-full rounded-xl bg-card text-sm" aria-label={t("home.filters.sort")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[1200]">
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>
        </div>

        {/* Výsledky */}
        <div className="border-t border-border px-3 py-4">
          <div className="mb-2 flex items-baseline justify-between px-2">
            <h3 className="font-heading text-base font-semibold">{t("home.filters.results")}</h3>
            <span className="num text-xs text-muted-foreground">
              {loading ? "…" : t("common.sellers", { count: matches.length })}
            </span>
          </div>
          {loading ? (
            <ul className="space-y-1.5 px-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="h-[52px] animate-pulse rounded-xl bg-muted" />
              ))}
            </ul>
          ) : matches.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t("home.filters.none")}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {matches.map((m) => (
                <ResultRow
                  key={m.seller.id}
                  match={m}
                  mode={mode}
                  hovered={hoveredId === m.seller.id}
                  onHover={onHover}
                  onSelect={onSelect}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
