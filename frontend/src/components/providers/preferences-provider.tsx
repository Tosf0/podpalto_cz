"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PriceMode, UserLocation } from "@/types";
import { DEFAULT_LOCATION, ZIP_PREFIX_LOCATIONS } from "@/lib/constants";

/**
 * Globální uživatelské preference (sdílené napříč stránkami, uložené v localStorage):
 * - priceMode: zobrazení ceny za jednotku (PRMS/t) vs. Kč/kWh
 * - location: lokalita uživatele (pro vzdálenosti a dopravu)
 * - compareIds: prodejci vybraní k porovnání (tlačítko „Porovnat“)
 */
interface PreferencesValue {
  priceMode: PriceMode;
  setPriceMode: (m: PriceMode) => void;
  location: UserLocation;
  setLocation: (l: UserLocation) => void;
  /** Nastaví lokalitu podle PSČ. Vrací `false`, pokud PSČ nelze rozpoznat. */
  setLocationByZip: (zip: string) => boolean;
  compareIds: string[];
  toggleCompare: (sellerId: string) => void;
  clearCompare: () => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

const STORAGE_KEY = "podpalto:prefs:v1";
const MAX_COMPARE = 4;

/** PSČ → lokalita (hrubě podle prvních dvou číslic). */
export function locationFromZip(zip: string): UserLocation | null {
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 3) return null;
  const hit = ZIP_PREFIX_LOCATIONS[digits.slice(0, 2)];
  if (!hit) return null;
  const pretty = digits.length === 5 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
  return { label: `${hit.city} (${pretty})`, lat: hit.lat, lng: hit.lng, region: hit.region, zip: pretty };
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [priceMode, setPriceMode] = useState<PriceMode>("unit");
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // načtení z localStorage až po hydrataci (žádný mismatch SSR/CSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Pick<PreferencesValue, "priceMode" | "location" | "compareIds">>;
        /* eslint-disable react-hooks/set-state-in-effect */
        if (saved.priceMode === "unit" || saved.priceMode === "kwh") setPriceMode(saved.priceMode);
        if (saved.location?.lat && saved.location?.lng) setLocation(saved.location);
        if (Array.isArray(saved.compareIds)) setCompareIds(saved.compareIds.slice(0, MAX_COMPARE));
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* localStorage nedostupné – ignorovat */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ priceMode, location, compareIds }));
    } catch {
      /* ignorovat */
    }
  }, [hydrated, priceMode, location, compareIds]);

  const setLocationByZip = useCallback((zip: string) => {
    const loc = locationFromZip(zip);
    if (!loc) return false;
    setLocation(loc);
    return true;
  }, []);

  const toggleCompare = useCallback((sellerId: string) => {
    setCompareIds((ids) =>
      ids.includes(sellerId) ? ids.filter((i) => i !== sellerId) : [...ids, sellerId].slice(-MAX_COMPARE),
    );
  }, []);

  const clearCompare = useCallback(() => setCompareIds([]), []);

  const value = useMemo<PreferencesValue>(
    () => ({
      priceMode,
      setPriceMode,
      location,
      setLocation,
      setLocationByZip,
      compareIds,
      toggleCompare,
      clearCompare,
    }),
    [priceMode, location, setLocationByZip, compareIds, toggleCompare, clearCompare],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences musí být uvnitř <PreferencesProvider>");
  return ctx;
}
