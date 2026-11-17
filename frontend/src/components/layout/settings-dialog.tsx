"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Coins, Languages, MapPin, Moon, Scale, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Flag } from "@/components/common/flag";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LOCATION_PRESETS } from "@/lib/constants";
import { DEFAULT_EUR_RATE, EUR_RATE_SOURCE, currencySymbol, formatNumber, type Currency } from "@/lib/format";
import { LANGS, useI18n } from "@/lib/i18n";
import type { PriceMode } from "@/types";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 4;

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[2.25rem_1fr] gap-x-3 gap-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground [&_svg]:size-4">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="col-start-2">{children}</div>
    </section>
  );
}

/** Segmentový přepínač se stejně širokými volbami (symetrie). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-full bg-muted p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium transition-colors [&_svg]:size-3.5",
            value === o.value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Nastavení: jazyk, měna, zobrazení cen, výchozí poloha, motiv a porovnání. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, setLang, currency, setCurrency, priceMode, setPriceMode, location, setLocation, setLocationByZip, compareIds, clearCompare } =
    usePreferences();
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState(false);
  const symbol = currencySymbol();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t("layout.settings.title")}</DialogTitle>
          <DialogDescription>{t("layout.settings.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section icon={<Languages />} title={t("layout.settings.language.title")} hint={t("layout.settings.language.hint")}>
            <div role="radiogroup" aria-label={t("layout.settings.language.title")} className="grid grid-cols-3 gap-1.5">
              {LANGS.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    lang={l.code}
                    onClick={() => setLang(l.code)}
                    className={cn(
                      "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      active
                        ? "border-primary/40 bg-accent text-accent-foreground shadow-soft"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <Flag lang={l.code} />
                      <span className="text-sm font-semibold tracking-wide">{l.short}</span>
                    </span>
                    <span className="max-w-full truncate text-[11px]">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            icon={<Coins />}
            title={t("layout.settings.currency.title")}
            hint={t("layout.settings.currency.hint", { rate: formatNumber(DEFAULT_EUR_RATE, 2), source: EUR_RATE_SOURCE })}
          >
            <Segmented<Currency>
              label={t("layout.settings.currency.title")}
              value={currency}
              onChange={setCurrency}
              options={[
                { value: "CZK", label: `Kč · ${t("layout.settings.currency.czk")}` },
                { value: "EUR", label: `€ · ${t("layout.settings.currency.eur")}` },
              ]}
            />
          </Section>

          <Section icon={<Scale />} title={t("layout.settings.priceMode.title")} hint={t("layout.settings.priceMode.hint")}>
            <Segmented<PriceMode>
              label={t("layout.settings.priceMode.title")}
              value={priceMode}
              onChange={setPriceMode}
              options={[
                { value: "unit", label: t("layout.settings.priceMode.unit", { currency: symbol }) },
                { value: "kwh", label: t("layout.settings.priceMode.kwh", { currency: symbol }) },
              ]}
            />
          </Section>

          <Section icon={<MapPin />} title={t("layout.settings.location.title")} hint={t("layout.settings.location.hint", { label: location.label })}>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const ok = setLocationByZip(zip);
                setZipError(!ok);
                if (ok) {
                  setZip("");
                  toast.success(t("layout.settings.location.saved"));
                }
              }}
            >
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder={t("layout.settings.location.placeholder")}
                inputMode="numeric"
                aria-invalid={zipError || undefined}
                className="h-9 rounded-xl"
              />
              <Button type="submit" variant="outline">
                {t("common.actions.apply")}
              </Button>
            </form>
            {zipError && <p className="mt-1 text-xs text-destructive">{t("layout.settings.location.invalid")}</p>}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {LOCATION_PRESETS.slice(0, 6).map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setLocation(p)}
                  className={cn(
                    "truncate rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors",
                    p.label === location.label
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>

          <Section
            icon={resolvedTheme === "dark" ? <Moon /> : <Sun />}
            title={t("layout.settings.theme.title")}
            hint={t("layout.settings.theme.hint")}
          >
            <Segmented
              label={t("layout.settings.theme.title")}
              value={resolvedTheme === "dark" ? "dark" : "light"}
              onChange={setTheme}
              options={[
                { value: "light", label: t("layout.settings.theme.light"), icon: <Sun /> },
                { value: "dark", label: t("layout.settings.theme.dark"), icon: <Moon /> },
              ]}
            />
          </Section>

          <Section
            icon={<Trash2 />}
            title={t("layout.settings.compare.title")}
            hint={t("layout.settings.compare.hint", { count: compareIds.length, max: MAX_COMPARE })}
          >
            <Button variant="outline" size="sm" disabled={compareIds.length === 0} onClick={clearCompare}>
              {t("layout.settings.compare.clear")}
            </Button>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
