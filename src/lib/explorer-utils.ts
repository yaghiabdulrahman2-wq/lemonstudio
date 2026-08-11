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
