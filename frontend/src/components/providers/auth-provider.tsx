"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { PlanTier, UserProfile } from "@/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { SUPABASE_ENABLED } from "@/lib/supabase/config";
import { invalidate as invalidateApiCache } from "@/lib/api/db";

/**
 * Přihlášený uživatel (Supabase Auth) + jeho profil z tabulky `profiles` (tarif, role, jméno).
 * V demo režimu (bez Supabase) je `enabled = false` a aplikace se chová jako dřív.
 */
interface AuthValue {
  /** Supabase je zapnutý – přihlášení je povinné. */
  enabled: boolean;
  /** Načítá se session / profil. */
  loading: boolean;
  user: User | null;
  profile: UserProfile | null;
  /** Efektivní tarif (po vypršení `plan_expires_at` = free). */
  plan: PlanTier;
  isPro: boolean;
  isEditor: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const PROFILE_COLUMNS = "id, email, full_name, avatar_url, phone, plan, plan_expires_at, role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(SUPABASE_ENABLED);

  const loadProfile = useCallback(async (u: User | null) => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !u) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", u.id).maybeSingle();
    setProfile((data as UserProfile | null) ?? null);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user);
      await loadProfile(data.user);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const next = session?.user ?? null;
      setUser(next);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        invalidateApiCache();
        void loadProfile(next);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    invalidateApiCache();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const expired = profile?.plan_expires_at ? new Date(profile.plan_expires_at) < new Date() : false;
    const plan: PlanTier = profile && !expired ? profile.plan : "free";
    const isAdmin = profile?.role === "admin";
    return {
      enabled: SUPABASE_ENABLED,
      loading,
      user,
      profile,
      plan,
      isPro: plan === "pro" || isAdmin,
      isEditor: isAdmin || profile?.role === "editor",
      isAdmin,
      refreshProfile,
      signOut,
    };
  }, [loading, user, profile, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth musí být uvnitř <AuthProvider>");
  return ctx;
}

/** Iniciály pro avatar („Jana Nováková“ → „JN“, e-mail → první písmeno). */
export function initialsOf(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || source.slice(0, 2).toUpperCase();
}
