import type { Metadata } from "next";
import { SellersCatalog } from "@/components/sellers/sellers-catalog";

export const metadata: Metadata = {
  title: "Prodejci palivového dřeva, pelet a uhlí",
  description:
    "Katalog prodejců tuhých paliv v ČR: ceník, doprava, hydraulická ruka, osobní odběr a hodnocení zákazníků na jednom místě.",
  alternates: { canonical: "/prodejci" },
  openGraph: { url: "/prodejci", title: "Prodejci palivového dřeva, pelet a uhlí v ČR" },
};

export default function ProdejciPage() {
  return <SellersCatalog />;
}
