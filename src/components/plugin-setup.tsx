import { Check, ClipboardList, Copy, Download, ExternalLink } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildPluginSource } from "@/lib/plugin-source";

const STEPS = [
  "Open your place in Roblox Studio.",
  "Game Settings → Security → turn ON Allow HTTP Requests.",
  "Download LemonadeStudio.server.lua (token already baked in).",
  "In Studio insert a Script anywhere, paste the file contents into it.",
  "Right-click the script → Save as Local Plugin… → name it LemonadeStudio.",
  "Plugins tab → click Lemonade Studio → press Connect.",
  "The badge turns green and your Explorer tree uploads automatically.",
];

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
    return true;
  } catch {
    toast.error("Clipboard blocked — select the text and copy manually.");
    return false;
  }
}

export function PluginSetupPanel({ token }: { token: string }) {
  const [origin, setOrigin] = useState("");
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const source = origin ? buildPluginSource(origin, token) : "";

  const download = () => {
    if (!source) return;
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "LemonadeStudio.server.lua";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Plugin downloaded with your token pre-filled.");
  };

  const checklist = STEPS.map((step, index) => `${index + 1}. ${step}`).join("\n");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Connect to Studio</h3>
        <p className="mt-1 text-xs text-muted-foreground">One download, one paste. No guessing.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="sm" onClick={download} disabled={!source}>
          <Download className="size-4" /> Download plugin
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void copy(source, "Plugin code")}
          disabled={!source}
        >
          <Copy className="size-4" /> Copy plugin code
        </Button>
      </div>

      <div>
        <Label className="text-xs">Connection token</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            readOnly
            value={token}
            className="font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Copy token"
            onClick={async () => {
              if (await copy(token, "Token")) {
                setCopiedToken(true);
                setTimeout(() => setCopiedToken(false), 1600);
              }
            }}
          >
            {copiedToken ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>

      <Card className="space-y-2 bg-surface/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">Setup checklist</p>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => void copy(checklist, "Checklist")}
          >
            <ClipboardList className="size-3.5" /> Copy
          </Button>
        </div>
        <ol className="space-y-1.5 text-xs text-muted-foreground">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
        <Link to="/plugin">
          Full plugin guide <ExternalLink className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
