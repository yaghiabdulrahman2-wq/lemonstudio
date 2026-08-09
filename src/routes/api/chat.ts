import { createFileRoute } from "@tanstack/react-router";

import { BUILD_MODE_PROMPT, SMART_MODE_PROMPT, SYSTEM_PROMPT_BASE } from "@/lib/system-prompt";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatRequest = {
  messages?: ChatMessage[];
  placeTree?: unknown;
  placeName?: string;
  smartMode?: boolean;
  buildMode?: boolean;
  connected?: boolean;
};

const MODEL = "google/gemini-3.6-flash";

function summariseTree(tree: unknown): string {
  if (!tree) return "The place is not synced yet — no Explorer tree available.";
  const json = JSON.stringify(tree);
  return json.length > 24000 ? `${json.slice(0, 24000)}\n...(truncated)` : json;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequest;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages are required" }), { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI is not configured" }), { status: 500 });
        }

        let system = SYSTEM_PROMPT_BASE;
        if (body.smartMode) system += SMART_MODE_PROMPT;
        if (body.buildMode) system += BUILD_MODE_PROMPT;
        system += `\n\n## Live project context
Studio plugin: ${body.connected ? "CONNECTED — commands apply instantly" : "NOT CONNECTED — commands queue until the plugin connects"}
Place name: ${body.placeName ?? "unknown"}
Explorer tree (JSON):
${summariseTree(body.placeTree)}`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: [{ role: "system", content: system }, ...messages.slice(-24)],
          }),
        });

        if (upstream.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Try again in a moment." }),
            { status: 429, headers: { "content-type": "application/json" } },
          );
        }
        if (upstream.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Add credits to keep generating." }),
            { status: 402, headers: { "content-type": "application/json" } },
          );
        }
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("AI gateway error", upstream.status, detail);
          return new Response(JSON.stringify({ error: "The AI service failed to respond." }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});
