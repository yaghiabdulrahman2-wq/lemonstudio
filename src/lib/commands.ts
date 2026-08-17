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
  if (age < 10000) return "stale" as const;
  return "disconnected" as const;
}

export type RevertStep = { type: CommandType; payload: Record<string, unknown> };

/**
 * Builds the commands that undo a completed Studio command, using the result
 * the plugin reported back (created paths, previous script source, ...).
 */
export function revertPlan(command: CommandRow): { steps: RevertStep[]; label: string } | null {
  if (command.status !== "done") return null;
  const result = (command.result ?? {}) as Record<string, unknown>;

  if (command.type === "build_instances") {
    const created = Array.isArray(result["created"]) ? (result["created"] as string[]) : [];
    if (created.length === 0) return null;
    return {
      label: `remove ${created.length} built instance(s)`,
      steps: created.map((path) => ({ type: "delete_instance" as const, payload: { path } })),
    };
  }

  if (command.type === "create_script" || command.type === "update_script") {
    const path = typeof result["path"] === "string" ? (result["path"] as string) : null;
    if (!path) return null;
    const previous = result["previousSource"];
    if (typeof previous === "string") {
      return {
        label: `restore previous source of ${path}`,
        steps: [{ type: "update_script", payload: { path, source: previous } }],
      };
    }
    if (result["created"] === true) {
      return { label: `delete ${path}`, steps: [{ type: "delete_instance", payload: { path } }] };
    }
    return null;
  }

  return null;
}

/** Queues every step of a revert plan in order. */
export async function revertCommand(
  projectId: string,
  userId: string,
  command: CommandRow,
): Promise<string> {
  const plan = revertPlan(command);
  if (!plan) throw new Error("This action can't be reverted automatically. Use Ctrl+Z in Studio.");
  for (const step of plan.steps) {
    await queueCommand(projectId, userId, step.type, step.payload);
  }
  return plan.label;
}
