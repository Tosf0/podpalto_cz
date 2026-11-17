import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/auth-page";

export const metadata: Metadata = {
  title: "Přihlášení a registrace",
  description: "Založte si zdarma účet na podpalto.cz – mapa cen paliv, kalkulačka, prodejci a trendy.",
};

export default function PrihlaseniPage() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
