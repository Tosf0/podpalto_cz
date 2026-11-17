"use client";

import { usePathname } from "next/navigation";
import { PreferencesRemountBoundary } from "@/components/providers/preferences-provider";
import { AppSidebar } from "./app-sidebar";

/**
 * Kostra aplikace: levý navigační panel + obsah.
 * Úvodní mapa je celoobrazovková (bez patičky); ostatní stránky se posouvají v pravé části
 * a končí patičkou.
 */
export function AppShell({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const pathname = usePathname();
  const fullscreen = pathname === "/";

  // Přihlášení / registrace: samostatná stránka bez navigace
  if (pathname.startsWith("/prihlaseni")) {
    return <PreferencesRemountBoundary>{children}</PreferencesRemountBoundary>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:h-dvh lg:flex-row lg:overflow-hidden">
      <AppSidebar />
      <div
        id="app-scroll"
        className="flex min-w-0 flex-1 flex-col lg:h-dvh lg:overflow-y-auto"
      >
        <main className="flex flex-1 flex-col">
          <PreferencesRemountBoundary>{children}</PreferencesRemountBoundary>
        </main>
        {!fullscreen && footer}
      </div>
    </div>
  );
}
