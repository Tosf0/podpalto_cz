import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CiStudio } from "@/components/ci/ci-studio";
import { getServerAccount } from "@/lib/supabase/server";
import { LOGIN_PATH, PLANS_PATH, SUPABASE_ENABLED } from "@/lib/supabase/config";

export const metadata = { title: "CI Studio – analýza konkurence" };

/** CI Studio je jen pro tarif Pro (nebo admina). Ostatní přesměruje na ceník. Data navíc chrání RLS. */
async function ProGate({ children }: { children: React.ReactNode }) {
  if (!SUPABASE_ENABLED) return children;
  const account = await getServerAccount();
  if (!account) redirect(`${LOGIN_PATH}?next=/ci-studio`);
  if (account.plan !== "pro" && account.role !== "admin") redirect(`${PLANS_PATH}?feature=ci`);
  return children;
}

export default function CiStudioPage() {
  return (
    <Suspense fallback={null}>
      <ProGate>
        <CiStudio />
      </ProGate>
    </Suspense>
  );
}
