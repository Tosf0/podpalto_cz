import { CalculatorPage } from "@/components/calculator/calculator-page";

export const metadata = {
  title: "Kalkulačka & Srovnávač",
  description:
    "Převodník PRMS/PRM/PLM, kalkulačka sezónního nákupu včetně dopravy a srovnání prodejců pevných paliv.",
};

export default function Page() {
  return <CalculatorPage />;
}
