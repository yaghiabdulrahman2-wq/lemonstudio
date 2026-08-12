export type TreeNode = {
  name: string;
  className: string;
  children?: TreeNode[];
  lines?: number;
};

/** Flattens the tree into script paths for @mention autocomplete. */
export function collectScripts(
  tree: { children?: TreeNode[] } | null,
): { path: string; name: string; className: string; lines?: number | undefined }[] {
  const out: { path: string; name: string; className: string; lines?: number | undefined }[] = [];
  const walk = (nodes: TreeNode[] | undefined, prefix: string) => {
    for (const node of nodes ?? []) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      if (node.className.includes("Script")) {
        out.push({ path, name: node.name, className: node.className, lines: node.lines });
      }
      walk(node.children, path);
    }
  };
  walk(tree?.children, "");
  return out;
}

/** Flattens every node into "Parent/Child" paths so two snapshots can be diffed. */
export function collectPaths(tree: { children?: TreeNode[] } | null): Set<string> {
  const out = new Set<string>();
  const walk = (nodes: TreeNode[] | undefined, prefix: string) => {
    for (const node of nodes ?? []) {
      const path = prefix ? `${prefix}/${node.name}` : node.name;
      out.add(path);
      walk(node.children, path);
    }
  };
  walk(tree?.children, "");
  return out;
}

export type TreeDiff = { added: Set<string>; removedCount: number };

/** Diffs two Explorer snapshots so the UI can highlight what just changed. */
export function diffTrees(
  previous: { children?: TreeNode[] } | null,
  next: { children?: TreeNode[] } | null,
): TreeDiff {
  const before = collectPaths(previous);
  const after = collectPaths(next);
  const added = new Set<string>();
  for (const path of after) if (!before.has(path)) added.add(path);
  let removedCount = 0;
  for (const path of before) if (!after.has(path)) removedCount += 1;
  return { added, removedCount };
}
