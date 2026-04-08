"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";

interface AuthUser {
  id: string;          // = company_id
  email: string;
  company_name?: string;
  plan?: string;
  status?: string;
  messages_used_month?: number;
  trial_ends_at?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function loadUser() {
    try {
      const { data: { user: authUser } } = await sb.auth.getUser();
      if (!authUser) { setUser(null); return; }

      const { data: company } = await sb
        .from("companies")
        .select("name, plan, status, messages_used_month, trial_ends_at")
        .eq("id", authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email ?? "",
        company_name: company?.name,
        plan: company?.plan,
        status: company?.status,
        messages_used_month: company?.messages_used_month,
        trial_ends_at: company?.trial_ends_at,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await sb.auth.signOut();
    document.cookie = "reativa_session=; path=/; max-age=0";
    window.location.href = "/login";
  }

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") loadUser();
      if (event === "SIGNED_OUT") { setUser(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: loadUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
