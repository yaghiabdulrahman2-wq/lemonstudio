import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Blocks,
  Hammer,
  Loader2,
  Mountain,
  Plug,
  RefreshCw,
  Send,
  Sparkles,
  Undo2,
  Upload,
  ImagePlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CodeBlock } from "@/components/code-block";
import { ExplorerTree, type TreeNode } from "@/components/explorer-tree";
import { Markdown } from "@/components/markdown";
import { PluginSetupPanel } from "@/components/plugin-setup";
import { collectScripts, diffTrees } from "@/lib/explorer-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  connectionState,
  queueCommand,
  revertCommand,
  revertPlan,
  type CommandRow,
} from "@/lib/commands";
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

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: string[];
};

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [buildMode, setBuildMode] = useState(false);
  const [autoApply, setAutoApply] = useState(true);
  const [images, setImages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [serviceIssue, setServiceIssue] = useState<{ title: string; detail: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async (): Promise<ProjectRow | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown as ProjectRow | null) ?? null;
    },
    retry: 1,
    refetchInterval: 4000,
  });

  const messagesQuery = useQuery({
    queryKey: ["messages", projectId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, role, content, attachments")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as ChatMessage[]).map((m) => ({
        ...m,
        attachments: Array.isArray(m.attachments) ? m.attachments : [],
      }));
    },
    refetchInterval: 5000,
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

  // The plugin pushes the hierarchy whenever the place changes, so we only ask
  // for a snapshot once — the moment a plugin connects.
  const requestedTreeFor = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "connected" || !user) return;
    const key = `${projectId}:${project?.plugin_last_seen_at ? "on" : "off"}`;
    if (requestedTreeFor.current === key) return;
    requestedTreeFor.current = key;
    void queueCommand(projectId, user.id, "get_tree", {}).catch(() => undefined);
  }, [status, user, projectId, project?.plugin_last_seen_at]);

  useEffect(() => {
    if (status === "disconnected") requestedTreeFor.current = null;
  }, [status]);

  // Instant diff: highlight nodes that appeared since the previous snapshot.
  const treeStamp = project?.place_tree_updated_at ?? null;
  const previousTree = useRef<{ children?: TreeNode[] } | null>(null);
  const previousStamp = useRef<string | null>(null);
  const [treeDiff, setTreeDiff] = useState<{ added: Set<string>; removedCount: number }>({
    added: new Set(),
    removedCount: 0,
  });

  useEffect(() => {
    if (!treeStamp || treeStamp === previousStamp.current) return;
    const next = project?.place_tree ?? null;
    if (previousStamp.current !== null) setTreeDiff(diffTrees(previousTree.current, next));
    previousStamp.current = treeStamp;
    previousTree.current = next;
  }, [treeStamp, project?.place_tree]);



  const dispatch = useMutation({
    mutationFn: async (args: {
      type: Parameters<typeof queueCommand>[2];
      payload: Record<string, unknown>;
      label: string;
    }) => {
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

  const segmentCommand = (
    segment: Segment,
  ): {
    type: Parameters<typeof queueCommand>[2];
    payload: Record<string, unknown>;
    label: string;
  } | null => {
    if (segment.kind === "script" && segment.applyable) {
      return {
        type: "create_script",
        payload: {
          parent: segment.parentPath,
          name: segment.name,
          className: segment.className,
          source: segment.code,
        },
        label: `${segment.className} ${segment.name}`,
      };
    }
    if (segment.kind === "build" && segment.valid) {
      return {
        type: "build_instances",
        payload: { parent: segment.parentPath, tree: segment.tree },
        label: `${segment.name} → ${segment.parentPath}`,
      };
    }
    if (segment.kind === "terrain" && segment.valid) {
      return {
        type: "terrain_fill",
        payload: { regions: segment.regions },
        label: `${segment.regions.length} terrain region(s)`,
      };
    }
    return null;
  };

  const autoApplyAll = async (content: string) => {
    if (!user) return;
    const jobs = parseSegments(content)
      .map(segmentCommand)
      .filter((job): job is NonNullable<typeof job> => job !== null);
    if (jobs.length === 0) return;

    for (const job of jobs) {
      try {
        await queueCommand(projectId, user.id, job.type, job.payload);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send to Studio.");
        return;
      }
    }
    void queryClient.invalidateQueries({ queryKey: ["commands", projectId] });
    toast.success(
      status === "connected"
        ? `Applied ${jobs.length} change(s) in Studio`
        : `Queued ${jobs.length} change(s) — they run when the plugin connects`,
    );
  };

  const revert = useMutation({
    mutationFn: async (command: CommandRow) => {
      if (!user) throw new Error("Not signed in");
      return revertCommand(projectId, user.id, command);
    },
    onSuccess: (label) => {
      void queryClient.invalidateQueries({ queryKey: ["commands", projectId] });
      toast.success(`Reverting: ${label}`);
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
    if ((!text && images.length === 0) || streaming || !user || !project) return;

    const pendingImages = images;
    setInput("");
    setImages([]);
    setStreaming(true);
    setDraft("");

    const uploaded: string[] = [];
    for (const image of pendingImages) {
      try {
        const blob = await (await fetch(image.dataUrl)).blob();
        const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${image.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(path, blob, { contentType: blob.type || "image/png" });
        if (uploadError) throw new Error(uploadError.message);
        uploaded.push(path);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Image upload failed.");
      }
    }

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user" as const,
        content:
          pendingImages.length > 0
            ? [
                { type: "text" as const, text: text || "Look at these image(s)." },
                ...pendingImages.map((image) => ({
                  type: "image_url" as const,
                  image_url: { url: image.dataUrl },
                })),
              ]
            : text,
      },
    ];

    const { error: insertError } = await supabase.from("messages").insert({
      project_id: projectId,
      user_id: user.id,
      role: "user",
      content: text || "(image)",
      attachments: uploaded,
    });
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
        // Billing/limit problems are a status, not a crash: keep the draft text
        // so nothing is lost and surface a clear banner instead.
        if (response.status === 402) {
          setInput(text);
          setImages(pendingImages);
          setServiceIssue({
            title: "AI credits exhausted",
            detail:
              detail?.error ??
              "Your workspace is out of AI credits. Everything else still works — Studio commands, reverts and the Explorer keep running. Top up credits to keep chatting.",
          });
          return;
        }
        if (response.status === 429) {
          setInput(text);
          setImages(pendingImages);
          setServiceIssue({
            title: "Rate limit reached",
            detail: detail?.error ?? "Too many requests right now. Try again in a moment.",
          });
          return;
        }
        throw new Error(detail?.error ?? "The AI service failed to respond.");
      }
      setServiceIssue(null);


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
        await supabase.from("messages").insert({
          project_id: projectId,
          user_id: user.id,
          role: "assistant",
          content: assistant,
        });
        if (autoApply) await autoApplyAll(assistant);
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
        <Card className="p-6">
          <p className="text-sm font-medium">This project isn&apos;t on this device.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects live in the browser you created them in. Head back and open one of yours.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/dashboard">Back to projects</Link>
          </Button>
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
                  <div className="max-w-[80%] space-y-2">
                    {message.attachments.length > 0 ? (
                      <MessageImages paths={message.attachments} />
                    ) : null}
                    <div className="rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {message.content}
                    </div>
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
            {serviceIssue ? (
              <div
                role="status"
                data-testid="service-issue"
                className="mb-3 flex animate-fade-up items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-warning">{serviceIssue.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{serviceIssue.detail}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => setServiceIssue(null)}
                >
                  Dismiss
                </Button>
              </div>
            ) : null}
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
              <label className="flex items-center gap-2">
                <Switch checked={autoApply} onCheckedChange={setAutoApply} />
                <span className="text-muted-foreground">Auto-apply to Studio</span>
              </label>
              {scripts.length > 0 ? (
                <span className="text-muted-foreground">
                  {scripts.length} scripts in context · type @ to reference
                </span>
              ) : null}
            </div>
            {images.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {images.map((image, index) => (
                  <div key={`${image.name}-${index}`} className="relative">
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="size-16 rounded-md border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remove ${image.name}`}
                      onClick={() => setImages((list) => list.filter((_, i) => i !== index))}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border bg-surface-2 text-xs"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                for (const file of files) {
                  if (file.size > 6 * 1024 * 1024) {
                    toast.error(`${file.name} is over 6 MB.`);
                    continue;
                  }
                  const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error("Could not read that file."));
                    reader.readAsDataURL(file);
                  });
                  setImages((list) => [...list, { name: file.name, dataUrl }]);
                }
              }}
            />
            <div className="flex items-end gap-2">
              <Button
                size="icon"
                variant="outline"
                aria-label="Attach image"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="size-4" />
              </Button>
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
              <Button
                onClick={() => void send()}
                disabled={streaming || (!input.trim() && images.length === 0)}
                size="icon"
              >
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

            <TabsContent
              value="connect"
              className="scroll-slim min-h-0 flex-1 overflow-auto px-4 pb-6"
            >
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
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
                <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                  {status === "connected" ? (
                    <span className="inline-block size-1.5 shrink-0 animate-live-dot rounded-full bg-success" />
                  ) : null}
                  <span className="truncate">
                    {project.place_tree_updated_at
                      ? `Updated ${new Date(project.place_tree_updated_at).toLocaleTimeString()}`
                      : "Never synced"}
                    {status === "connected" ? " · live" : ""}
                  </span>
                  {treeDiff.added.size > 0 ? (
                    <span className="animate-pop-in shrink-0 text-success">
                      +{treeDiff.added.size}
                    </span>
                  ) : null}
                  {treeDiff.removedCount > 0 ? (
                    <span className="animate-pop-in shrink-0 text-destructive">
                      −{treeDiff.removedCount}
                    </span>
                  ) : null}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() =>
                    dispatch.mutate({ type: "get_tree", payload: {}, label: "refresh Explorer" })
                  }
                >
                  <RefreshCw className="size-3.5" /> Refresh
                </Button>
              </div>
              <ExplorerTree
                tree={project.place_tree}
                changed={treeDiff.added}
                onSelect={(path) => setInput((value) => `${value}${value ? " " : ""}@${path} `)}
              />

            </TabsContent>

            <TabsContent
              value="activity"
              className="scroll-slim min-h-0 flex-1 overflow-auto px-4 pb-6"
            >
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
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-muted-foreground">
                          {new Date(command.created_at).toLocaleTimeString()}
                        </p>
                        {revertPlan(command) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 gap-1 px-1.5 text-xs"
                            disabled={revert.isPending}
                            onClick={() => revert.mutate(command)}
                          >
                            <Undo2 className="size-3" /> Revert
                          </Button>
                        ) : null}
                      </div>
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
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    disabled={applying}
                    onClick={() => onApply(segment)}
                  >
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
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    disabled={applying}
                    onClick={() => onApply(segment)}
                  >
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
                <Button
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  disabled={applying}
                  onClick={() => onApply(segment)}
                >
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

/** Resolves private storage paths to short-lived signed URLs for display. */
function MessageImages({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const pathKey = paths.join("|");

  useEffect(() => {
    let active = true;
    if (paths.length === 0) {
      setUrls([]);
      return;
    }
    void supabase.storage
      .from("chat-images")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!active) return;
        setUrls((data ?? []).map((item) => item.signedUrl).filter(Boolean) as string[]);
      });
    return () => {
      active = false;
    };
  }, [pathKey, paths]);

  if (urls.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {urls.map((url) => (
        <img
          key={url}
          src={url}
          alt="Attached reference"
          className="max-h-48 rounded-lg border object-cover"
        />
      ))}
    </div>
  );
}
