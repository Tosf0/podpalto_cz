import { defineMessages } from "../core";

/** Texty oblasti „map“ (mapa) a sdílených komponent (`ui`). Čeština je zdroj pravdy, de/en musí mít stejné klíče. */
export const map = defineMessages({
  cs: {
    pin: { from: "od" },
    heat: { index: "index" },
    skeleton: { loading: "Načítám mapu…" },
    ui: {
      mockBadge: "Demo data",
      mockBadgeHint: "Běží bez databáze – data jsou ukázková. Nastavte NEXT_PUBLIC_SUPABASE_URL.",
      listLoading: "Načítání…",
      logoAria: "podpalto.cz – úvodní stránka",
      tagline: "Cenová mapa & CI tuhých paliv",
      region: "Kraj",
      allRegions: "Všechny kraje",
      illustration: "Ilustrace: {name}",
      ratingOnly: "hodnocení {rating} z 5",
    },
  },
  de: {
    pin: { from: "ab" },
    heat: { index: "Index" },
    skeleton: { loading: "Karte wird geladen…" },
    ui: {
      mockBadge: "Demodaten",
      mockBadgeHint: "Läuft ohne Datenbank – die Daten sind Beispieldaten. Setzen Sie NEXT_PUBLIC_SUPABASE_URL.",
      listLoading: "Wird geladen…",
      logoAria: "podpalto.cz – Startseite",
      tagline: "Preiskarte & CI für feste Brennstoffe",
      region: "Region",
      allRegions: "Alle Regionen",
      illustration: "Illustration: {name}",
      ratingOnly: "Bewertung {rating} von 5",
    },
  },
  en: {
    pin: { from: "from" },
    heat: { index: "index" },
    skeleton: { loading: "Loading map…" },
    ui: {
      mockBadge: "Demo data",
      mockBadgeHint: "Running without a database – data is sample data. Set NEXT_PUBLIC_SUPABASE_URL.",
      listLoading: "Loading…",
      logoAria: "podpalto.cz – home page",
      tagline: "Price map & CI for solid fuels",
      region: "Region",
      allRegions: "All regions",
      illustration: "Illustration: {name}",
      ratingOnly: "rating {rating} out of 5",
    },
  },
});
