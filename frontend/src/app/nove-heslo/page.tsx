import type { Metadata } from "next";
import { NewPasswordPage } from "@/components/auth/new-password-page";

export const metadata: Metadata = { title: "Nové heslo", robots: { index: false } };

export default function NoveHesloPage() {
  return <NewPasswordPage />;
}
