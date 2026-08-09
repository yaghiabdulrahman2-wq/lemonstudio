import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { CodeBlock } from "@/components/code-block";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPluginSource } from "@/lib/plugin-source";

export const Route = createFileRoute("/plugin")({
  head: () => ({
    meta: [
      { title: "Studio plugin — Lemonade Studio" },
      {
        name: "description",
        content:
          "Install the Lemonade companion plugin so the AI can create scripts, models and terrain inside your open Roblox place.",
      },
      { property: "og:title", content: "Studio plugin — Lemonade Studio" },
      { property: "og:description", content: "Install the Lemonade companion Roblox Studio plugin." },
    ],
  }),
  component: PluginPage,
});

function PluginPage() {
  const [origin, setOrigin] = useState("https://your-app.lovable.app");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const source = buildPluginSource(origin);

  const download = () => {
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "LemonadeStudio.server.lua";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <Button onClick={download}>
          <Download className="size-4" /> Download plugin
        </Button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Install the Lemonade Studio plugin</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        This is the bridge. It polls your project every 1.5 seconds, executes queued commands inside
        the open place and reports results back to the dashboard.
      </p>

      <Card className="mt-6 space-y-4 bg-surface/60 p-6 text-sm">
        <Step n={1} title="Enable HTTP requests">
          In Studio: <strong>Home → Game Settings → Security → Allow HTTP Requests</strong>. Without
          this the plugin cannot reach the server.
        </Step>
        <Step n={2} title="Create the plugin script">
          In Studio, insert a <strong>Script</strong> anywhere (e.g. ServerStorage), paste the code
          below into it, then right-click it in the Explorer and choose{" "}
          <strong>Save as Local Plugin…</strong>. Name it <code>LemonadeStudio</code>. You can
          delete the temporary script afterwards.
        </Step>
        <Step n={3} title="Open the panel">
          A <strong>Lemonade Studio</strong> button appears in the Plugins tab. Click it to open the
          docked panel.
        </Step>
        <Step n={4} title="Paste your token">
          Copy the connection token from your project page, paste it into the panel and press{" "}
          <strong>Connect</strong>. The status turns green and your Explorer tree uploads
          automatically.
        </Step>
      </Card>

      <div className="mt-8">
        <CodeBlock
          code={source}
          title="LemonadeStudio.server.lua"
          subtitle={`server: ${origin}`}
        />
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
        {n}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
