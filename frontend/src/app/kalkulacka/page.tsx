import type { Metadata } from "next";
import { CalculatorPage } from "@/components/calculator/calculator-page";

export const metadata: Metadata = {
  title: "Kalkulačka & Srovnávač",
  description:
    "Převodník PRMS/PRM/PLM, kalkulačka sezónního nákupu včetně dopravy a srovnání prodejců pevných paliv.",
  // za přihlášením – neindexovat
  robots: { index: false, follow: true },
};

export default function Page() {
  return <CalculatorPage />;
}
