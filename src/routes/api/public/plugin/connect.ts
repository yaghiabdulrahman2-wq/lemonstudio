import { createFileRoute } from "@tanstack/react-router";

import { authenticatePlugin, jsonResponse, readBody } from "@/lib/plugin-api.server";

export const Route = createFileRoute("/api/public/plugin/connect")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readBody(request);
        const auth = await authenticatePlugin(body["token"]);
        if (!auth.ok) return auth.response;

        const placeName = typeof body["placeName"] === "string" ? body["placeName"] : null;
        const placeId = typeof body["placeId"] === "string" ? body["placeId"] : null;

        const patch: Record<string, unknown> = { plugin_last_seen_at: new Date().toISOString() };
        if (placeName) patch["place_name"] = placeName;
        if (placeId && placeId !== "0") patch["place_id"] = placeId;

        const { error } = await auth.admin.from("projects").update(patch).eq("id", auth.project.id);
        if (error) return jsonResponse({ error: "Could not register connection" }, 500);

        return jsonResponse({
          ok: true,
          projectId: auth.project.id,
          projectName: auth.project.name,
        });
      },
    },
  },
});
