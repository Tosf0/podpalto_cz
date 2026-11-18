import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Lora, Plus_Jakarta_Sans } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { SITE_DESCRIPTION, SITE_INDEXABLE, SITE_NAME, SITE_URL, SITE_VERIFICATION, jsonLd, siteJsonLd } from "@/lib/seo";

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
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  // indexace jen na ostré doméně (viz src/lib/seo.ts)
  robots: SITE_INDEXABLE
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "cs_CZ",
    url: "/",
    title: "podpalto.cz – Cenová mapa tuhých paliv v ČR",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google: SITE_VERIFICATION.google,
    other: SITE_VERIFICATION.bing ? { "msvalidate.01": SITE_VERIFICATION.bing } : undefined,
  },
  category: "shopping",
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteJsonLd()) }} />
        <AppProviders>
          <AppShell footer={<SiteFooter />}>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
