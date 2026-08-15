import { createFileRoute } from "@tanstack/react-router";

import { authenticatePlugin, jsonResponse, readBody } from "@/lib/plugin-api.server";

/** The plugin pushes the current Explorer hierarchy here. */
export const Route = createFileRoute("/api/public/plugin/tree")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request);
        const auth = await authenticatePlugin(body["token"]);
        if (!auth.ok) return auth.response;

        const tree = body["tree"];
        if (!tree || typeof tree !== "object") {
          return jsonResponse({ error: "tree is required" }, 400);
        }

        const patch: Record<string, unknown> = {
          place_tree: tree,
          place_tree_updated_at: new Date().toISOString(),
          plugin_last_seen_at: new Date().toISOString(),
        };
        if (typeof body["placeName"] === "string") patch["place_name"] = body["placeName"];
        if (typeof body["placeId"] === "string" && body["placeId"] !== "0") {
          patch["place_id"] = body["placeId"];
        }

        const { error } = await auth.admin.from("projects").update(patch).eq("id", auth.project.id);
        if (error) return jsonResponse({ error: "Could not store tree" }, 500);

        return jsonResponse({ ok: true });
      },
    },
  },
});
