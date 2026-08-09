import { Link, createFileRoute } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Docs — How the Studio connection works" },
      {
        name: "description",
        content:
          "How Lemonade Studio's command queue, companion plugin and Explorer sync work together.",
      },
      { property: "og:title", content: "Docs — How the Studio connection works" },
      {
        property: "og:description",
        content: "Command queue, companion plugin and Explorer sync explained.",
      },
    ],
  }),
  component: Docs,
});

const SECTIONS = [
  {
    title: "The command queue",
    body: "Every Apply button writes a row into a per-project command queue with a type and a JSON payload. Nothing is executed by the website itself — the plugin is the only thing that touches your place.",
  },
  {
    title: "The plugin loop",
    body: "The plugin authenticates with your project's connection token, then POSTs to /api/public/plugin/poll every 1.5 seconds. Pending commands are claimed atomically, executed inside a ChangeHistoryService recording (so Ctrl+Z works), and the result is reported to /api/public/plugin/result.",
  },
  {
    title: "Supported commands",
    body: "create_script, update_script, read_script, build_instances, set_properties, delete_instance, terrain_fill, clear_terrain and get_tree.",
  },
  {
    title: "Explorer sync",
    body: "On connect — and whenever you press Sync place — the plugin serialises up to 1,500 nodes of your hierarchy and uploads it. That snapshot is fed to the AI as context so it reasons about the systems you already have.",
  },
  {
    title: "Paths",
    body: "Paths look like ServerScriptService/Systems/Combat. The first segment is a service; missing intermediate folders are created automatically.",
  },
  {
    title: "Security",
    body: "The connection token is the plugin's only credential — treat it like a password. Rotating it is as simple as creating a new project. Commands are scoped to the single project that owns the token.",
  },
];

function Docs() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <Logo className="mb-10" />
      <h1 className="text-3xl font-bold tracking-tight">How the Studio connection works</h1>
      <div className="mt-8 space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="bg-surface/50 p-6">
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </Card>
        ))}
      </div>
      <Button asChild className="mt-8">
        <Link to="/plugin">Get the plugin</Link>
      </Button>
    </div>
  );
}
