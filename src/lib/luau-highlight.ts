export type Token = { text: string; type: "keyword" | "string" | "number" | "comment" | "plain" };

const KEYWORDS = new Set([
  "and","break","do","else","elseif","end","false","for","function","if","in","local","nil","not",
  "or","repeat","return","then","true","until","while","continue","export","type",
]);

const GLOBALS = new Set([
  "game","workspace","script","self","task","math","table","string","os","print","warn","error",
  "pcall","xpcall","typeof","type","ipairs","pairs","tostring","tonumber","require","Instance",
  "Vector3","CFrame","Color3","UDim2","UDim","Enum","BrickColor","assert","select","next","unpack",
]);

const PATTERN =
  /(--\[\[[\s\S]*?\]\]|--[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[\[[\s\S]*?\]\])|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)/g;

/** Minimal Luau tokenizer used for lightweight syntax highlighting. */
export function tokenizeLuau(code: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  PATTERN.lastIndex = 0;

  let match = PATTERN.exec(code);
  while (match !== null) {
    if (match.index > cursor) {
      tokens.push({ text: code.slice(cursor, match.index), type: "plain" });
    }
    const value = match[0];
    if (match[1]) tokens.push({ text: value, type: "comment" });
    else if (match[2]) tokens.push({ text: value, type: "string" });
    else if (match[3]) tokens.push({ text: value, type: "number" });
    else if (KEYWORDS.has(value)) tokens.push({ text: value, type: "keyword" });
    else if (GLOBALS.has(value)) tokens.push({ text: value, type: "number" });
    else tokens.push({ text: value, type: "plain" });

    cursor = match.index + value.length;
    match = PATTERN.exec(code);
  }

  if (cursor < code.length) tokens.push({ text: code.slice(cursor), type: "plain" });
  return tokens;
}
