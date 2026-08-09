import type { SupabaseClient } from "@supabase/supabase-js";

export type PluginProject = {
  id: string;
  user_id: string;
  name: string;
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed = (await request.json()) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Resolves the project that owns a plugin connection token. */
export async function authenticatePlugin(
  token: unknown,
): Promise<
  { ok: true; project: PluginProject; admin: SupabaseClient } | { ok: false; response: Response }
> {
  if (typeof token !== "string" || token.trim().length < 8) {
    return { ok: false, response: jsonResponse({ error: "Invalid token" }, 401) };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, user_id, name")
    .eq("connection_token", token.trim())
    .maybeSingle();

  if (error) {
    return { ok: false, response: jsonResponse({ error: "Lookup failed" }, 500) };
  }
  if (!data) {
    return { ok: false, response: jsonResponse({ error: "Unknown token" }, 401) };
  }

  return {
    ok: true,
    project: data as PluginProject,
    admin: supabaseAdmin as unknown as SupabaseClient,
  };
}
