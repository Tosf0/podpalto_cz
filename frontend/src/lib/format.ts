/**
 * Formátovače čísel, měn, jednotek a dat – řídí se zvoleným jazykem (locale) a měnou.
 *
 * Všechny ceny v datech a API jsou v Kč (CZK). Při měně EUR se při ZOBRAZENÍ přepočítají
 * kurzem `eurRate` (Kč za 1 €). Nastavení drží `setFormatSettings` (volá PreferencesProvider)
 * a po změně se aplikace překreslí (viz `AppProviders`).
 */

import { getCurrentLang, t } from "@/lib/i18n/translate";

export type Currency = "CZK" | "EUR";

export interface FormatSettings {
  /** BCP 47 locale, např. "cs-CZ", "de-DE", "en-GB". */
  locale: string;
  currency: Currency;
  /** Kolik Kč stojí 1 €. */
  eurRate: number;
}

/**
 * Výchozí kurz ČNB vyhlášený 16. 11. 2026: 1 € = 24,430 Kč.
 * Přepsatelné proměnnou NEXT_PUBLIC_EUR_CZK_RATE (backend může později dodávat aktuální kurz).
 */
export const DEFAULT_EUR_RATE = Number(process.env.NEXT_PUBLIC_EUR_CZK_RATE) || 24.43;
export const EUR_RATE_SOURCE = "ČNB, 16. 11. 2026";

let settings: FormatSettings = { locale: "cs-CZ", currency: "CZK", eurRate: DEFAULT_EUR_RATE };

export function setFormatSettings(next: Partial<FormatSettings>): void {
  settings = { ...settings, ...next };
}

export function getFormatSettings(): FormatSettings {
  return settings;
}

/** Nezlomitelná mezera – drží „1 490 Kč“ pohromadě. */
export const NBSP = " ";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat(settings.locale, { minimumFractionDigits: min, maximumFractionDigits: max });

/* ------------------------------------------------------------------ */
/* Měna                                                                */
/* ------------------------------------------------------------------ */

/** Symbol měny: „Kč“ nebo „€“. */
export function currencySymbol(): string {
  return settings.currency === "EUR" ? "€" : "Kč";
}

/** Popisek jednotky ceny: „Kč/PRMS“ / „€/PRMS“ (bez unit jen symbol). */
export function moneyUnit(unit?: string): string {
  return unit ? `${currencySymbol()}/${unit}` : currencySymbol();
}

/** Převod částky v Kč do zobrazované měny (číslo). */
export function toDisplayCurrency(czk: number): number {
  return settings.currency === "EUR" ? czk / settings.eurRate : czk;
}

/** Převod částky zadané v zobrazované měně zpět na Kč (pro inputy). */
export function fromDisplayCurrency(value: number): number {
  return settings.currency === "EUR" ? value * settings.eurRate : value;
}

/** Počet desetinných míst pro částku v zobrazované měně. */
function moneyDigits(display: number): number {
  if (settings.currency === "CZK") return 0;
  return Math.abs(display) < 100 ? 2 : 0;
}

/** Jen číslo částky (převedené do zobrazované měny), bez symbolu: 1890 Kč → „1 890“ / „77,36“. */
export function formatMoneyNumber(czk: number | null | undefined): string {
  if (czk == null || !Number.isFinite(czk)) return "–";
  const v = toDisplayCurrency(czk);
  const d = moneyDigits(v);
  return nf(d, d).format(d === 0 ? Math.round(v) : v);
}

/** Částka v Kč → „1 890 Kč“ nebo „77,36 €“. */
export function formatCzk(czk: number | null | undefined): string {
  if (czk == null || !Number.isFinite(czk)) return "–";
  return `${formatMoneyNumber(czk)}${NBSP}${currencySymbol()}`;
}

/** Alias s jasnějším názvem. */
export const formatMoney = formatCzk;

