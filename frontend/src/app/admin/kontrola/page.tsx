import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReviewQueuePage } from "@/components/account/review-queue-page";
import { getServerAccount } from "@/lib/supabase/server";
import { LOGIN_PATH, SUPABASE_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Kontrola dat", robots: { index: false, follow: false } };

/** Fronta ruční kontroly – jen role admin (data navíc chrání RLS a kontrola v RPC). */
async function AdminGate({ children }: { children: React.ReactNode }) {
  if (!SUPABASE_ENABLED) redirect("/");
  const account = await getServerAccount();
  if (!account) redirect(`${LOGIN_PATH}?next=/admin/kontrola`);
  if (account.role !== "admin") redirect("/");
  return children;
}

export default function AdminKontrolaPage() {
  return (
    <Suspense fallback={null}>
      <AdminGate>
        <ReviewQueuePage />
      </AdminGate>
    </Suspense>
  );
}
