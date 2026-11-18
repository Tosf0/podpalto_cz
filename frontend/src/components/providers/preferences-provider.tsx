"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { PriceMode, RegionCode, UserLocation } from "@/types";
import { DEFAULT_LOCATION, ZIP_PREFIX_LOCATIONS } from "@/lib/constants";
import { setFormatSettings, type Currency } from "@/lib/format";
import { DEFAULT_LANG, isLang, localeOf, setCurrentLang, type Lang } from "@/lib/i18n/translate";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "./auth-provider";

/**
 * Globální uživatelské preference:
 * - priceMode: zobrazení ceny za jednotku (PRMS/t) vs. Kč/kWh
 * - location: výchozí poloha uživatele (pro vzdálenosti a dopravu)
 * - compareIds: prodejci vybraní k porovnání
 * - lang / currency: jazyk UI a měna zobrazení
 * - mapShowRegions / mapStripOpen: stav mapy (vrstva krajů, pás průměrných cen); vrstva krajů je
 *   po otevření vždy zapnutá – uložená hodnota se neobnovuje
 * - motiv (light/dark) drží next-themes, ukládá se sem spolu s ostatním
 *
 * Přihlášenému uživateli se vše ukládá do tabulky `user_preferences` (platí na všech zařízeních),
 * localStorage slouží jako rychlá mezipaměť a pro demo režim bez Supabase.
 */
interface PreferencesValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  priceMode: PriceMode;
  setPriceMode: (m: PriceMode) => void;
  location: UserLocation;
  setLocation: (l: UserLocation) => void;
  /** Nastaví lokalitu podle PSČ. Vrací `false`, pokud PSČ nelze rozpoznat. */
  setLocationByZip: (zip: string) => boolean;
  compareIds: string[];
  toggleCompare: (sellerId: string) => void;
  clearCompare: () => void;
  mapShowRegions: boolean;
  setMapShowRegions: (v: boolean) => void;
  mapStripOpen: boolean;
  setMapStripOpen: (v: boolean) => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

const STORAGE_KEY = "podpalto:prefs:v1";
const MAX_COMPARE = 4;
const SAVE_DEBOUNCE_MS = 600;

type Saved = Partial<Pick<PreferencesValue, "priceMode" | "location" | "compareIds" | "lang" | "currency" | "mapShowRegions" | "mapStripOpen">>;

