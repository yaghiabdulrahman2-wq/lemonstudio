import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { connectionState } from "@/lib/commands";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Projects — Lemonade Studio" },
      {
        name: "description",
        content: "Your connected Roblox places, AI conversations and generated assets.",
      },
      { property: "og:title", content: "Projects — Lemonade Studio" },
      { property: "og:description", content: "Your connected Roblox places and AI conversations." },
    ],
  }),
  component: Dashboard,
});

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  place_id: string;
  place_name: string | null;
  tags: string[];
  plugin_last_seen_at: string | null;
  updated_at: string;
};

const STATUS_STYLES = {
  connected: { label: "Connected", className: "border-success/40 text-success" },
  stale: { label: "Idle", className: "border-warning/40 text-warning" },
  disconnected: { label: "Disconnected", className: "border-border text-muted-foreground" },
} as const;

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [placeId, setPlaceId] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async (): Promise<ProjectRow[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, name, description, place_id, place_name, tags, plugin_last_seen_at, updated_at",
        )
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ProjectRow[];
    },
    refetchInterval: 10000,
  });

  const createProject = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: name.trim() || "Untitled place",
          description: description.trim(),
          place_id: placeId.trim(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      setOpen(false);
      setName("");
      setDescription("");
      setPlaceId("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate({ to: "/projects/$projectId", params: { projectId: id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const projects = projectsQuery.data;
  const filtered = useMemo(() => {
    const list = projects ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        project.description.toLowerCase().includes(term) ||
        project.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
  }, [projects, search]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One project per Roblox place. Each gets its own plugin connection token.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New project
        </Button>
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search projects and tags"
          className="pl-9"
          aria-label="Search projects"
        />
      </div>

      {projectsQuery.isLoading ? (
        <div className="mt-16 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : projectsQuery.isError ? (
        <Card className="mt-6 border-destructive/40 p-6">
          <p className="text-sm text-destructive">
            Could not load your projects. Refresh the page to try again.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="mt-6 border-dashed p-12 text-center">
          <h2 className="text-base font-semibold">
            {projects.length === 0 ? "No projects yet" : "No matches"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {projects.length === 0
              ? "Create a project, install the Studio plugin, and the AI can start building inside your open place."
              : "Try a different search term."}
          </p>
          {projects.length === 0 ? (
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Create your first project
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => {
            const status = STATUS_STYLES[connectionState(project.plugin_last_seen_at)];
            return (
              <Link
                key={project.id}
                to="/projects/$projectId"
                params={{ projectId: project.id }}
                className="group"
              >
                <Card className="h-full border-border/70 bg-surface/60 p-5 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="truncate text-base font-semibold group-hover:text-primary">
                      {project.name}
                    </h2>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                    {project.description || "No description yet."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">
                      {project.place_name ?? (project.place_id ? `Place ${project.place_id}` : "—")}
                    </span>
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Projects map 1:1 to a Roblox place. You can fill in the place ID later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tower Defense Rework"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-desc">Description</Label>
              <Textarea
                id="project-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you building?"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-place">Place ID (optional)</Label>
              <Input
                id="project-place"
                value={placeId}
                onChange={(event) => setPlaceId(event.target.value)}
                placeholder="123456789"
                inputMode="numeric"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createProject.mutate()} disabled={createProject.isPending}>
              {createProject.isPending ? <Loader2 className="size-4 animate-spin" /> : null} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
