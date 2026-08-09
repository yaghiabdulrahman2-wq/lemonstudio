import { supabase } from "@/integrations/supabase/client";

export type CommandType =
  | "create_script"
  | "update_script"
  | "build_instances"
  | "set_properties"
  | "delete_instance"
  | "terrain_fill"
  | "clear_terrain"
  | "get_tree"
  | "read_script";

export type CommandRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "done" | "error";
  result: unknown;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

/** Queues a command for the Studio plugin to execute in the open place. */
export async function queueCommand(
  projectId: string,
  userId: string,
  type: CommandType,
  payload: Record<string, unknown>,
): Promise<CommandRow> {
  const { data, error } = await supabase
    .from("commands")
    .insert({
      project_id: projectId,
      user_id: userId,
      type,
      payload: payload as never,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as CommandRow;
}

/** Polls a queued command until the plugin reports back (or we give up). */
export async function waitForCommand(commandId: string, timeoutMs = 30000): Promise<CommandRow> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("commands")
      .select("*")
      .eq("id", commandId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const row = data as unknown as CommandRow | null;
    if (row && (row.status === "done" || row.status === "error")) return row;

    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  throw new Error("Timed out waiting for Roblox Studio. Is the plugin connected?");
}

export function connectionState(lastSeen: string | null | undefined) {
  if (!lastSeen) return "disconnected" as const;
  const age = Date.now() - new Date(lastSeen).getTime();
  if (age < 8000) return "connected" as const;
  if (age < 60000) return "stale" as const;
  return "disconnected" as const;
}
