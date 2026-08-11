export type ScriptBlock = {
  kind: "script";
  id: string;
  language: string;
  code: string;
  parentPath: string;
  name: string;
  className: "Script" | "LocalScript" | "ModuleScript";
  applyable: boolean;
};

export type BuildBlock = {
  kind: "build";
  id: string;
  code: string;
  parentPath: string;
  name: string;
  tree: unknown[];
  valid: boolean;
};

export type TerrainBlock = {
  kind: "terrain";
  id: string;
  code: string;
  regions: unknown[];
  valid: boolean;
};

export type TextSegment = { kind: "text"; id: string; text: string };

export type Segment = TextSegment | ScriptBlock | BuildBlock | TerrainBlock;

function parseMeta(info: string): { lang: string; meta: Record<string, string> } {
  const parts = info.trim().split(/\s+/).filter(Boolean);
  const lang = (parts.shift() ?? "").toLowerCase();
  const meta: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      meta[part.slice(0, eq)] = part.slice(eq + 1).replace(/^["']|["']$/g, "");
    }
  }
  return { lang, meta };
}

function safeJson(code: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(code);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Splits an assistant message into prose and applyable Studio blocks. */
export function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  let index = 0;

  const fence = /```([^\n]*)\n([\s\S]*?)(?:```|$)/g;
  let match = fence.exec(content);
  while (match !== null) {
    if (match.index > cursor) {
      const text = content.slice(cursor, match.index);
      if (text.trim()) segments.push({ kind: "text", id: `t${index++}`, text });
    }

    const { lang, meta } = parseMeta(match[1] ?? "");
    const code = (match[2] ?? "").replace(/\n$/, "");
    const id = `b${index++}`;

    if (lang === "lemonade-build") {
      const parsed = safeJson(code);
      const rawTree = parsed?.["tree"] ?? parsed?.["nodes"] ?? null;
      const tree = Array.isArray(rawTree) ? rawTree : rawTree ? [rawTree] : [];
      segments.push({
        kind: "build",
        id,
        code,
        parentPath: meta["parent"] ?? "Workspace",
        name: meta["name"] ?? "Build",
        tree,
        valid: tree.length > 0,
      });
    } else if (lang === "lemonade-terrain") {
      const parsed = safeJson(code);
      const regions = Array.isArray(parsed?.["regions"]) ? (parsed["regions"] as unknown[]) : [];
      segments.push({ kind: "terrain", id, code, regions, valid: regions.length > 0 });
    } else {
      const className = meta["class"];
      const validClass =
        className === "Script" || className === "LocalScript" || className === "ModuleScript";
      segments.push({
        kind: "script",
        id,
        language: lang || "luau",
        code,
        parentPath: meta["path"] ?? "ServerScriptService",
        name: meta["name"] ?? "LemonadeScript",
        className: validClass ? className : "Script",
        applyable:
          (lang === "luau" || lang === "lua") && Boolean(meta["path"] ?? meta["name"] ?? className),
      });
    }

    cursor = match.index + match[0].length;
    match = fence.exec(content);
  }

  if (cursor < content.length) {
    const text = content.slice(cursor);
    if (text.trim()) segments.push({ kind: "text", id: `t${index++}`, text });
  }

  return segments;
}
