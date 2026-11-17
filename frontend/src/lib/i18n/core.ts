/**
 * Jádro překladů (bez Reactu): jazyky, typy slovníků, `defineMessages` a interpolace.
 *
 * Slovníky jsou po oblastech v `src/lib/i18n/messages/*.ts` – každý soubor exportuje
 * `{ cs, de, en }` se stejnou strukturou (čeština je zdroj pravdy, tvar hlídá TypeScript).
 */

export type Lang = "cs" | "de" | "en";

export interface LangMeta {
  code: Lang;
  /** Zkratka na přepínači. */
  short: string;
  /** Název jazyka v daném jazyce. */
  label: string;
  /** BCP 47 locale pro Intl formátování. */
  locale: string;
}

export const LANGS: LangMeta[] = [
  { code: "cs", short: "CZ", label: "Čeština", locale: "cs-CZ" },
  { code: "de", short: "DE", label: "Deutsch", locale: "de-DE" },
  { code: "en", short: "EN", label: "English", locale: "en-GB" },
];

export const DEFAULT_LANG: Lang = "cs";

export function localeOf(lang: Lang): string {
  return LANGS.find((l) => l.code === lang)?.locale ?? "cs-CZ";
}

/** Tvary pro množné číslo (Intl.PluralRules): cs používá one/few/many/other, de/en one/other. */
export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other: string;
}

export type MessageTree = { [key: string]: string | PluralForms | MessageTree };

/** Stejné klíče jako T; texty libovolné, plurály s tvary daného jazyka (de/en nemají few/many). */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends PluralForms ? PluralForms : Shape<T[K]>;
};

/** Slovník oblasti: čeština určuje tvar, němčina a angličtina ho musí dodržet. */
export function defineMessages<T extends MessageTree>(m: { cs: T; de: Shape<NoInfer<T>>; en: Shape<NoInfer<T>> }) {
  return m;
}

/** Všechny cesty ke koncovým textům, např. "layout.nav.map.label". */
export type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends PluralForms
      ? `${P}${K}`
      : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Vars = Record<string, string | number>;

export function isPluralForms(v: unknown): v is PluralForms {
  return typeof v === "object" && v !== null && "one" in v && "other" in v;
}

export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function pickPlural(forms: PluralForms, count: number, locale: string): string {
  const cat = new Intl.PluralRules(locale).select(count) as keyof PluralForms;
  return forms[cat] ?? forms.other;
}
