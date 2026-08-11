import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  Bug,
  Cpu,
  Layers,
  Plug,
  ShieldCheck,
  Sparkle,
  Terminal,
  Zap,
} from "lucide-react";

import { CodeBlock } from "@/components/code-block";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lemonade Studio — AI that builds inside Roblox Studio" },
      {
        name: "description",
        content:
          "Chat with an expert Roblox AI that writes Luau, builds maps and pushes real changes into your open Studio place through a companion plugin.",
      },
      { property: "og:title", content: "Lemonade Studio — AI that builds inside Roblox Studio" },
      {
        property: "og:description",
        content:
          "Generate scripts, models and terrain, then apply them live to your open place with the Lemonade Studio plugin.",
      },
    ],
  }),
  component: Landing,
});

const SAMPLE = `--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Remotes = ReplicatedStorage:WaitForChild("Remotes")
local RequestSwing: RemoteEvent = Remotes.RequestSwing

local COOLDOWN = 0.45
local lastSwing: { [Player]: number } = {}

RequestSwing.OnServerEvent:Connect(function(player: Player, targetId: number)
	local now = os.clock()
	if now - (lastSwing[player] or 0) < COOLDOWN then
		return -- rate limited: never trust the client
	end
	lastSwing[player] = now

	local target = Players:GetPlayerByUserId(targetId)
	if not target or target == player then
		return
	end
	CombatService.applyDamage(player, target, 12)
end)`;

const FEATURES = [
  {
    icon: Plug,
    title: "Real Studio connection",
    body: "A companion plugin polls your project every 1.5s, executes commands in the open place and reports back. No fake “connected” badges.",
  },
  {
    icon: Terminal,
    title: "Production Luau",
    body: "Strict typing, no deprecated APIs, defensive server validation, proper DataStore retries and clean connection teardown.",
  },
  {
    icon: Blocks,
    title: "Maps & models",
    body: "Describe a castle, get a structured instance tree with anchored parts, materials and grouped models — pushed straight into Workspace.",
  },
  {
    icon: Layers,
    title: "Place-aware context",
    body: "The plugin uploads your Explorer hierarchy, so the AI reasons about the systems you already have instead of guessing.",
  },
  {
    icon: Bug,
    title: "Bug hunting",
    body: "Exploit surfaces, memory leaks and race conditions get flagged proactively — with a one-click fix in the same reply.",
  },
  {
    icon: ShieldCheck,
    title: "Smart Mode",
    body: "Raise the bar: architecture notes, rate limiting on every remote, security review and performance budgets.",
  },
];

const STEPS = [
  {
    title: "Create a project",
    body: "One project per Roblox place. It gets its own connection token.",
  },
  {
    title: "Install the plugin",
    body: "Copy the generated Lua, save it as a local plugin, paste the token.",
  },
  { title: "Ship", body: "Chat, hit Apply to Studio, watch instances appear in your open place." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link to="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">Open app</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard">
                Start building <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-gradient relative overflow-hidden border-b">
          <div className="grid-bg absolute inset-0 opacity-[0.35]" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-5 py-20 md:py-28">
            <Badge variant="outline" className="mb-6 gap-1.5 border-primary/40 text-primary">
              <Sparkle className="size-3.5" /> Live plugin bridge — v1
            </Badge>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              The AI that actually{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                builds inside Roblox Studio
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Lemonade writes production Luau, designs maps and models, then pushes them into your
              open place through a companion Studio plugin. Real commands, real instances, real
              feedback loop.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="glow-primary">
                <Link to="/dashboard">
                  Connect your place <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/plugin">Get the Studio plugin</Link>
              </Button>
            </div>

            <div className="mt-14 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <CodeBlock
                code={SAMPLE}
                title="ServerScriptService/Combat/CombatRemotes.server.luau"
                subtitle="generated + applied to the open place"
                className="shadow-2xl"
              />
              <Card className="flex flex-col justify-between gap-6 border-border/70 bg-surface/70 p-6">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="size-4 text-primary" /> Command stream
                  </p>
                  <ul className="mt-4 space-y-3 text-sm">
                    {[
                      ["create_script", "ServerScriptService/Combat"],
                      ["build_instances", "Workspace/Castle · 34 parts"],
                      ["terrain_fill", "512×512 grass plateau"],
                      ["get_tree", "1,284 nodes synced"],
                    ].map(([type, detail]) => (
                      <li key={type} className="flex items-start gap-3">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success" />
                        <span className="min-w-0">
                          <span className="font-mono text-[12.5px] text-foreground">{type}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {detail}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Every command is queued, claimed by the plugin, executed inside a
                  ChangeHistoryService recording (so it&apos;s undoable) and reported back.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-bold tracking-tight">Built for people who ship</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Not a chatbot with a Roblox skin. A tool wired into your place.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="border-border/70 bg-surface/60 p-6">
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how" className="border-y bg-surface/40">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-bold tracking-tight">Three steps to a live bridge</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <Card key={step.title} className="border-border/70 bg-background/60 p-6">
                  <span className="font-mono text-sm text-primary">0{index + 1}</span>
                  <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                </Card>
              ))}
            </div>
            <div className="mt-8">
              <Button asChild variant="outline">
                <Link to="/docs">
                  Read the connection docs <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24 text-center">
          <Cpu className="mx-auto size-8 text-primary" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight md:text-4xl">
            Stop copy-pasting from a chat window
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Connect a place and let the AI put the code where it belongs.
          </p>
          <Button asChild size="lg" className="mt-8 glow-primary">
            <Link to="/dashboard">
              Create your first project <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <Logo />
          <div className="flex flex-wrap gap-5">
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/docs" className="hover:text-foreground">
              Docs
            </Link>
            <Link to="/plugin" className="hover:text-foreground">
              Plugin
            </Link>
          </div>
          <p>Not affiliated with Roblox Corporation.</p>
        </div>
      </footer>
    </div>
  );
}
