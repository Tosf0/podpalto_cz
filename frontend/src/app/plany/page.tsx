import { Suspense } from "react";
import type { Metadata } from "next";
import { PlansPage } from "@/components/account/plans-page";

export const metadata: Metadata = {
  title: "Tarify",
  description: "Zdarma, Pro s analýzou konkurence, nebo účet pro prodejce paliv.",
  alternates: { canonical: "/plany" },
};

export default function PlanyPage() {
  return (
    <Suspense fallback={null}>
      <PlansPage />
    </Suspense>
  );
}
