import { Bot, Calculator, Map as MapIcon, Newspaper, Store, TrendingUp, type LucideIcon } from "lucide-react";

export type NavKey = "map" | "calculator" | "sellers" | "trends" | "blog" | "ci";

export interface NavLink {
  href: string;
  /** Klíč do `layout.nav.<key>.label` / `.hint` (viz src/lib/i18n/messages/layout.ts). */
  key: NavKey;
  icon: LucideIcon;
  /** Krátký štítek vedle položky (např. technologie). */
  badge?: string;
}

/** Hlavní navigace webu – sdílí levý panel, mobilní menu i patičku. */
export const NAV_LINKS: NavLink[] = [
  { href: "/", key: "map", icon: MapIcon },
  { href: "/kalkulacka", key: "calculator", icon: Calculator },
  { href: "/prodejci", key: "sellers", icon: Store },
  { href: "/trendy", key: "trends", icon: TrendingUp },
  { href: "/blog", key: "blog", icon: Newspaper },
  { href: "/ci-studio", key: "ci", icon: Bot, badge: "AI" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
