import { createFileRoute } from "@tanstack/react-router";

import { authenticatePlugin, jsonResponse, readBody } from "@/lib/plugin-api.server";

/** The plugin reports the outcome of a command here. */
export const Route = createFileRoute("/api/public/plugin/result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request);
        const auth = await authenticatePlugin(body["token"]);
        if (!auth.ok) return auth.response;

        const commandId = body["commandId"];
        if (typeof commandId !== "string" || commandId.length === 0) {
          return jsonResponse({ error: "commandId is required" }, 400);
        }

        const status = body["status"] === "error" ? "error" : "done";
        const errorMessage =
          typeof body["error"] === "string" && body["error"].length > 0 ? body["error"] : null;

        const { data: updated, error } = await auth.admin
          .from("commands")
          .update({
            status,
            result: body["result"] ?? null,
            error: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq("id", commandId)
          .eq("project_id", auth.project.id)
          .select("type")
          .maybeSingle();

        if (error) return jsonResponse({ error: "Could not store result" }, 500);
        if (!updated) return jsonResponse({ error: "Unknown command" }, 404);

        // A get_tree result doubles as an Explorer snapshot.
        const result = body["result"];
        if (
          updated.type === "get_tree" &&
          status === "done" &&
          result &&
          typeof result === "object" &&
          "children" in result
        ) {
          await auth.admin
            .from("projects")
            .update({ place_tree: result, place_tree_updated_at: new Date().toISOString() })
            .eq("id", auth.project.id);
        }

        return jsonResponse({ ok: true });
      },
    },
  },
});
