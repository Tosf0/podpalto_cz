import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPage } from "@/components/account/admin-page";
import { getServerAccount } from "@/lib/supabase/server";
import { LOGIN_PATH, SUPABASE_ENABLED } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Administrace", robots: { index: false, follow: false } };

/**
 * Administrace – admin (vše) a editor (jen správa blogu). Data navíc chrání RLS a kontroly v RPC.
 * `?sekce=data` / `?sekce=nastaveni` otevře záložku (jen admin).
 */
async function AdminGate({ searchParams }: { searchParams: Promise<{ sekce?: string | string[] }> }) {
  if (!SUPABASE_ENABLED) redirect("/");
  const [account, params] = await Promise.all([getServerAccount(), searchParams]);
  if (!account) redirect(`${LOGIN_PATH}?next=/admin/kontrola`);
  if (account.role !== "admin" && account.role !== "editor") redirect("/");
  const tab = account.role === "admin" && (params.sekce === "data" || params.sekce === "nastaveni") ? params.sekce : "blog";
  return <AdminPage role={account.role} initialTab={tab} />;
}

export default function AdminKontrolaPage({ searchParams }: PageProps<"/admin/kontrola">) {
  return (
    <Suspense fallback={null}>
      <AdminGate searchParams={searchParams} />
    </Suspense>
  );
}
