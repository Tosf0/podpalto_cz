"use client";

import { useCallback } from "react";
import { usePreferences } from "@/components/providers/preferences-provider";
import { localeOf, type Lang, type Vars } from "./core";
import { translate, type MessageKey } from "./translate";

/** Hook pro překlady v komponentách: `const { t, lang, locale } = useI18n()`. */
export function useI18n(): { t: (key: MessageKey, vars?: Vars) => string; lang: Lang; locale: string } {
  const { lang } = usePreferences();
  const t = useCallback((key: MessageKey, vars?: Vars) => translate(lang, key, vars), [lang]);
  return { t, lang, locale: localeOf(lang) };
}
