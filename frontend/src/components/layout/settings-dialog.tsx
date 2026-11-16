"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { MapPin, Moon, Scale, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePreferences } from "@/components/providers/preferences-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LOCATION_PRESETS } from "@/lib/constants";
import type { PriceMode } from "@/types";
import { cn } from "@/lib/utils";

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

/** Segmentový přepínač se dvěma stejně širokými volbami (symetrie). */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors [&_svg]:size-3.5",
            value === o.value ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Nastavení: zobrazení cen, výchozí poloha, motiv a porovnání. */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { priceMode, setPriceMode, location, setLocation, setLocationByZip, compareIds, clearCompare } = usePreferences();
  const { resolvedTheme, setTheme } = useTheme();
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nastavení</DialogTitle>
          <DialogDescription>Uloží se jen v tomto prohlížeči.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section icon={<Scale />} title="Zobrazení cen" hint="Za jednotku (PRMS, t) nebo přepočet na výhřevnost">
            <Segmented<PriceMode>
              label="Zobrazení cen"
              value={priceMode}
              onChange={setPriceMode}
              options={[
                { value: "unit", label: "Kč za jednotku" },
                { value: "kwh", label: "Kč za kWh" },
              ]}
            />
          </Section>

          <Section icon={<MapPin />} title="Výchozí poloha" hint={`Teď: ${location.label}`}>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const ok = setLocationByZip(zip);
                setZipError(!ok);
                if (ok) {
                  setZip("");
                  toast.success("Poloha uložena");
                }
              }}
            >
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="PSČ, např. 602 00"
                inputMode="numeric"
                aria-invalid={zipError || undefined}
                className="h-9 rounded-xl"
              />
              <Button type="submit" variant="outline">
                Použít
              </Button>
            </form>
            {zipError && <p className="mt-1 text-xs text-destructive">PSČ jsme nerozpoznali.</p>}
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

          <Section icon={resolvedTheme === "dark" ? <Moon /> : <Sun />} title="Vzhled" hint="Světlý den, nebo tmavý večer u kamen">
            <Segmented
              label="Vzhled"
              value={resolvedTheme === "dark" ? "dark" : "light"}
              onChange={setTheme}
              options={[
                { value: "light", label: "Světlý", icon: <Sun /> },
                { value: "dark", label: "Tmavý", icon: <Moon /> },
              ]}
            />
          </Section>

          <Section icon={<Trash2 />} title="Porovnání prodejců" hint={`Vybráno ${compareIds.length} z 4`}>
            <Button variant="outline" size="sm" disabled={compareIds.length === 0} onClick={clearCompare}>
              Vymazat výběr
            </Button>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
