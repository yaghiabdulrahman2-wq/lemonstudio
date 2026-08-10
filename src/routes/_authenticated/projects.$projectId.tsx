import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Blocks,
  Check,
  Copy,
  Hammer,
  Loader2,
  Mountain,
  Plug,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CodeBlock } from "@/components/code-block";
import { ExplorerTree, collectScripts, type TreeNode } from "@/components/explorer-tree";
import { Markdown } from "@/components/markdown";
import { PluginSetupPanel } from "@/components/plugin-setup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { connectionState, queueCommand, type CommandRow } from "@/lib/commands";
import { parseSegments, type Segment } from "@/lib/parse-blocks";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Workspace — Lemonade Studio" },
      {
        name: "description",
        content: "Chat with the AI, inspect your place hierarchy and push changes into Studio.",
      },
      { property: "og:title", content: "Workspace — Lemonade Studio" },
      { property: "og:description", content: "Push AI-generated scripts and models into Studio." },
    ],
  }),
  component: ProjectWorkspace,
});

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  place_id: string;
  place_name: string | null;
  connection_token: string;
  plugin_last_seen_at: string | null;
  place_tree: { children?: TreeNode[] } | null;
  place_tree_updated_at: string | null;
  smart_mode: boolean;
};

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [buildMode, setBuildMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<ProjectRow> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ProjectRow;
    },
    refetchInterval: 4000,
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ChatMessage[];
    },
  });

  const commandsQuery = useQuery({
    queryKey: ["commands", projectId],
    queryFn: async (): Promise<CommandRow[]> => {
      const { data, error } = await supabase
        .from("commands")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CommandRow[];
    },
    refetchInterval: 3000,
  });

  const project = projectQuery.data;
  const status = connectionState(project?.plugin_last_seen_at);
  const messages = messagesQuery.data ?? [];
  const scripts = useMemo(() => collectScripts(project?.place_tree ?? null), [project?.place_tree]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, draft]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [projectId, streaming]);

  const dispatch = useMutation({
    mutationFn: async (args: { type: Parameters<typeof queueCommand>[2]; payload: Record<string, unknown>; label: string }) => {
      if (!user) throw new Error("Not signed in");
      await queueCommand(projectId, user.id, args.type, args.payload);
      return args.label;
    },
    onSuccess: (label) => {
      void queryClient.invalidateQueries({ queryKey: ["commands", projectId] });
      toast.success(
        status === "connected"
          ? `Sent to Studio: ${label}`
          : `Queued: ${label} — it runs as soon as the plugin connects`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const applySegment = (segment: Segment) => {
    if (segment.kind === "script") {
      dispatch.mutate({
        type: "create_script",
        payload: {
          parent: segment.parentPath,
          name: segment.name,
          className: segment.className,
          source: segment.code,
        },
        label: `${segment.className} ${segment.name}`,
      });
    } else if (segment.kind === "build") {
      dispatch.mutate({
        type: "build_instances",
        payload: { parent: segment.parentPath, tree: segment.tree },
        label: `${segment.name} → ${segment.parentPath}`,
      });
    } else if (segment.kind === "terrain") {
      dispatch.mutate({
        type: "terrain_fill",
        payload: { regions: segment.regions },
        label: `${segment.regions.length} terrain region(s)`,
      });
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming || !user || !project) return;

    setInput("");
    setStreaming(true);
    setDraft("");

    const history = [...messages.map((m) => ({ role: m.role, content: m.content })), {
      role: "user" as const,
      content: text,
    }];

    const { error: insertError } = await supabase
      .from("messages")
      .insert({ project_id: projectId, user_id: user.id, role: "user", content: text });
    if (insertError) {
      setStreaming(false);
      toast.error(insertError.message);
      return;
    }
    await messagesQuery.refetch();

    let assistant = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history,
          placeTree: project.place_tree,
          placeName: project.place_name,
          smartMode: project.smart_mode,
          buildMode,
          connected: status === "connected",
        }),
      });

      if (!response.ok || !response.body) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? "The AI service failed to respond.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newline = buffer.indexOf("\n");
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");

          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setDraft(assistant);
            }
          } catch {
            // partial frame — wait for more bytes
          }
        }
      }

      if (assistant.trim()) {
        await supabase
          .from("messages")
          .insert({ project_id: projectId, user_id: user.id, role: "assistant", content: assistant });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setStreaming(false);
      setDraft("");
      await messagesQuery.refetch();
    }
  };

  if (projectQuery.isLoading) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card className="border-destructive/40 p-6">
          <p className="text-sm text-destructive">This project could not be loaded.</p>
        </Card>
      </div>
    );
  }

  const statusBadge =
    status === "connected"
      ? { label: "Connected", className: "border-success/40 text-success" }
      : status === "stale"
        ? { label: "Waiting for plugin", className: "border-warning/40 text-warning" }
        : { label: "Disconnected", className: "border-destructive/40 text-destructive" };

  return (
    <div className="flex h-[calc(100vh-0px)] min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{project.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {project.place_name ?? "No place synced"}
            {project.place_id ? ` · ${project.place_id}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusBadge.className}>
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
            {statusBadge.label}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              dispatch.mutate({ type: "get_tree", payload: {}, label: "sync place hierarchy" })
            }
          >
            <RefreshCw className="size-4" /> Sync place
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="lg:hidden">
                <Plug className="size-4" /> Setup
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(24rem,92vw)] overflow-auto">
              <SheetHeader>
                <SheetTitle>Studio setup</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">
                <PluginSetupPanel token={project.connection_token} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_22rem]">
        <section className="flex min-h-0 flex-col">
          <div className="scroll-slim min-h-0 flex-1 space-y-6 overflow-auto px-5 py-6">
            {messages.length === 0 && !draft ? (
              <div className="mx-auto mt-10 max-w-lg text-center">
                <Sparkles className="mx-auto size-6 text-primary" />
                <h2 className="mt-4 text-base font-semibold">Ask for anything buildable</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  “Build a round-based zombie system with a shop”, “make a medieval castle with a
                  moat”, or “audit my DataStore code for exploits”.
                </p>
              </div>
            ) : null}

            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {message.content}
                  </div>
                </div>
              ) : (
                <AssistantMessage
                  key={message.id}
                  content={message.content}
                  onApply={applySegment}
                  applying={dispatch.isPending}
                />
              ),
            )}

            {draft ? (
              <AssistantMessage content={draft} onApply={applySegment} applying={false} />
            ) : null}
            {streaming && !draft ? (
              <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t bg-surface/40 px-5 py-4">
            <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2">
                <Switch
                  checked={project.smart_mode}
                  onCheckedChange={async (checked) => {
                    await supabase
                      .from("projects")
                      .update({ smart_mode: checked })
                      .eq("id", projectId);
                    void queryClient.invalidateQueries({ queryKey: ["project", projectId] });
                  }}
                />
                <span className="text-muted-foreground">Smart Mode</span>
              </label>
              <label className="flex items-center gap-2">
                <Switch checked={buildMode} onCheckedChange={setBuildMode} />
                <span className="text-muted-foreground">Build Mode</span>
              </label>
              {scripts.length > 0 ? (
                <span className="text-muted-foreground">
                  {scripts.length} scripts in context · type @ to reference
                </span>
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder={
                  buildMode ? "Describe the map or model to build…" : "Describe what you need…"
                }
                className="min-h-[3rem] resize-none"
              />
              <Button onClick={() => void send()} disabled={streaming || !input.trim()} size="icon">
                {streaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 border-l lg:flex lg:flex-col">
          <Tabs defaultValue="connect" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="m-3 grid grid-cols-3">
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="explorer">Explorer</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="connect" className="scroll-slim min-h-0 flex-1 overflow-auto px-4 pb-6">
              <PluginSetupPanel token={project.connection_token} />

              <Card className="mt-4 space-y-2 bg-surface/60 p-3 text-xs text-muted-foreground">
                <p>
                  Last heartbeat:{" "}
                  {project.plugin_last_seen_at
                    ? new Date(project.plugin_last_seen_at).toLocaleTimeString()
                    : "never"}
                </p>
                <p>
                  Explorer synced:{" "}
                  {project.place_tree_updated_at
                    ? new Date(project.place_tree_updated_at).toLocaleTimeString()
                    : "never"}
                </p>
              </Card>


              <div className="mt-4 grid gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    dispatch.mutate({
                      type: "build_instances",
                      payload: {
                        parent: "Workspace",
                        tree: [
                          {
                            className: "Part",
                            name: "LemonadeConnectionTest",
                            properties: {
                              Size: [8, 1, 8],
                              Position: [0, 20, 0],
                              Anchored: true,
                              Material: "Neon",
                              Color: [236, 214, 90],
                            },
                          },
                        ],
                      },
                      label: "connection test part",
                    })
                  }
                >
                  <Blocks className="size-4" /> Send test part
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="explorer" className="scroll-slim min-h-0 flex-1 overflow-auto">
              <ExplorerTree
                tree={project.place_tree}
                onSelect={(path) => setInput((value) => `${value}${value ? " " : ""}@${path} `)}
              />
            </TabsContent>

            <TabsContent value="activity" className="scroll-slim min-h-0 flex-1 overflow-auto px-4 pb-6">
              {(commandsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No commands sent yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(commandsQuery.data ?? []).map((command) => (
                    <li key={command.id} className="rounded-lg border bg-surface/50 p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">{command.type}</span>
                        <Badge
                          variant="outline"
                          className={
                            command.status === "done"
                              ? "border-success/40 text-success"
                              : command.status === "error"
                                ? "border-destructive/40 text-destructive"
                                : "border-warning/40 text-warning"
                          }
                        >
                          {command.status}
                        </Badge>
                      </div>
                      {command.error ? (
                        <p className="mt-1 break-words text-destructive">{command.error}</p>
                      ) : null}
                      <p className="mt-1 text-muted-foreground">
                        {new Date(command.created_at).toLocaleTimeString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  onApply,
  applying,
}: {
  content: string;
  onApply: (segment: Segment) => void;
  applying: boolean;
}) {
  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <div className="space-y-3">
      {segments.map((segment) => {
        if (segment.kind === "text") return <Markdown key={segment.id} text={segment.text} />;

        if (segment.kind === "script") {
          return (
            <CodeBlock
              key={segment.id}
              code={segment.code}
              title={`${segment.parentPath}/${segment.name}`}
              subtitle={segment.className}
              actions={
                segment.applyable ? (
                  <Button size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled={applying} onClick={() => onApply(segment)}>
                    <Upload className="size-3.5" /> Apply to Studio
                  </Button>
                ) : null
              }
            />
          );
        }

        if (segment.kind === "build") {
          return (
            <CodeBlock
              key={segment.id}
              code={segment.code}
              highlight={false}
              title={`Build: ${segment.name}`}
              subtitle={`${segment.tree.length} root node(s) → ${segment.parentPath}`}
              actions={
                segment.valid ? (
                  <Button size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled={applying} onClick={() => onApply(segment)}>
                    <Hammer className="size-3.5" /> Build in Studio
                  </Button>
                ) : null
              }
            />
          );
        }

        return (
          <CodeBlock
            key={segment.id}
            code={segment.code}
            highlight={false}
            title="Terrain"
            subtitle={`${segment.regions.length} region(s)`}
            actions={
              segment.valid ? (
                <Button size="sm" className="h-7 gap-1.5 px-2 text-xs" disabled={applying} onClick={() => onApply(segment)}>
                  <Mountain className="size-3.5" /> Generate terrain
                </Button>
              ) : null
            }
          />
        );
      })}
    </div>
  );
}
