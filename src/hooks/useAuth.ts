import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

let bootstrapping: Promise<unknown> | null = null;

/**
 * No sign-in screen: every visitor gets a silent anonymous session so their
 * projects, chats and Studio commands are scoped to them automatically.
 */
async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  if (!bootstrapping) bootstrapping = supabase.auth.signInAnonymously();
  await bootstrapping;
  const { data: after } = await supabase.auth.getSession();
  return after.session;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) return;
      setSession(nextSession);
      setUser(nextSession.user);
      setLoading(false);
    });

    void ensureSession()
      .then((next) => {
        setSession(next ?? null);
        setUser(next?.user ?? null);
        if (!next) setError("Could not start a session. Refresh to try again.");
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Could not start a session.");
      })
      .finally(() => setLoading(false));

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, user, loading, error };
}
