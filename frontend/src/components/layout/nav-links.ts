import { Bot, Calculator, Map as MapIcon, Store, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  /** Krátký popis pod názvem v navigačním panelu. */
  hint: string;
  icon: LucideIcon;
  /** Krátký štítek vedle položky (např. technologie). */
  badge?: string;
}

/** Hlavní navigace webu – sdílí levý panel, mobilní menu i patičku. */
export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Mapa cen", hint: "Prodejci a ceny v okolí", icon: MapIcon },
  { href: "/kalkulacka", label: "Kalkulačka", hint: "Převody, sezóna, srovnání", icon: Calculator },
  { href: "/prodejci", label: "Prodejci", hint: "Katalog dodavatelů v ČR", icon: Store },
  { href: "/trendy", label: "Trh a trendy", hint: "Vývoj cen a kraje", icon: TrendingUp },
  { href: "/ci-studio", label: "CI Studio", hint: "AI analýza konkurence", icon: Bot, badge: "AI" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
