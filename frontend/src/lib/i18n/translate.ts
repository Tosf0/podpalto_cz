/** Překladové funkce bez Reactu (bezpečné pro import z lib/ i konstant). */
import {
  DEFAULT_LANG,
  LANGS,
  interpolate,
  isPluralForms,
  localeOf,
  pickPlural,
  type Lang,
  type Leaves,
  type MessageTree,
  type Vars,
} from "./core";
import { MESSAGES, type Messages } from "./messages";

export { LANGS, DEFAULT_LANG, localeOf, type Lang, type LangMeta } from "./core";

export type MessageKey = Leaves<Messages>;

let currentLang: Lang = DEFAULT_LANG;

/** Nastaví jazyk pro `t()` mimo React (volá PreferencesProvider). */
export function setCurrentLang(lang: Lang): void {
  currentLang = lang;
}

export function getCurrentLang(): Lang {
  return currentLang;
}

export function isLang(v: unknown): v is Lang {
  return LANGS.some((l) => l.code === v);
}

function lookup(tree: MessageTree, key: string): unknown {
  let node: unknown = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Přeloží klíč do daného jazyka (fallback: čeština → samotný klíč). */
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  let node = lookup(MESSAGES[lang] as MessageTree, key);
  if (node === undefined && lang !== "cs") node = lookup(MESSAGES.cs as MessageTree, key);
  if (typeof node === "string") return interpolate(node, vars);
  if (isPluralForms(node)) {
    const count = typeof vars?.count === "number" ? vars.count : Number(vars?.count ?? 0);
    return interpolate(pickPlural(node, count, localeOf(lang)), vars);
  }
  if (process.env.NODE_ENV !== "production") console.warn(`[i18n] chybí klíč: ${key}`);
  return key;
}

/** Přeloží klíč do aktuálního jazyka. */
export function t(key: MessageKey, vars?: Vars): string {
  return translate(currentLang, key, vars);
}

export type TFunction = typeof t;