/**
 * Krátký popisek jednotky: PRMS/PRM/PLM/t/kg zůstávají, „paleta“ a „pytel“ se překládají
 * (němčina s velkým písmenem – podstatná jména).
 */
export function unitLabel(unit: string): string {
  if (unit !== "paleta" && unit !== "pytel") return unit;
  const label = t(`common.units.${unit}`);
  return getCurrentLang() === "de" ? label : label.toLowerCase();
}

/** 1490, "PRMS" → „1 490 Kč/PRMS“ / „60,99 €/PRMS“; „paleta“ → „€/pallet“ / „Kč/Palette“ */
export function formatCzkPerUnit(czk: number | null | undefined, unit: string): string {
  if (czk == null || !Number.isFinite(czk)) return "–";
  return `${formatCzk(czk)}/${unitLabel(unit)}`;
}

/** Cena za kWh: „1,52 Kč/kWh“ / „0,062 €/kWh“ */
export function formatKwhPrice(czkPerKwh: number | null | undefined): string {
  if (czkPerKwh == null || !Number.isFinite(czkPerKwh)) return "–";
  const v = toDisplayCurrency(czkPerKwh);
  const d = settings.currency === "EUR" ? 3 : 2;
  return `${nf(d, d).format(v)}${NBSP}${currencySymbol()}/kWh`;
}

/** Jen číslo ceny za kWh (bez jednotky) – např. pro osy grafů. */
export function formatKwhNumber(czkPerKwh: number): string {
  const v = toDisplayCurrency(czkPerKwh);
  const d = settings.currency === "EUR" ? 3 : 2;
  return nf(d, d).format(v);
}

/* ------------------------------------------------------------------ */
/* Čísla a jednotky                                                    */
/* ------------------------------------------------------------------ */

/** Číslo (NE peníze – pro ceny použijte formatMoneyNumber): 12500 → „12 500“ */
export function formatNumber(value: number, fractionDigits = 0): string {
  return nf(fractionDigits, fractionDigits).format(value);
}

/** 12.34 → „12 km“, 0.4 → „< 1 km“ */
export function formatKm(value: number): string {
  if (value < 1) return `<${NBSP}1${NBSP}km`;
  return `${nf(0, 0).format(Math.round(value))}${NBSP}km`;
}

/** 2.345 → „+2,3 %“, -1.2 → „−1,2 %“ */
export function formatPct(value: number, withSign = true): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${withSign ? sign : ""}${nf(0, 1).format(Math.abs(value))}${NBSP}%`;
}

/** 1234 → „1 234 kWh“ */
export function formatKwh(value: number): string {
  return `${nf(0, 0).format(Math.round(value))}${NBSP}kWh`;
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

/** ISO → „16. 11. 2026“ / „16.11.2026“ / „16/11/2026“ */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, { day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

/** ISO → datum a čas */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(settings.locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const CS_MONTHS_SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

/** "2026-11" → „lis 26“ / „Nov. 26“ / „Nov 26“ */
export function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (settings.locale.startsWith("cs")) return `${CS_MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
  const month = new Intl.DateTimeFormat(settings.locale, { month: "short" }).format(new Date(Date.UTC(y, m - 1, 15)));
  return `${month} ${String(y).slice(2)}`;
}

const CS_MONTHS_GENITIVE = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
];

/** "2026-02" → „února 2026“ (cs, 2. pád) / „February 2026“ / „Februar 2026“ */
export function formatMonthGenitive(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  if (settings.locale.startsWith("cs")) return `${CS_MONTHS_GENITIVE[m - 1]} ${y}`;
  return new Intl.DateTimeFormat(settings.locale, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
}

/** Relativní čas: „před 3 dny“ / „vor 3 Tagen“ / „3 days ago“ */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(settings.locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

/**
 * Skloňování (jen čeština): plural(3, "prodejce", "prodejci", "prodejců") → „prodejci“.
 * Pro vícejazyčné texty použijte `t(key, { count })` z `@/lib/i18n`.
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
