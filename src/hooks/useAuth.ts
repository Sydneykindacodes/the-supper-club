import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create profile on first sign-in
        if (session?.user) {
          const u = session.user;
          setTimeout(async () => {
            const { data: existing } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", u.id)
              .maybeSingle();
            if (!existing) {
              await supabase.from("profiles").insert({
                id: u.id,
                display_name:
                  u.user_metadata?.display_name ||
                  u.user_metadata?.full_name ||
                  u.email ||
                  "Member",
              });
            }
          }, 0);
        }
      }
    );

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
