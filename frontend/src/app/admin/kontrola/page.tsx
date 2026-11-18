import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/account/admin-page";
import { getServerAccount } from "@/lib/supabase/server";
import { LOGIN_PATH, SUPABASE_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Administrace", robots: { index: false, follow: false } };

/** Administrace – jen role admin (data navíc chrání RLS a kontrola v RPC). `?sekce=data` otevře kontrolu dat. */
async function AdminGate({ searchParams }: { searchParams: Promise<{ sekce?: string | string[] }> }) {
  if (!SUPABASE_ENABLED) redirect("/");
  const [account, params] = await Promise.all([getServerAccount(), searchParams]);
  if (!account) redirect(`${LOGIN_PATH}?next=/admin/kontrola`);
  if (account.role !== "admin") redirect("/");
  return <AdminPage initialTab={params.sekce === "data" ? "data" : "blog"} />;
}

export default function AdminKontrolaPage({ searchParams }: PageProps<"/admin/kontrola">) {
  return (
    <Suspense fallback={null}>
      <AdminGate searchParams={searchParams} />
    </Suspense>
  );
}
