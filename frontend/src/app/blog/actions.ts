"use server";

import { revalidateTag } from "next/cache";
import { getServerAccount } from "@/lib/supabase/server";

/** Po uložení článku v editoru: zneplatní cache blogu, aby se změna hned projevila na webu. */
export async function revalidateBlog(): Promise<void> {
  const account = await getServerAccount();
  if (!account || (account.role !== "editor" && account.role !== "admin")) return;
  revalidateTag("blog", { expire: 0 });
}
