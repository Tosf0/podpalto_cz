"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/common/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_LINKS, isActivePath } from "./nav-links";
import { SettingsDialog } from "./settings-dialog";

/** Šířka bočních panelů – levá navigace a pravý panel filtrů sdílí stejnou hodnotu (symetrie). */
export const SIDE_PANEL_WIDTH = "w-[clamp(240px,20vw,312px)]";

const subscribe = () => () => {};

/** Ikonové tlačítko pro tmavý panel. */
function PanelIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 items-center justify-center rounded-xl text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none [&_svg]:size-[18px]"
    >
      {children}
    </button>
  );
}

const widgetButton =
  "flex h-9 items-center justify-center gap-2 rounded-xl text-xs font-medium text-sidebar-foreground/85 transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none [&_svg]:size-4";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="flex h-full flex-col">
      {/* Hlavička – stejná výška (72 px) jako hlavička pravého panelu */}
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-sidebar-border pr-3 pl-5">
        <Logo tone="inverted" compact className="min-w-0" />
        <PanelIconButton
          label={mounted ? (isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim") : "Přepnout motiv"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
        </PanelIconButton>
      </div>

      {/* Navigace – posouvá se, patička zůstává dole */}
      <nav aria-label="Hlavní navigace" className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">Menu</p>
        <ul className="space-y-1">
          {NAV_LINKS.map(({ href, label, hint, icon: Icon, badge }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors [&_svg]:size-[18px]",
                      active ? "bg-white/45" : "bg-white/[0.06] group-hover:bg-white/10",
                    )}
                  >
                    <Icon aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {label}
                      {badge && (
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-px text-[10px] font-bold tracking-wide",
                            active ? "bg-sidebar-primary-foreground/10" : "bg-white/10",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-[11px]",
                        active ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/50",
                      )}
                    >
                      {hint}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Patička panelu: nastavení přes celou šířku, pod ním účet a odhlášení */}
      <div className="shrink-0 space-y-3 border-t border-sidebar-border p-4">
        <button type="button" onClick={() => setSettingsOpen(true)} className={cn(widgetButton, "h-11 w-full bg-sidebar-accent text-sm")}>
          <Settings aria-hidden />
          Nastavení
        </button>

        <div className="flex items-center gap-3 px-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            CH
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-sidebar-foreground">Chalupář</span>
            <span className="block truncate text-[11px] text-sidebar-foreground/55">Demo účet</span>
          </span>
          <PanelIconButton
            label="Odhlásit se"
            onClick={() =>
              toast("Přihlašování zatím není zapojené", {
                description: "Odhlášení bude fungovat po napojení uživatelských účtů.",
              })
            }
          >
            <LogOut aria-hidden />
          </PanelIconButton>
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

/**
 * Levý navigační panel (desktop, ~1/5 šířky) + horní lišta s menu na mobilu.
 */
export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 bg-sidebar text-sidebar-foreground lg:block",
          SIDE_PANEL_WIDTH,
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobil: horní lišta */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <Logo tone="inverted" compact />
        <PanelIconButton label="Otevřít menu" onClick={() => setOpen(true)}>
          <Menu aria-hidden />
        </PanelIconButton>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[300px] border-none bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigace a nastavení</SheetDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
