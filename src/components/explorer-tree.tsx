import { ChevronRight, FileCode, Folder, Box } from "lucide-react";
import { useState } from "react";

import { type TreeNode } from "@/lib/explorer-utils";
import { cn } from "@/lib/utils";

export type { TreeNode };

function iconFor(className: string) {
  if (className.includes("Script")) return FileCode;
  if (className === "Folder" || className.endsWith("Service") || className.endsWith("Storage"))
    return Folder;
  return Box;
}

function TreeItem({
  node,
  depth,
  path,
  onSelect,
  changed,
}: {
  node: TreeNode;
  depth: number;
  path: string;
  onSelect?: ((path: string, node: TreeNode) => void) | undefined;
  changed?: Set<string> | undefined;
}) {
  const [open, setOpen] = useState(depth < 1);
  const Icon = iconFor(node.className);
  const hasChildren = Boolean(node.children?.length);
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const isNew = changed?.has(fullPath) ?? false;

  return (
    <div className="animate-fade-up">
      <div
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors hover:bg-surface-2",
          isNew && "animate-flash",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn("grid size-4 place-items-center", !hasChildren && "invisible")}
          aria-label={open ? "Collapse" : "Expand"}
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => onSelect?.(fullPath, node)}
          className="min-w-0 flex-1 truncate text-left hover:text-primary"
        >
          {node.name}
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">{node.className}</span>
          {isNew ? <span className="ml-2 text-[10px] font-medium text-primary">new</span> : null}
        </button>
      </div>
      {open && hasChildren
        ? node.children!.map((child, index) => (
            <TreeItem
              key={`${child.name}-${index}`}
              node={child}
              depth={depth + 1}
              path={fullPath}
              onSelect={onSelect}
              changed={changed}
            />
          ))
        : null}
    </div>
  );
}

export function ExplorerTree({
  tree,
  onSelect,
  changed,
}: {
  tree: { children?: TreeNode[] } | null;
  onSelect?: ((path: string, node: TreeNode) => void) | undefined;
  changed?: Set<string> | undefined;
}) {
  if (!tree?.children?.length) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No Explorer snapshot yet. Connect the plugin and the hierarchy will appear automatically.
      </p>
    );
  }

  return (
    <div className="scroll-slim overflow-auto p-2">
      {tree.children.map((node, index) => (
        <TreeItem
          key={`${node.name}-${index}`}
          node={node}
          depth={0}
          path=""
          onSelect={onSelect}
          changed={changed}
        />
      ))}
    </div>
  );
}