interface PreferencesRow {
  lang: Lang;
  currency: Currency;
  price_mode: PriceMode;
  theme: "light" | "dark" | "system";
  location_label: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_zip: string | null;
  location_region: RegionCode | null;
  compare_seller_ids: string[];
  map_show_regions: boolean;
  map_strip_open: boolean;
}

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
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { theme, setTheme } = useTheme();
  const [priceMode, setPriceMode] = useState<PriceMode>("unit");
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [currency, setCurrency] = useState<Currency>("CZK");
  // teplotní mapa krajů je po každém otevření aplikace zapnutá; vypnutí platí jen do zavření stránky
  // (proto se neobnovuje z localStorage ani z databáze)
  const [mapShowRegions, setMapShowRegions] = useState(true);
  const [mapStripOpen, setMapStripOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  /** Uživatel, jehož preference už jsou načtené z databáze (teprve pak se ukládají zpět). */
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);

  // 1) localStorage až po hydrataci (žádný mismatch SSR/CSR)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Saved;
        /* eslint-disable react-hooks/set-state-in-effect */
        if (saved.priceMode === "unit" || saved.priceMode === "kwh") setPriceMode(saved.priceMode);
        if (saved.location?.lat && saved.location?.lng) setLocation(saved.location);
        if (Array.isArray(saved.compareIds)) setCompareIds(saved.compareIds.slice(0, MAX_COMPARE));
        if (isLang(saved.lang)) setLang(saved.lang);
        if (saved.currency === "CZK" || saved.currency === "EUR") setCurrency(saved.currency);
        if (typeof saved.mapStripOpen === "boolean") setMapStripOpen(saved.mapStripOpen);
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ priceMode, location, compareIds, lang, currency, mapShowRegions, mapStripOpen }),
      );
    } catch {
      /* ignorovat */
    }
  }, [hydrated, priceMode, location, compareIds, lang, currency, mapShowRegions, mapStripOpen]);

  // `setTheme` z next-themes mění identitu při každé změně motivu – kdyby byl v závislostech
  // efektu níže, každé přepnutí by znovu načetlo (ještě neuložený) motiv z databáze a vrátilo ho zpět.
  const setThemeRef = useRef(setTheme);
  useEffect(() => {
    setThemeRef.current = setTheme;
  }, [setTheme]);

  // 2) přihlášený uživatel: načíst preference z databáze (mají přednost před localStorage) – jen jednou po přihlášení
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!hydrated || !supabase || !userId) return;
    let cancelled = false;
    void supabase
      .from("user_preferences")
      .select("lang, currency, price_mode, theme, location_label, location_lat, location_lng, location_zip, location_region, compare_seller_ids, map_show_regions, map_strip_open")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as PreferencesRow | null;
        if (row) {
          if (isLang(row.lang)) setLang(row.lang);
          setCurrency(row.currency);
          setPriceMode(row.price_mode);
          if (row.location_lat != null && row.location_lng != null) {
            setLocation({
              label: row.location_label ?? DEFAULT_LOCATION.label,
              lat: row.location_lat,
              lng: row.location_lng,
              zip: row.location_zip ?? undefined,
              region: row.location_region ?? undefined,
            });
          }
          setCompareIds((row.compare_seller_ids ?? []).slice(0, MAX_COMPARE));
          setMapStripOpen(row.map_strip_open);
          if (row.theme === "light" || row.theme === "dark" || row.theme === "system") setThemeRef.current(row.theme);
        }
        setSyncedUserId(userId);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, userId]);

  // 3) změny ukládat do databáze (s krátkým zpožděním, ať se neposílá každé kliknutí zvlášť)
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !userId || syncedUserId !== userId) return;
    const handle = setTimeout(() => {
      void supabase.from("user_preferences").upsert({
        user_id: userId,
        lang,
        currency,
        price_mode: priceMode,
        theme: theme === "dark" || theme === "light" ? theme : "system",
        location_label: location.label.slice(0, 200),
        location_lat: location.lat,
        location_lng: location.lng,
        location_zip: location.zip ?? null,
        location_region: location.region ?? null,
        compare_seller_ids: compareIds.slice(0, MAX_COMPARE),
        map_show_regions: mapShowRegions,
        map_strip_open: mapStripOpen,
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [userId, syncedUserId, lang, currency, priceMode, theme, location, compareIds, mapShowRegions, mapStripOpen]);

  // jazyk dokumentu (čtečky obrazovky, dělení slov)
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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

  // Formátovače a `t()` mimo React čtou modulové nastavení – musí platit už během tohoto renderu.
  setCurrentLang(lang);
  setFormatSettings({ locale: localeOf(lang), currency });

  const value = useMemo<PreferencesValue>(
    () => ({
      lang,
      setLang,
      currency,
      setCurrency,
      priceMode,
      setPriceMode,
      location,
      setLocation,
      setLocationByZip,
      compareIds,
      toggleCompare,
      clearCompare,
      mapShowRegions,
      setMapShowRegions,
      mapStripOpen,
      setMapStripOpen,
    }),
    [lang, currency, priceMode, location, setLocationByZip, compareIds, toggleCompare, clearCompare, mapShowRegions, mapStripOpen],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

/**
 * Po změně jazyka nebo měny znovu připojí obsah stránky, aby se přepočítaly i memoizované
 * hodnoty (formátované ceny, popisky grafů). Kostra (navigace, otevřené Nastavení) zůstává.
 */
export function PreferencesRemountBoundary({ children }: { children: React.ReactNode }) {
  const { lang, currency } = usePreferences();
  return <Fragment key={`${lang}-${currency}`}>{children}</Fragment>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences musí být uvnitř <PreferencesProvider>");
  return ctx;
}
