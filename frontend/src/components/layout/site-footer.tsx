"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { useI18n } from "@/lib/i18n";
import { NAV_LINKS } from "./nav-links";

const DATA_LINKS = [
  { href: "/kalkulacka#metodika", key: "methodology" },
  { href: "/ci-studio", key: "api" },
] as const;

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="font-sans text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

const linkClass = "text-foreground/80 transition-colors hover:text-primary";

/** Slim patička: logo vlevo, tři stejně široké sloupce, tlumená drobná čeština dole. */
export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-4">
          <Logo compact />
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("layout.footer.tagline")}
          </p>
        </div>

        <FooterColumn title={t("layout.footer.tools")}>
          {NAV_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass}>
                {t(`layout.nav.${item.key}.label`)}
              </Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title={t("layout.footer.data")}>
          {DATA_LINKS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={linkClass}>
                {t(`layout.footer.${item.key}`)}
              </Link>
            </li>
          ))}
        </FooterColumn>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>{t("layout.footer.disclaimer")}</p>
          <p className="num">© 2026 podpalto.cz</p>
        </div>
      </div>
    </footer>
  );
}
