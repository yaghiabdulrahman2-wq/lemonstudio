import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

let bootstrapping: Promise<unknown> | null = null;

/**
 * Sign-in is optional: every visitor gets a silent anonymous session so their
 * projects work immediately, and they can upgrade it to a real account (email +
 * password) at any point without losing anything.
 */
async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  if (!bootstrapping) bootstrapping = supabase.auth.signInAnonymously();
  await bootstrapping;
  bootstrapping = null;
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setLoading(true);
    const next = await ensureSession();
    setSession(next ?? null);
    setUser(next?.user ?? null);
    setLoading(false);
  }, []);

  const isAnonymous = Boolean(user?.is_anonymous ?? !user?.email);

  return { session, user, loading, error, isAnonymous, email: user?.email ?? null, signOut };
}

/** Signs into an existing account. */
export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/** Emails a password reset link that lands on /reset-password. */
export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message);
}

/** Sets a new password for the session created by the reset link. */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}


/**
 * Creates an account. When the visitor is currently on an anonymous session we
 * upgrade that session in place so their existing projects stay theirs.
 */
export async function createAccount(email: string, password: string) {
  const { data } = await supabase.auth.getSession();
  const current = data.session?.user;

  if (current?.is_anonymous) {
    const { error } = await supabase.auth.updateUser({ email, password });
    if (!error) return;
    // Email already taken (or upgrade unavailable) — fall through to a fresh account.
    if (!/registered|exists|taken/i.test(error.message)) throw new Error(error.message);
    throw new Error("That email already has an account — use Sign in instead.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw new Error(error.message);
}
