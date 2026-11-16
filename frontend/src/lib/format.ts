/** Formátovače čísel, měn a jednotek pro český trh (cs-CZ). */

const czk0 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
const num2 = new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Nezlomitelná mezera – drží „1 490 Kč“ pohromadě. */
export const NBSP = " ";

/** 1490 → „1 490 Kč“ */
export function formatCzk(value: number): string {
  return `${czk0.format(Math.round(value))}${NBSP}Kč`;
}

/** 1490, "PRMS" → „1 490 Kč/PRMS“ */
export function formatCzkPerUnit(value: number, unit: string): string {
  return `${formatCzk(value)}/${unit}`;
}

/** 1.524 → „1,52 Kč/kWh“ */
export function formatKwhPrice(value: number): string {
  return `${num2.format(value)}${NBSP}Kč/kWh`;
}

/** Celé číslo s mezerami tisíců: 12500 → „12 500“ */
export function formatNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** 12.34 → „12 km“, 0.4 → „< 1 km“ */
export function formatKm(value: number): string {
  if (value < 1) return `<${NBSP}1${NBSP}km`;
  return `${czk0.format(Math.round(value))}${NBSP}km`;
}

/** 2.345 → „+2,3 %“, -1.2 → „−1,2 %“ */
export function formatPct(value: number, withSign = true): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${withSign ? sign : ""}${num1.format(Math.abs(value))}${NBSP}%`;
}

/** 1234 → „1 234 kWh“ */
export function formatKwh(value: number): string {
  return `${czk0.format(Math.round(value))}${NBSP}kWh`;
}

/** ISO → „16. 11. 2026“ */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }).format(
    new Date(iso),
  );
}

/** ISO → „16. 11. 2026 14:05“ */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const MONTHS_SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];

/** "2026-11" → „lis 26“ */
export function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
}

const MONTHS_GENITIVE = [
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

/** "2026-02" → „února 2026“ (pro věty typu „nejvíc od února 2026“) */
export function formatMonthGenitive(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return `${MONTHS_GENITIVE[m - 1]} ${y}`;
}

/** Relativní čas: „před 3 dny“ */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("cs-CZ", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
}

/** Skloňování: plural(3, "prodejce", "prodejci", "prodejců") → „prodejci“ */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
