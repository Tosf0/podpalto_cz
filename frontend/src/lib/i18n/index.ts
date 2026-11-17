/**
 * Překlady UI (čeština, němčina, angličtina).
 *
 * Použití v komponentě:
 *   const { t, lang } = useI18n();
 *   t("layout.settings.title")
 *   t("common.sellers", { count: 3 })      // množné číslo podle Intl.PluralRules
 *   t("common.delivery.approx", { price: formatCzk(390) })
 *
 * Mimo React (helpery, konstanty volané při renderu) lze použít přímo `t()` – čte aktuální jazyk,
 * který nastavuje PreferencesProvider. Po změně jazyka se celá aplikace překreslí (klíč v AppProviders).
 *
 * Demo data (názvy a popisy prodejců, produkty, reporty) se NEpřekládají – zůstávají česky.
 */
export * from "./translate";
export { useI18n } from "./use-i18n";
