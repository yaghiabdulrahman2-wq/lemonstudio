import { createFileRoute } from "@tanstack/react-router";

import { authenticatePlugin, jsonResponse, readBody } from "@/lib/plugin-api.server";

/** The plugin calls this every ~1.5s: heartbeat + dequeue pending commands. */
export const Route = createFileRoute("/api/public/plugin/poll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request);
        const auth = await authenticatePlugin(body["token"]);
        if (!auth.ok) return auth.response;

        const now = new Date().toISOString();
        const patch: Record<string, unknown> = { plugin_last_seen_at: now };
        if (typeof body["placeName"] === "string") patch["place_name"] = body["placeName"];
        await auth.admin.from("projects").update(patch).eq("id", auth.project.id);

        const { data: pending, error } = await auth.admin
          .from("commands")
          .select("id, type, payload")
          .eq("project_id", auth.project.id)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(10);

        if (error) return jsonResponse({ error: "Could not read queue" }, 500);

        const commands = pending ?? [];
        if (commands.length > 0) {
          const { error: claimError } = await auth.admin
            .from("commands")
            .update({ status: "running", dispatched_at: now })
            .in(
              "id",
              commands.map((command) => command.id),
            );
          if (claimError) return jsonResponse({ error: "Could not claim commands" }, 500);
        }

        return jsonResponse({
          ok: true,
          projectName: auth.project.name,
          commands,
        });
      },
    },
  },
});
