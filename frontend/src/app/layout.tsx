import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { SITE_URL } from "@/lib/blog/utils";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
});

/** Teplé patkové písmo pro nadpisy (Lora – plná čeština, klasické tvary všech písmen). */
const lora = Lora({
  variable: "--font-heading-serif",
  subsets: ["latin", "latin-ext"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "podpalto.cz – Cenová mapa tuhých paliv v ČR",
    template: "%s | podpalto.cz",
  },
  description:
    "Najděte nejvýhodnější palivové dřevo, pelety, brikety a uhlí ve svém okolí. Ceny vč. dopravy, přepočet na Kč/kWh a analýza trhu.",
  applicationName: "podpalto.cz",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#161a16" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" suppressHydrationWarning className={`${jakarta.variable} ${lora.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <AppShell footer={<SiteFooter />}>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
